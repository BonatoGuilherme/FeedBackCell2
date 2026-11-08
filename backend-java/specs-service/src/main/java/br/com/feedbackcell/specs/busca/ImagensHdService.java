package br.com.feedbackcell.specs.busca;

import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.FotoHd;
import br.com.feedbackcell.specs.http.ClienteHttp;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.enterprise.context.ApplicationScoped;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Pattern;
import org.jboss.logging.Logger;

/**
 * Fotos em alta resolução via Wikipedia/Wikimedia Commons (grátis, sem chave). Porta de
 * imagensHdService.js: 1º a imagem principal do artigo, 2º busca de arquivos no Commons,
 * sempre validando que a foto é do modelo certo. Nunca lança exceção.
 */
@ApplicationScoped
public class ImagensHdService {

    private static final Logger LOG = Logger.getLogger(ImagensHdService.class);

    static final String WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
    static final String COMMONS_API = "https://commons.wikimedia.org/w/api.php";
    static final String USER_AGENT = "FeedBackCELL/1.0 (catalogo de celulares)";
    private static final Duration TIMEOUT = Duration.ofMillis(6000);
    private static final String LARGURA = "960";
    private static final int LARGURA_MINIMA = 600;

    public static final Pattern HOST_IMAGEM = Pattern.compile("^https://(upload|thumb)\\.wikimedia\\.org/wikipedia/commons/");
    public static final Pattern HOST_CREDITO = Pattern.compile("^https://commons\\.wikimedia\\.org/wiki/");
    private static final Pattern FRENTE = Pattern.compile("(?i)\\bfront\\b|frente");
    private static final Pattern EXTENSAO = Pattern.compile("(?i)\\.[a-z0-9]+$");

    private final ClienteHttp http;

    public ImagensHdService(ClienteHttp http) {
        this.http = http;
    }

    private JsonNode consultar(String api, Map<String, String> params) throws ClienteHttp.ErroHttp {
        Map<String, String> todos = new LinkedHashMap<>();
        todos.put("action", "query");
        todos.put("format", "json");
        todos.put("formatversion", "2");
        todos.putAll(params);
        return http.buscarJson(api + "?" + query(todos), Map.of("User-Agent", USER_AGENT), TIMEOUT);
    }

    /** URLSearchParams.toString(): espaço vira "+". */
    static String query(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        params.forEach((k, v) -> {
            if (!sb.isEmpty()) sb.append('&');
            sb.append(URLEncoder.encode(k, StandardCharsets.UTF_8)).append('=')
                    .append(URLEncoder.encode(v, StandardCharsets.UTF_8));
        });
        return sb.toString();
    }

    private static String semQuery(JsonNode url) {
        return url != null && url.isTextual() ? url.textValue().split("\\?", -1)[0] : null;
    }

    private static String texto(JsonNode n) {
        return n != null && n.isTextual() ? n.textValue() : null;
    }

    private static FotoHd foto(String imagemHd, JsonNode info) {
        JsonNode meta = info.path("extmetadata");
        String autor = Textos.semHtml(texto(meta.path("Artist").path("value")), 80);
        String licenca = Textos.semHtml(texto(meta.path("LicenseShortName").path("value")), 40);
        List<String> partes = new ArrayList<>(List.of("Foto:"));
        if (autor != null) partes.add(autor);
        if (licenca != null) partes.add("· " + licenca);
        partes.add("· Wikimedia Commons");
        String descricao = texto(info.get("descriptionurl"));
        String url = descricao != null && HOST_CREDITO.matcher(descricao).find() ? descricao : null;
        return new FotoHd(imagemHd, String.join(" ", partes), url);
    }

