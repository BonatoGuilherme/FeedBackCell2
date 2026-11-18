package br.com.feedbackcell.specs.api;

import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Exige o header {@code X-Internal-Token} igual a SPECS_TOKEN em todas as rotas REST. Em produção o
 * specs-service fica público (sem rede privada no plano grátis), então só o core-api, que conhece o
 * segredo, consegue chamá-lo. Sem SPECS_TOKEN (dev, compose, testes) o filtro não faz nada.
 */
@Provider
public class TokenInternoFiltro implements ContainerRequestFilter {

    static final String HEADER = "X-Internal-Token";

    @ConfigProperty(name = "specs.token")
    Optional<String> token;

    @Override
    public void filter(ContainerRequestContext ctx) {
        if (token.isEmpty()) return;
        String caminho = ctx.getUriInfo().getPath();
        // Health check (/q/health) do Render não manda token.
        if (caminho.startsWith("/q/") || caminho.startsWith("q/")) return;

        String recebido = ctx.getHeaderString(HEADER);
        // Comparação em tempo constante: equals vazaria pelo tempo quantos caracteres batem.
        if (recebido == null || !MessageDigest.isEqual(
                recebido.getBytes(StandardCharsets.UTF_8), token.get().getBytes(StandardCharsets.UTF_8))) {
            ctx.abortWith(Response.status(Response.Status.UNAUTHORIZED).build());
        }
    }
}
