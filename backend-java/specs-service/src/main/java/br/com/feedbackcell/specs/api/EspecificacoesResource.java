package br.com.feedbackcell.specs.api;

import br.com.feedbackcell.specs.busca.EspecificacoesService;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import java.util.regex.Pattern;
import org.jboss.logging.Logger;

/**
 * GET /especificacoes?marca=&modelo=[&q=][&somente3d=1] — mesmas regras de especificacoesController.js.
 * Interno: sem autenticação e não exposto pelo nginx (o core-api faz o proxy autenticado).
 */
@Path("/especificacoes")
@Produces(MediaType.APPLICATION_JSON)
public class EspecificacoesResource {

    private static final Logger LOG = Logger.getLogger(EspecificacoesResource.class);
    private static final Pattern PERMITIDOS = Pattern.compile("^[\\p{L}\\p{N} ._+()\\-/]*$");
    private static final Pattern ESPACOS = Pattern.compile("(?U)\\s+");

    private final EspecificacoesService service;

    public EspecificacoesResource(EspecificacoesService service) {
        this.service = service;
    }

    static String limpar(String valor) {
        return valor == null ? "" : ESPACOS.matcher(valor).replaceAll(" ").strip();
    }

    /** Valida marca/modelo; devolve a mensagem de erro ou null se estiver tudo certo. */
    public static String validar(String marca, String modelo) {
        if (modelo.length() < 1 || modelo.length() > 120 || marca.length() > 80 || (marca + modelo).length() < 2) {
            return "Informe marca e modelo do celular.";
        }
        if (!PERMITIDOS.matcher(marca).matches() || !PERMITIDOS.matcher(modelo).matches()) {
            return "O nome do celular contém caracteres inválidos.";
        }
        return null;
    }

    @GET
    public Response buscar(@QueryParam("marca") String marcaBruta, @QueryParam("modelo") String modeloBruto,
                           @QueryParam("q") String q, @QueryParam("somente3d") String somente3d) {
        String marca = limpar(marcaBruta);
        String modelo = limpar(modeloBruto);
        if (modelo.isEmpty()) modelo = limpar(q);
        String erro = validar(marca, modelo);
        if (erro != null) return Response.status(400).entity(Map.of("erro", erro)).build();
        try {
            return Response.ok(service.buscar(marca, modelo, "1".equals(somente3d))).build();
        } catch (RuntimeException e) {
            LOG.error("Erro:", e);
            return Response.status(500).entity(Map.of("erro", "Erro interno do servidor", "status", 500)).build();
        }
    }
}