    /** Títulos de artigo a tentar, do mais específico ("Samsung Galaxy S24") para o mais genérico. */
    public static List<String> titulosPara(String fabricante, String nome) {
        if (nome == null || nome.isEmpty()) return List.of();
        LinkedHashSet<String> t = new LinkedHashSet<>();
        if (fabricante != null && !fabricante.isEmpty()
                && !nome.toLowerCase(Locale.ROOT).startsWith(fabricante.toLowerCase(Locale.ROOT))) {
            t.add(fabricante + " " + nome);
        }
        t.add(nome);
        return List.copyOf(t);
    }

    /** 1º: imagem principal do artigo da Wikipedia (todos os aparelhos numa chamada só). */
    private Map<String, String> porArtigo(List<Aparelho> pedidos) throws ClienteHttp.ErroHttp {
        Map<String, String> escolhas = new LinkedHashMap<>();
        LinkedHashSet<String> titulos = new LinkedHashSet<>();
        pedidos.forEach(p -> titulos.addAll(titulosPara(p.fabricante(), p.nome())));
        List<String> lista = titulos.stream().limit(50).toList();
        if (lista.isEmpty()) return escolhas;

        JsonNode q = consultar(WIKIPEDIA_API, Map.of("titles", String.join("|", lista), "redirects", "1",
                "prop", "pageimages", "piprop", "name")).path("query");
        Map<String, String> destino = new HashMap<>();
        for (String campo : List.of("normalized", "redirects")) {
            for (JsonNode r : q.path(campo)) {
                if (texto(r.get("from")) != null) destino.put(texto(r.get("from")), texto(r.get("to")));
            }
        }
        Map<String, JsonNode> paginas = new HashMap<>();
        for (JsonNode p : q.path("pages")) {
            if (texto(p.get("title")) != null) paginas.put(texto(p.get("title")), p);
        }
        for (Aparelho pedido : pedidos) {
            for (String titulo : titulosPara(pedido.fabricante(), pedido.nome())) {
                String atual = titulo;
                for (int i = 0; i < 3 && destino.containsKey(atual); i++) atual = destino.get(atual);
                JsonNode pagina = paginas.get(atual);
                String imagem = pagina == null ? null : texto(pagina.get("pageimage"));
                // o artigo precisa ser do modelo certo ("Galaxy S24 Ultra" não aceita o artigo do S24)
                if (imagem == null || imagem.isEmpty()
                        || CorrespondenciaNome.pontuar(pedido.nome(), texto(pagina.get("title"))) == null) {
                    continue;
                }
                escolhas.put(pedido.chave(), imagem);
                break;
            }
        }
        return escolhas;
    }

    /** Miniatura em ~960 px e crédito de vários arquivos do Commons numa chamada só. */
    private Map<String, FotoHd> detalhesArquivos(List<String> arquivos) throws ClienteHttp.ErroHttp {
        Map<String, FotoHd> detalhes = new HashMap<>();
        if (arquivos.isEmpty()) return detalhes;
        JsonNode q = consultar(WIKIPEDIA_API, Map.of(
                "titles", String.join("|", arquivos.stream().map(a -> "File:" + a).toList()),
                "prop", "imageinfo", "iiprop", "url|size|extmetadata", "iiurlwidth", LARGURA,
                "iiextmetadatafilter", "Artist|LicenseShortName")).path("query");
        Map<String, String> original = new HashMap<>();
        for (JsonNode n : q.path("normalized")) original.put(texto(n.get("to")), texto(n.get("from")));
        for (JsonNode pagina : q.path("pages")) {
            JsonNode info = pagina.path("imageinfo").path(0);
            String titulo = texto(pagina.get("title"));
            if (titulo == null) continue;
            String arquivo = original.getOrDefault(titulo, titulo).replaceFirst("^File:", "").replace(' ', '_');
            String imagemHd = semQuery(info.get("thumburl"));
            if (imagemHd == null || imagemHd.isEmpty() || !HOST_IMAGEM.matcher(imagemHd).find()) continue;
            detalhes.put(arquivo, foto(imagemHd, info));
        }
        return detalhes;
    }

