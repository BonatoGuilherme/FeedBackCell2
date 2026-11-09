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
import java.util.Set;
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
    /** Até 3 chamadas em sequência (artigo, arquivos, Commons): 3 x 5 s cabe no orçamento de 30 s do proxy. */
    static final Duration TIMEOUT = Duration.ofMillis(5000);
    private static final String LARGURA = "960";
    private static final int LARGURA_MINIMA = 600;

    private static final Pattern HOST_IMAGEM = Pattern.compile("^https://(upload|thumb)\\.wikimedia\\.org/wikipedia/commons/");
    private static final Pattern HOST_CREDITO = Pattern.compile("^https://commons\\.wikimedia\\.org/wiki/");
    private static final Pattern FRENTE = Pattern.compile("(?i)\\bfront\\b|frente");
    private static final Pattern EXTENSAO = Pattern.compile("(?i)\\.[a-z0-9]+$");
    /** Metadados pedidos na mesma chamada do imageinfo (crédito + texto para avaliar a foto). */
    private static final String METADADOS = "Artist|LicenseShortName|ImageDescription|ObjectName";
    /** Largura/altura acima disso é foto de grupo, banner ou palco, não um aparelho em pé. */
    static final double PROPORCAO_MAXIMA = 1.3;
    /** Palavras (tokens) de foto com vários aparelhos, evento ou comparação. */
    private static final Pattern GRUPO = Pattern.compile("^(lineups?|family|families|series|unpacked|launch\\w*"
            + "|events?|keynote|presentation|exhibit\\w*|expo|booth|mwc|ces|vs|versus|compar\\w*"
            + "|collection|group|models|phones|smartphones|devices|range)$");
    /** "front and back" é um aparelho só; outro "and" no título indica vários. */
    private static final Pattern FRENTE_E_VERSO = Pattern.compile("(?i)(front|back|rear)[\\s_-]+and[\\s_-]+(front|back|rear)");
    /** Indica foto do próprio aparelho. */
    private static final Pattern APARELHO = Pattern.compile("(?i)(^|[^a-z])(back|rear|smartphone|phone|verso|traseira)([^a-z]|$)");
    private static final Pattern LICENCA_NAO_LIVRE = Pattern.compile("(?i)fair use|non-free|nonfree");
    /** Variantes que, citadas sem terem sido pedidas, indicam outro modelo na foto. */
    private static final Set<String> OUTRAS_VARIANTES = Set.of(
            "pro", "max", "ultra", "plus", "mini", "lite", "fe", "fold", "flip");

    /** Nota de uma foto candidata; {@code adequada} = passou nos critérios de "um aparelho só". */
    record Avaliacao(double nota, boolean adequada) {
    }

    /** Foto candidata já com crédito, e se ela passou nos critérios. */
    record Candidata(FotoHd foto, Avaliacao avaliacao) {
    }

    /** Arquivo do artigo, com o imageinfo para avaliar depois por aparelho. */
    private record Arquivo(FotoHd foto, String nome, JsonNode info) {
    }

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

    /** Diz se o texto (título ou descrição) indica vários aparelhos, evento ou outro modelo. */
    static boolean indicaGrupo(String modelo, String texto, boolean titulo) {
        if (texto == null || texto.isEmpty()) return false;
        List<String> pedidos = CorrespondenciaNome.tokens(modelo);
        List<String> tokens = CorrespondenciaNome.tokens(titulo ? FRENTE_E_VERSO.matcher(texto).replaceAll(" ") : texto);
        for (String t : tokens) {
            if (GRUPO.matcher(t).matches()) return true;
            if (titulo && t.equals("and")) return true;
            if (OUTRAS_VARIANTES.contains(t) && !pedidos.contains(t)) return true;
            // plural do modelo: "S23s", "Pixel 8s"
            if (t.endsWith("s") && pedidos.contains(t.substring(0, t.length() - 1)) && t.matches(".*\\d.*s")) return true;
        }
        return false;
    }

    /**
     * Avalia uma foto para o modelo pedido; null se ela não serve de jeito nenhum (nome de
     * outro modelo, quando {@code exigirNome}, ou licença não livre). Não "adequada" = foto
     * paisagem (proporção > {@link #PROPORCAO_MAXIMA}) ou que indica grupo/evento/outro modelo:
     * só é usada se nenhuma outra passar.
     */
    static Avaliacao avaliar(String modelo, String nomeArquivo, JsonNode info, boolean exigirNome) {
        JsonNode meta = info.path("extmetadata");
        String licenca = texto(meta.path("LicenseShortName").path("value"));
        if (licenca != null && LICENCA_NAO_LIVRE.matcher(licenca).find()) return null;
        Double nome = CorrespondenciaNome.pontuar(modelo, nomeArquivo);
        if (exigirNome && nome == null) return null;

        double largura = info.path("width").asDouble(0);
        double altura = info.path("height").asDouble(0);
        boolean paisagem = largura > 0 && altura > 0 && largura / altura > PROPORCAO_MAXIMA;
        String descricao = Textos.semHtml(texto(meta.path("ImageDescription").path("value")), 1000);
        String objeto = Textos.semHtml(texto(meta.path("ObjectName").path("value")), 300);
        boolean grupo = indicaGrupo(modelo, nomeArquivo, true)
                || indicaGrupo(modelo, objeto, true) || indicaGrupo(modelo, descricao, false);

        double nota = nome == null ? 0 : nome;
        if (altura > largura) nota += 1; // retrato: o celular em pé
        else if (largura > 0 && altura > 0 && largura / altura <= 1.05) nota += 0.5; // quase quadrada
        if (FRENTE.matcher(nomeArquivo).find()) nota += 1;
        else if (APARELHO.matcher(nomeArquivo).find()) nota += 0.5;
        return new Avaliacao(nota, !paisagem && !grupo);
    }

    /**
     * A melhor foto entre as candidatas: as adequadas têm prioridade pela nota; uma não
     * adequada só é usada se nenhuma adequada existir. Empate fica com a primeira.
     */
    static FotoHd escolher(List<Candidata> candidatas) {
        Candidata melhor = null;
        for (Candidata c : candidatas) {
            if (c == null || c.avaliacao() == null) continue;
            if (melhor == null || melhorQue(c.avaliacao(), melhor.avaliacao())) melhor = c;
        }
        return melhor == null ? null : melhor.foto();
    }

    private static boolean melhorQue(Avaliacao a, Avaliacao b) {
        if (a.adequada() != b.adequada()) return a.adequada();
        return a.nota() > b.nota();
    }

    /** "File:Galaxy S23 front.jpg" -> "Galaxy S23 front". */
    private static String nomeDoArquivo(String titulo) {
        return EXTENSAO.matcher(titulo.replaceFirst("^File:", "")).replaceFirst("");
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

    /** Miniatura em ~960 px, crédito e metadados de vários arquivos do Commons numa chamada só. */
    private Map<String, Arquivo> detalhesArquivos(List<String> arquivos) throws ClienteHttp.ErroHttp {
        Map<String, Arquivo> detalhes = new HashMap<>();
        if (arquivos.isEmpty()) return detalhes;
        JsonNode q = consultar(WIKIPEDIA_API, Map.of(
                "titles", String.join("|", arquivos.stream().map(a -> "File:" + a).toList()),
                "prop", "imageinfo", "iiprop", "url|size|extmetadata", "iiurlwidth", LARGURA,
                "iiextmetadatafilter", METADADOS)).path("query");
        Map<String, String> original = new HashMap<>();
        for (JsonNode n : q.path("normalized")) original.put(texto(n.get("to")), texto(n.get("from")));
        for (JsonNode pagina : q.path("pages")) {
            JsonNode info = pagina.path("imageinfo").path(0);
            String titulo = texto(pagina.get("title"));
            if (titulo == null) continue;
            String arquivo = original.getOrDefault(titulo, titulo).replaceFirst("^File:", "").replace(' ', '_');
            String imagemHd = semQuery(info.get("thumburl"));
            if (imagemHd == null || imagemHd.isEmpty() || !HOST_IMAGEM.matcher(imagemHd).find()) continue;
            detalhes.put(arquivo, new Arquivo(foto(imagemHd, info), nomeDoArquivo(titulo), info));
        }
        return detalhes;
    }

    /** 2º: busca de arquivos no Commons; o nome do arquivo precisa ser do modelo certo. */
    private List<Candidata> porBuscaNoCommons(Aparelho pedido) throws ClienteHttp.ErroHttp {
        JsonNode q = consultar(COMMONS_API, Map.of("generator", "search", "gsrnamespace", "6", "gsrlimit", "12",
                "gsrsearch", titulosPara(pedido.fabricante(), pedido.nome()).get(0) + " filetype:bitmap",
                "prop", "imageinfo", "iiprop", "url|size|extmetadata", "iiurlwidth", LARGURA,
                "iiextmetadatafilter", METADADOS)).path("query");
        List<Candidata> candidatas = new ArrayList<>();
        for (JsonNode pagina : q.path("pages")) {
            JsonNode info = pagina.path("imageinfo").path(0);
            String imagemHd = semQuery(info.get("thumburl"));
            String titulo = texto(pagina.get("title"));
            if (imagemHd == null || imagemHd.isEmpty() || !HOST_IMAGEM.matcher(imagemHd).find()
                    || info.path("width").asDouble(0) < LARGURA_MINIMA || titulo == null) {
                continue;
            }
            Avaliacao avaliacao = avaliar(pedido.nome(), nomeDoArquivo(titulo), info, true);
            if (avaliacao != null) candidatas.add(new Candidata(foto(imagemHd, info), avaliacao));
        }
        return candidatas;
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

        // foto do artigo que não é "adequada" (grupo, paisagem) fica de reserva e o Commons é consultado
        Map<String, Candidata> reservas = new HashMap<>();
        try {
            Map<String, String> artigos = porArtigo(pedidos);
            Map<String, Arquivo> detalhes = detalhesArquivos(List.copyOf(new LinkedHashSet<>(artigos.values())));
            artigos.forEach((chave, arquivo) -> {
                Arquivo a = detalhes.get(arquivo);
                if (a == null) return;
                // o artigo já foi validado como do modelo certo: o nome do arquivo não é exigido
                Avaliacao avaliacao = avaliar(unicos.get(chave).nome(), a.nome(), a.info(), false);
                if (avaliacao == null) return;
                if (avaliacao.adequada()) resultado.put(chave, a.foto());
                else reservas.put(chave, new Candidata(a.foto(), avaliacao));
            });
        } catch (ClienteHttp.ErroHttp | RuntimeException e) {
            LOG.errorf("Wikipedia (imagens HD) falhou: %s", e.getMessage());
        }

        List<Aparelho> faltando = pedidos.stream().filter(p -> !resultado.containsKey(p.chave())).toList();
        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<List<Candidata>>> futuros = faltando.stream().map(p -> pool.submit(() -> {
                try {
                    return porBuscaNoCommons(p);
                } catch (ClienteHttp.ErroHttp | RuntimeException e) {
                    LOG.errorf("Commons (imagens HD) falhou: %s", e.getMessage());
                    return List.<Candidata>of();
                }
            })).toList();
            for (int i = 0; i < faltando.size(); i++) {
                String chave = faltando.get(i).chave();
                List<Candidata> candidatas = new ArrayList<>();
                if (reservas.containsKey(chave)) candidatas.add(reservas.get(chave));
                candidatas.addAll(futuros.get(i).get());
                FotoHd f = escolher(candidatas);
                if (f != null) resultado.put(chave, f);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (java.util.concurrent.ExecutionException e) {
            LOG.errorf("Commons (imagens HD) falhou: %s", e.getMessage());
        }
        reservas.forEach((chave, c) -> resultado.putIfAbsent(chave, c.foto()));
        return resultado;
    }
}
