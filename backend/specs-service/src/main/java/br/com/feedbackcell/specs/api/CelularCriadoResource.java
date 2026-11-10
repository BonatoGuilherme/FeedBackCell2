package br.com.feedbackcell.specs.api;

import br.com.feedbackcell.specs.eventos.ProcessadorCelularCriado;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

/**
 * POST /eventos/celular-criado — o core-api avisa que um celular foi criado sem especificações
 * e/ou modelo 3D; a resposta traz {@code {idcelular, especificacoes, modelo3d, ocorridoEm}}.
 * Interno: sem autenticação e não exposto pelo nginx.
 */
@Path("/eventos/celular-criado")
public class CelularCriadoResource {

    private final ProcessadorCelularCriado processador;

    public CelularCriadoResource(ProcessadorCelularCriado processador) {
        this.processador = processador;
    }

    @POST
    @Consumes(MediaType.WILDCARD)
    @Produces(MediaType.APPLICATION_JSON)
    public Response processar(String evento) {
        return processador.processar(evento)
                .map(r -> Response.ok(r.valor()).build())
                .orElseGet(() -> Response.status(400).entity(Map.of("erro", "Evento inválido")).build());
    }
}
