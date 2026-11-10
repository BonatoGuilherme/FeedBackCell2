package br.com.feedbackcell.specs.busca;

import br.com.feedbackcell.specs.busca.CorrespondenciaNome.Opcoes;
import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.FotoHd;
import br.com.feedbackcell.specs.busca.Modelos.Modelo3d;
import br.com.feedbackcell.specs.busca.Modelos.Resultado;
import br.com.feedbackcell.specs.http.ClienteHttp;
import com.fasterxml.jackson.databind.JsonNode;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.LongSupplier;
import java.util.regex.Pattern;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Porta de especificacoesService.js. Especificações + miniatura: MobileAPI.dev (MOBILEAPI_KEY,
 * cota mensal baixa). Modelo 3D: busca pública do Sketchfab. Foto HD: Wikimedia.
 * Cache em memória de 24 h / 200 itens para não gastar a cota com buscas repetidas.
 *
 * <p>Orçamento de tempo (o proxy do core-api espera 30 s): MobileAPI e Sketchfab em paralelo
 * ({@link #TIMEOUT}) e depois até 3 chamadas em sequência à Wikimedia ({@link ImagensHdService#TIMEOUT}).
 */
@ApplicationScoped
public class EspecificacoesService {

    private static final Logger LOG = Logger.getLogger(EspecificacoesService.class);

    static final String MOBILEAPI_URL = "https://api.mobileapi.dev/devices/search/";
    static final String MOBILEAPI_DEVICES = "https://api.mobileapi.dev/devices/";
    static final String SKETCHFAB_URL = "https://api.sketchfab.com/v3/search";
    static final Duration TIMEOUT = Duration.ofMillis(8000);
    /** Câmeras rodam em paralelo com a foto HD, então não aumentam o pior caso. */
    static final Duration TIMEOUT_CAMERAS = Duration.ofMillis(5000);
    /**
     * Limite das duas chamadas de câmera somadas (correm em paralelo com a foto HD). No plano Free
     * a MobileAPI pede ~12 s entre requisições, então na busca interativa o 429 cai na câmera da
     * busca; um reprocessamento em lote pode subir o prazo (MOBILEAPI_PRAZO_CAMERAS=40s).
     */
    @ConfigProperty(name = "mobileapi.prazo-cameras", defaultValue = "12s")
    Duration prazoCameras = Duration.ofSeconds(12);
    /** Espera depois de um 429 da MobileAPI sem "retry_after" no corpo; os testes zeram. */
    Duration espera429 = Duration.ofMillis(2000);
    static final long CACHE_TTL_MS = 24L * 60 * 60 * 1000;
    static final int CACHE_MAX = 200;
    private static final int MAX_SUGESTOES = 8;
    private static final Pattern UID = Pattern.compile("^[0-9a-f]{32}$");

    /** {@code falhou}: a fonte não respondeu; {@code temporaria}: vale tentar de novo (rede, timeout, 5xx). */
    private record Busca(Aparelho aparelho, List<Aparelho> sugestoes, String aviso, boolean falhou, boolean temporaria) {
    }

    private record Busca3d(Modelo3d modelo3d, String aviso, boolean falhou, boolean temporaria) {
    }

    private record ItemCache(Resultado valor, long expiraEm) {
    }

    private final ClienteHttp http;
    private final ImagensHdService imagensHd;
    private final Optional<String> chaveMobileApi;
    /** Busca main-camera/selfie-camera do aparelho escolhido (2 créditos a mais da cota por busca). */
    private final boolean camerasDetalhadas;
    /** Limitado a {@link #CACHE_MAX} itens: ao passar disso sai o gravado há mais tempo. */
    private final LinkedHashMap<String, ItemCache> cache = new LinkedHashMap<>() {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, ItemCache> maisAntigo) {
            return size() > CACHE_MAX;
        }
    };
    private final ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
    /** Relógio do TTL do cache; os testes trocam. */
    LongSupplier relogio = System::currentTimeMillis;

    @Inject
    public EspecificacoesService(ClienteHttp http, ImagensHdService imagensHd,
                                 @ConfigProperty(name = "mobileapi.key") Optional<String> chaveMobileApi,
                                 @ConfigProperty(name = "mobileapi.cameras-detalhadas", defaultValue = "true")
                                 boolean camerasDetalhadas) {
        this.http = http;
        this.imagensHd = imagensHd;
        this.chaveMobileApi = chaveMobileApi.filter(c -> !c.isBlank());
        this.camerasDetalhadas = camerasDetalhadas;
    }

    public EspecificacoesService(ClienteHttp http, ImagensHdService imagensHd, Optional<String> chaveMobileApi) {
        this(http, imagensHd, chaveMobileApi, true);
    }

    void avisarSemChave(@Observes StartupEvent inicio) {
        if (chaveMobileApi.isEmpty()) {
            LOG.warn("MOBILEAPI_KEY não configurada: as buscas seguem sem especificações, só com modelo 3D e foto HD.");
        }
    }

    private synchronized Resultado lerCache(String chave) {
        ItemCache item = cache.get(chave);
        if (item == null) return null;
        if (relogio.getAsLong() > item.expiraEm()) {
            cache.remove(chave);
            return null;
        }
        return item.valor();
    }

    private synchronized void gravarCache(String chave, Resultado valor) {
        long agora = relogio.getAsLong();
        cache.values().removeIf(item -> agora > item.expiraEm());
        cache.remove(chave); // regravar conta como o mais novo
        cache.put(chave, new ItemCache(valor, agora + CACHE_TTL_MS));
    }

    public synchronized void limparCache() {
        cache.clear();
    }

    synchronized int tamanhoCache() {
        return cache.size();
    }

    /**
     * Com {@code somente3d} não consulta a MobileAPI (sem gastar cota): usado quando a pessoa
     * escolhe outra sugestão e só falta o modelo 3D dela.
     */
    public Resultado buscar(String marca, String modelo, boolean somente3d) {
        String chave = ((somente3d ? "3d" : "full") + "|" + marca + "|" + modelo).toLowerCase(Locale.ROOT);
        Resultado emCache = lerCache(chave);
        if (emCache != null) return emCache;

        CompletableFuture<Busca> spec = somente3d
                ? CompletableFuture.completedFuture(new Busca(null, List.of(), null, false, false))
                : CompletableFuture.supplyAsync(() -> buscarAparelho(marca, modelo), pool);
        CompletableFuture<Busca3d> modelo3d = CompletableFuture.supplyAsync(() -> buscarModelo3d(marca, modelo), pool);
        Busca s = spec.join();
        Busca3d m = modelo3d.join();

        Aparelho aparelho = s.aparelho();
        // Sem nada da MobileAPI (cota, sem chave ou modelo desconhecido), ainda tenta a foto HD do modelo digitado.
        if (!somente3d && aparelho == null && s.sugestoes().isEmpty()) aparelho = aparelhoSoComFoto(marca, modelo);

        List<String> avisos = new ArrayList<>();
        if (s.aviso() != null) avisos.add(s.aviso());
        if (m.aviso() != null) avisos.add(m.aviso());
        Resultado resultado = new Resultado((marca + " " + modelo).strip(), aparelho, s.sugestoes(), m.modelo3d(),
                List.copyOf(avisos), s.temporaria(), m.temporaria());

        // Só guarda quando as duas fontes responderam, para não fixar uma falha temporária.
        if (!s.falhou() && !m.falhou()) gravarCache(chave, resultado);
        return resultado;
    }

    private static String nome(JsonNode item) {
        JsonNode n = item.get("name");
        return n == null || n.isNull() ? "" : n.asText();
    }

    private Busca buscarAparelho(String marca, String modelo) {
        if (chaveMobileApi.isEmpty()) {
            return new Busca(null, List.of(), "Especificações indisponíveis: MOBILEAPI_KEY não configurada.", false, false);
        }
        // limit=50 custa a mesma consulta da cota e dá mais chance de o aparelho certo vir.
        Map<String, String> params = new LinkedHashMap<>();
        params.put("name", modelo);
        params.put("limit", "50");
        if (!marca.isEmpty()) params.put("manufacturer", marca);
        Map<String, String> auth = Map.of("Authorization", "Token " + chaveMobileApi.get());
        try {
            JsonNode dados = http.buscarJson(MOBILEAPI_URL + "?" + ImagensHdService.query(params), auth, TIMEOUT);
            List<JsonNode> lista = new ArrayList<>();
            for (JsonNode d : dados.path("devices")) {
                if (d.isObject()) lista.add(d);
            }
            // A API devolve qualquer aparelho da marca com 99%; escolhemos pelo nome.
            JsonNode d = CorrespondenciaNome.melhorCandidato(modelo, lista, EspecificacoesService::nome, Opcoes.PADRAO);
            // Sugestões do autocomplete: variantes próximas e última palavra incompleta.
            List<Aparelho> sugestoes = CorrespondenciaNome.rankear(modelo, lista, EspecificacoesService::nome,
                    new Opcoes(true, true), MAX_SUGESTOES).stream().map(EspecificacoesService::normalizar).toList();
            // Câmeras do aparelho escolhido, em paralelo com a foto HD.
            String id = d == null ? null : idDispositivo(d);
            CompletableFuture<JsonNode[]> cameras = buscarCameras(id, auth);
            Aparelho aparelho = d == null ? null : normalizar(d);

            List<Aparelho> todos = new ArrayList<>();
            if (aparelho != null) todos.add(aparelho);
            todos.addAll(sugestoes);
            Map<String, FotoHd> fotos = imagensHd.buscar(todos);
            if (aparelho != null) {
                JsonNode[] cam = cameras.join();
                aparelho = normalizar(d, cam[0], cam[1]);
            }
            sugestoes = sugestoes.stream().map(a -> a.comFoto(fotos.get(a.chave()))).toList();
            if (aparelho == null) {
                return new Busca(null, sugestoes,
                        sugestoes.isEmpty() ? "Não encontramos especificações para esse modelo." : null, false, false);
            }
            return new Busca(aparelho.comFoto(fotos.get(aparelho.chave())), sugestoes, null, false, false);
        } catch (ClienteHttp.ErroHttp e) {
            LOG.errorf("MobileAPI falhou: %s", e.getMessage());
            String aviso = e.status() == 429
                    ? "Limite de consultas de especificações atingido. Tente mais tarde."
                    : "Não foi possível consultar as especificações agora.";
            return new Busca(null, List.of(), aviso, true, temporaria(e));
        }
    }

    /** id numérico do aparelho na MobileAPI (para os endpoints de câmera), ou null. */
    static String idDispositivo(JsonNode d) {
        JsonNode id = d.get("id");
        if (id == null || !id.isValueNode()) return null;
        String t = id.asText("");
        return t.matches("\\d{1,12}") ? t : null;
    }

    /**
     * [main-camera, selfie-camera] do aparelho (cada uma pode ser null), em paralelo com a foto HD.
     * O plano Free da MobileAPI aceita ~1 requisição a cada 1,5 s e responde 429 na hora: as duas
     * vão em sequência, e um 429 espera o "retry_after" pedido e tenta de novo (até 2 vezes), dentro de
     * {@link #prazoCameras}.
     */
    private CompletableFuture<JsonNode[]> buscarCameras(String id, Map<String, String> auth) {
        if (id == null || !camerasDetalhadas) return CompletableFuture.completedFuture(new JsonNode[2]);
        return CompletableFuture.supplyAsync(() -> {
            long prazo = System.nanoTime() + prazoCameras.toNanos();
            JsonNode principal = buscarCamera(id, "main-camera", auth, prazo);
            JsonNode frontal = buscarCamera(id, "selfie-camera", auth, prazo);
            return new JsonNode[] {principal, frontal};
        }, pool);
    }

    /** Resposta de /devices/{id}/{tipo}/ ou null (prazo esgotado, 404 ou falha: fica a câmera da busca). */
    private JsonNode buscarCamera(String id, String tipo, Map<String, String> auth, long prazo) {
        for (int tentativa = 0; System.nanoTime() < prazo; tentativa++) {
            try {
                return http.buscarJson(MOBILEAPI_DEVICES + id + "/" + tipo + "/", auth, TIMEOUT_CAMERAS);
            } catch (ClienteHttp.ErroHttp e) {
                if (e.status() == 429 && tentativa < 2 && esperar(espera(e), prazo)) continue;
                if (e.status() != 404) {
                    LOG.warnf("MobileAPI %s falhou: %s%s", tipo, e.getMessage(),
                            e.esperar() == null ? "" : " (pediu " + e.esperar().toMillis() + " ms)");
                }
                return null;
            }
        }
        return null;
    }

    /** O "retry_after" que a API mandou (com folga de 250 ms) ou {@link #espera429}. */
    private Duration espera(ClienteHttp.ErroHttp e) {
        return e.esperar() == null ? espera429 : e.esperar().plusMillis(250);
    }

    /** Dorme {@code espera} se ainda couber no prazo; false se não couber ou for interrompido. */
    private static boolean esperar(Duration espera, long prazo) {
        if (System.nanoTime() + espera.toNanos() >= prazo) return false;
        try {
            Thread.sleep(espera);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** Aparelho só com nome e foto HD (sem especificações), ou null se não houver foto. */
    private Aparelho aparelhoSoComFoto(String marca, String modelo) {
        Aparelho a = new Aparelho(Textos.texto(modelo, 120), marca.isEmpty() ? null : Textos.texto(marca, 80),
                null, null, null, null, null, null, null, null, null, null, null, null, null);
        Aparelho comFoto = a.comFoto(imagensHd.buscar(List.of(a)).get(a.chave()));
        return comFoto.imagemHd() != null ? comFoto : null;
    }

    static Aparelho normalizar(JsonNode d) {
        return normalizar(d, null, null);
    }

    /** Textos da MobileAPI em pt-BR; {@code principal}/{@code frontal}: respostas dos endpoints de câmera. */
    static Aparelho normalizar(JsonNode d, JsonNode principal, JsonNode frontal) {
        return new Aparelho(
                Textos.texto(d.get("name"), 120),
                Textos.texto(d.get("manufacturer_name"), 80),
                Textos.imagemDataUri(d.get("image_b64")),
                Textos.texto(NormalizacaoSpecs.lancamento(Textos.texto(d.get("release_date"), 120)), 60),
                Textos.texto(NormalizacaoSpecs.tela(Textos.texto(d.get("screen_resolution"), 300)), 300),
                Textos.texto(NormalizacaoSpecs.hardware(Textos.texto(d.get("hardware"), 300)), 300),
                Textos.texto(NormalizacaoSpecs.armazenamento(Textos.limparSpec(Textos.texto(d.get("storage"), 300))), 300),
                Cameras.montar(Textos.texto(d.get("camera"), 300), principal, frontal),
                Textos.texto(NormalizacaoSpecs.bateria(Textos.texto(d.get("battery_capacity"), 300)), 300),
                Textos.texto(NormalizacaoSpecs.peso(Textos.texto(d.get("weight"), 60)), 60),
                Textos.texto(NormalizacaoSpecs.espessura(Textos.texto(d.get("thickness"), 60)), 60),
                Textos.texto(d.get("colors"), 300),
                null, null, null);
    }

    static String escolherThumbnail(JsonNode thumbnails) {
        List<JsonNode> validas = new ArrayList<>();
        for (JsonNode img : thumbnails.path("images")) {
            JsonNode url = img.get("url");
            JsonNode largura = img.get("width");
            if (url != null && url.isTextual() && url.textValue().startsWith("https://")
                    && largura != null && largura.isNumber() && Double.isFinite(largura.asDouble())) {
                validas.add(img);
            }
        }
        validas.sort(Comparator.comparingDouble(img -> Math.abs(img.get("width").asDouble() - 640)));
        return validas.isEmpty() ? null : validas.get(0).get("url").textValue();
    }

    private Busca3d buscarModelo3d(String marca, String modelo) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("type", "models");
        params.put("q", (marca + " " + modelo).strip());
        params.put("count", "24");
        try {
            JsonNode dados = http.buscarJson(SKETCHFAB_URL + "?" + ImagensHdService.query(params), Map.of(), TIMEOUT);
            List<JsonNode> lista = new ArrayList<>();
            for (JsonNode m : dados.path("results")) {
                JsonNode uid = m.get("uid");
                if (m.isObject() && uid != null && uid.isTextual() && UID.matcher(uid.textValue()).matches()) lista.add(m);
            }
            // Para o 3D aceitamos variante próxima ("S24 Ultra" para "S24") se não houver a exata.
            JsonNode m = CorrespondenciaNome.melhorCandidato(modelo, lista, EspecificacoesService::nome, new Opcoes(true, false));
            if (m == null) return new Busca3d(null, null, false, false);
            String uid = m.get("uid").textValue();
            return new Busca3d(new Modelo3d(
                    Textos.texto(m.get("name"), 120),
                    Textos.texto(m.path("user").get("displayName"), 80),
                    "https://sketchfab.com/models/" + uid + "/embed",
                    "https://sketchfab.com/3d-models/" + uid,
                    escolherThumbnail(m.path("thumbnails"))), null, false, false);
        } catch (ClienteHttp.ErroHttp e) {
            LOG.errorf("Sketchfab falhou: %s", e.getMessage());
            return new Busca3d(null, "Não foi possível buscar o modelo 3D agora.", true, temporaria(e));
        }
    }

    /** Rede, timeout ou 5xx. 429 (cota) e 4xx (ex.: chave inválida) não melhoram tentando de novo. */
    static boolean temporaria(ClienteHttp.ErroHttp e) {
        return e.status() == 0 || e.status() >= 500;
    }
}
