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
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /celulares/especificacoes?marca=&modelo=[&q=][&somente3d=1] (autenticado).
 * Valida a consulta como o Node e repassa ao specs-service, devolvendo o mesmo status e corpo.
 */
@RestController
public class EspecificacoesController {

    private static final Logger LOG = LoggerFactory.getLogger(EspecificacoesController.class);
    private static final Pattern PERMITIDOS = Pattern.compile("^[\\p{L}\\p{N} ._+()\\-/]*$");
    private static final Pattern ESPACOS = Pattern.compile("(?U)\\s+");
    /** A busca no specs-service pode encadear MobileAPI (8 s) + Wikimedia (6 s) + Sketchfab. */
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final Autenticacao auth;
    private final Configuracao config;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    public EspecificacoesController(Autenticacao auth, Configuracao config) {
        this.auth = auth;
        this.config = config;
    }

    static String limpar(String[] valores) {
        if (valores == null || valores.length != 1) return "";
        return ESPACOS.matcher(valores[0]).replaceAll(" ").strip();
    }

    @GetMapping("/celulares/especificacoes")
    public ResponseEntity<String> buscar(HttpServletRequest req) {
        auth.exigir(req);
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
        if ("1".equals(req.getParameter("somente3d"))) url.append("&somente3d=1");

        HttpRequest pedido = HttpRequest.newBuilder(URI.create(url.toString())).GET().timeout(TIMEOUT)
                .header("Accept", "application/json").build();
        try {
            HttpResponse<String> resposta = http.send(pedido, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            return ResponseEntity.status(resposta.statusCode()).contentType(MediaType.APPLICATION_JSON)
                    .body(resposta.body());
        } catch (IOException e) {
            LOG.error("specs-service indisponível: {}", e.toString());
            throw ErroApi.de(503, "Serviço de especificações indisponível");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw ErroApi.de(503, "Serviço de especificações indisponível");
        }
    }
}
