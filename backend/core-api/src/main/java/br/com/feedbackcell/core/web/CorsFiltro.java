package br.com.feedbackcell.core.web;

import br.com.feedbackcell.core.config.Configuracao;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Mesmo comportamento do pacote {@code cors} com origem fixa: sempre envia CORS_ORIGIN
 * (o navegador recusa se não bater) e responde o preflight com 204.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorsFiltro extends OncePerRequestFilter {

    private final Configuracao config;

    public CorsFiltro(Configuracao config) {
        this.config = config;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        res.setHeader("Access-Control-Allow-Origin", config.corsOrigin());
        res.addHeader("Vary", "Origin");
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
            res.setStatus(204);
            res.setContentLength(0);
            return;
        }
        chain.doFilter(req, res);
    }
}
