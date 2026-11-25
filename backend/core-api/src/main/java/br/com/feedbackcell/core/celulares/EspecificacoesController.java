package br.com.feedbackcell.core.celulares;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.config.Configuracao;
import br.com.feedbackcell.core.web.ErroApi;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * GET /celulares/especificacoes?marca=&modelo=[&q=][&somente3d=1] (autenticado).
 * Valida a consulta como o Node e repassa ao specs-service, devolvendo o mesmo status e corpo.
 * A busca completa (que gasta crédito da MobileAPI) tem limite por usuário por dia; com
 * {@code somente3d=1} não há consulta à MobileAPI, então não conta nem é barrada.
 *
 * <p>GET /celulares/especificacoes/creditos (autenticado): quantos créditos restam e se o usuário
 * ainda pode buscar hoje, para o aviso do front.
 */
@RestController
public class EspecificacoesController {

    private static final Logger LOG = LoggerFactory.getLogger(EspecificacoesController.class);
    private static final Pattern PERMITIDOS = Pattern.compile("^[\\p{L}\\p{N} ._+()\\-/]*$");
    private static final Pattern ESPACOS = Pattern.compile("(?U)\\s+");
    /** A busca no specs-service pode encadear MobileAPI (8 s) + Wikimedia (6 s) + Sketchfab. */
    private static final Duration TIMEOUT = Duration.ofSeconds(30);
    /** Header do specs-service com quantos créditos da MobileAPI a busca gastou (0 = cache, 3D ou sem cota). */
    static final String HEADER_CREDITOS_GASTOS = "X-Creditos-Gastos";

    private final Autenticacao auth;
    private final Configuracao config;
    private final LimiteBuscaEspecificacoes limite;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    public EspecificacoesController(Autenticacao auth, Configuracao config, LimiteBuscaEspecificacoes limite,
                                    ObjectMapper json) {
        this.auth = auth;
        this.config = config;
        this.limite = limite;
        this.json = json;
    }

    static String limpar(String[] valores) {
        if (valores == null || valores.length != 1) return "";
        return ESPACOS.matcher(valores[0]).replaceAll(" ").strip();
    }

    @GetMapping("/celulares/especificacoes")
    public ResponseEntity<String> buscar(HttpServletRequest req) {
        Autenticacao.Usuario usuario = auth.exigir(req);
        String marca = limpar(req.getParameterValues("marca"));
        String modelo = limpar(req.getParameterValues("modelo"));
        if (modelo.isEmpty()) modelo = limpar(req.getParameterValues("q"));

        if (modelo.length() < 1 || modelo.length() > 120 || marca.length() > 80 || (marca + modelo).length() < 2) {
            throw ErroApi.de(400, "Informe marca e modelo do celular.");
        }
        if (!PERMITIDOS.matcher(marca).matches() || !PERMITIDOS.matcher(modelo).matches()) {
            throw ErroApi.de(400, "O nome do celular contém caracteres inválidos.");
        }

        StringBuilder url = new StringBuilder(config.specsServiceUrl()).append("/especificacoes?marca=")
                .append(URLEncoder.encode(marca, StandardCharsets.UTF_8))
                .append("&modelo=").append(URLEncoder.encode(modelo, StandardCharsets.UTF_8));
        boolean somente3d = "1".equals(req.getParameter("somente3d"));
        if (somente3d) url.append("&somente3d=1");

        boolean controlado = !somente3d && limite.iniciar(usuario);
        boolean gastou = false;
        try {
            HttpResponse<String> resposta = chamar(url.toString());
            gastou = resposta.statusCode() == 200 && creditosGastos(resposta) > 0;
            return ResponseEntity.status(resposta.statusCode()).contentType(MediaType.APPLICATION_JSON)
                    .body(resposta.body());
        } finally {
            if (controlado) limite.concluir(usuario, gastou);
        }
    }

    @GetMapping("/celulares/especificacoes/creditos")
    public Map<String, Object> creditos(HttpServletRequest req) {
        Autenticacao.Usuario usuario = auth.exigir(req);
        HttpResponse<String> resposta = chamar(config.specsServiceUrl() + "/especificacoes/creditos");
        JsonNode saldo;
        try {
            if (resposta.statusCode() != 200) throw new IllegalStateException("HTTP " + resposta.statusCode());
            saldo = json.readTree(resposta.body());
        } catch (RuntimeException e) {
            LOG.error("Resposta inesperada do specs-service em /creditos: {}", e.toString());
            throw ErroApi.de(503, "Serviço de especificações indisponível");
        }
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("restantesMes", inteiroOuNull(saldo.get("restantesMes")));
        corpo.put("restantesHoje", inteiroOuNull(saldo.get("restantesHoje")));
        corpo.put("usuarioPodeBuscarHoje", limite.podeBuscarHoje(usuario));
        return corpo;
    }

    private static Integer inteiroOuNull(JsonNode no) {
        return no != null && no.isIntegralNumber() ? no.asInt() : null;
    }

    private static int creditosGastos(HttpResponse<String> resposta) {
        try {
            return resposta.headers().firstValue(HEADER_CREDITOS_GASTOS).map(Integer::parseInt).orElse(0);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** GET no specs-service com o token interno; falha de rede vira 503. */
    private HttpResponse<String> chamar(String url) {
        HttpRequest.Builder construtor = HttpRequest.newBuilder(URI.create(url)).GET().timeout(TIMEOUT)
                .header("Accept", "application/json");
        if (!config.specsToken().isEmpty()) construtor.header("X-Internal-Token", config.specsToken());
        try {
            return http.send(construtor.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            LOG.error("specs-service indisponível: {}", e.toString());
            throw ErroApi.de(503, "Serviço de especificações indisponível");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw ErroApi.de(503, "Serviço de especificações indisponível");
        }
    }
}