    /** 2º: busca de arquivos no Commons; o nome do arquivo precisa ser do modelo certo. */
    private FotoHd porBuscaNoCommons(Aparelho pedido) throws ClienteHttp.ErroHttp {
        JsonNode q = consultar(COMMONS_API, Map.of("generator", "search", "gsrnamespace", "6", "gsrlimit", "12",
                "gsrsearch", titulosPara(pedido.fabricante(), pedido.nome()).get(0) + " filetype:bitmap",
                "prop", "imageinfo", "iiprop", "url|size|extmetadata", "iiurlwidth", LARGURA,
                "iiextmetadatafilter", "Artist|LicenseShortName")).path("query");
        FotoHd melhor = null;
        double melhorNota = Double.NEGATIVE_INFINITY;
        for (JsonNode pagina : q.path("pages")) {
            JsonNode info = pagina.path("imageinfo").path(0);
            String imagemHd = semQuery(info.get("thumburl"));
            if (imagemHd == null || imagemHd.isEmpty() || !HOST_IMAGEM.matcher(imagemHd).find()
                    || info.path("width").asDouble(0) < LARGURA_MINIMA) {
                continue;
            }
            String titulo = texto(pagina.get("title"));
            if (titulo == null) continue;
            String nomeArquivo = EXTENSAO.matcher(titulo.replaceFirst("^File:", "")).replaceFirst("");
            Double nota = CorrespondenciaNome.pontuar(pedido.nome(), nomeArquivo);
            if (nota == null) continue;
            // preferimos retrato (o celular em pé) e fotos da frente do aparelho
            double bonus = (info.path("height").asDouble(0) > info.path("width").asDouble(0) ? 1 : 0)
                    + (FRENTE.matcher(nomeArquivo).find() ? 1 : 0);
            if (nota + bonus > melhorNota) {
                melhor = foto(imagemHd, info);
                melhorNota = nota + bonus;
            }
        }
        return melhor;
    }

    /** Mapa "fabricante|nome" -> foto, só para os aparelhos que tiverem foto do modelo certo. */
    public Map<String, FotoHd> buscar(List<Aparelho> aparelhos) {
        Map<String, Aparelho> unicos = new LinkedHashMap<>();
        for (Aparelho a : aparelhos) {
            if (a != null && a.nome() != null && !a.nome().isEmpty()) unicos.putIfAbsent(a.chave(), a);
        }
        Map<String, FotoHd> resultado = new HashMap<>();
        if (unicos.isEmpty()) return resultado;
        List<Aparelho> pedidos = List.copyOf(unicos.values());

        try {
            Map<String, String> artigos = porArtigo(pedidos);
            Map<String, FotoHd> detalhes = detalhesArquivos(List.copyOf(new LinkedHashSet<>(artigos.values())));
            artigos.forEach((chave, arquivo) -> {
                if (detalhes.containsKey(arquivo)) resultado.put(chave, detalhes.get(arquivo));
            });
        } catch (ClienteHttp.ErroHttp | RuntimeException e) {
            LOG.errorf("Wikipedia (imagens HD) falhou: %s", e.getMessage());
        }

        List<Aparelho> faltando = pedidos.stream().filter(p -> !resultado.containsKey(p.chave())).toList();
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<FotoHd>> futuros = faltando.stream().map(p -> pool.submit(() -> {
                try {
                    return porBuscaNoCommons(p);
                } catch (ClienteHttp.ErroHttp | RuntimeException e) {
                    LOG.errorf("Commons (imagens HD) falhou: %s", e.getMessage());
                    return null;
                }
            })).toList();
            for (int i = 0; i < faltando.size(); i++) {
                FotoHd f = futuros.get(i).get();
                if (f != null) resultado.put(faltando.get(i).chave(), f);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (java.util.concurrent.ExecutionException e) {
            LOG.errorf("Commons (imagens HD) falhou: %s", e.getMessage());
        }
        return resultado;
    }
}
