package br.com.feedbackcell.specs.api;

import br.com.feedbackcell.specs.busca.CotaMobileApi;
import br.com.feedbackcell.specs.busca.EspecificacoesService;
import br.com.feedbackcell.specs.busca.Modelos.Resultado;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.jboss.logging.Logger;

/**
 * GET /especificacoes?marca=&modelo=[&q=][&somente3d=1][&somenteCache=1] — mesmas regras de
 * especificacoesController.js. Com {@code somenteCache=1} responde só do cache da busca completa (200, sem
 * gastar crédito) ou 404 se o modelo não estiver lá.
 * Interno: só o core-api chama (proxy autenticado); com SPECS_TOKEN exige o header (TokenInternoFiltro).
 */
@Path("/especificacoes")
@Produces(MediaType.APPLICATION_JSON)
public class EspecificacoesResource {

    /** Quantos créditos da MobileAPI esta busca reservou (0 = cache, 3D ou cota esgotada). */
    public static final String HEADER_CREDITOS_GASTOS = "X-Creditos-Gastos";
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

    /** GET /especificacoes/creditos: créditos da MobileAPI que ainda restam (null = sem teto). */
    @GET
    @Path("/creditos")
    public Map<String, Object> creditos() {
        CotaMobileApi.Saldo saldo = service.saldoCreditos();
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("restantesHoje", saldo.restantesHoje());
        corpo.put("restantesMes", saldo.restantesMes());
        return corpo;
    }

    @GET
    public Response buscar(@QueryParam("marca") String marcaBruta, @QueryParam("modelo") String modeloBruto,
                           @QueryParam("q") String q, @QueryParam("somente3d") String somente3d,
                           @QueryParam("somenteCache") String somenteCache) {
        String marca = limpar(marcaBruta);
        String modelo = limpar(modeloBruto);
        if (modelo.isEmpty()) modelo = limpar(q);
        String erro = validar(marca, modelo);
        if (erro != null) return Response.status(400).entity(Map.of("erro", erro)).build();
        if ("1".equals(somenteCache)) {
            Resultado emCache = service.doCache(marca, modelo);
            if (emCache == null) return Response.status(404).entity(Map.of("erro", "Sem resultado em cache")).build();
            return Response.ok(emCache).header(HEADER_CREDITOS_GASTOS, 0).build();
        }
        try {
            AtomicInteger gastos = new AtomicInteger();
            Resultado resultado = service.buscar(marca, modelo, "1".equals(somente3d), gastos);
            // O core-api conta a busca do usuário só quando ela de fato gastou crédito da MobileAPI.
            return Response.ok(resultado).header(HEADER_CREDITOS_GASTOS, gastos.get()).build();
        } catch (RuntimeException e) {
            LOG.error("Erro:", e);
            return Response.status(500).entity(Map.of("erro", "Erro interno do servidor", "status", 500)).build();
        }
    }
}
