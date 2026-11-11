package br.com.feedbackcell.core.limite;

import br.com.feedbackcell.core.config.Configuracao;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Rate limit global (express-rate-limit): janela fixa por IP, headers RateLimit-* (draft-6)
 * e 429 com texto puro. /health e /readyz ficam de fora, como no Node.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class LimiteFiltro extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(LimiteFiltro.class);
    static final String MENSAGEM = "Muitas requisições, tente novamente mais tarde";

    private final Configuracao config;
    private final ArmazemLimite armazem;

    public LimiteFiltro(Configuracao config, ArmazemLimite armazem) {
        this.config = config;
        this.armazem = armazem;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        String uri = req.getRequestURI();
        return uri.equals("/health") || uri.equals("/readyz");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        ArmazemLimite.Contagem c;
        try {
            c = armazem.incrementar(ipCliente(req, config.trustProxy()), config.rateLimitJanelaMs());
        } catch (RuntimeException e) {
            // passOnStoreError: false — erro no contador faz a requisição falhar
            LOG.error("Erro no armazenamento do rate limit:", e);
            res.setStatus(500);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"erro\":\"Erro interno do servidor\",\"status\":500}");
            return;
        }
        int limite = config.rateLimit();
        long janelaS = (long) Math.ceil(config.rateLimitJanelaMs() / 1000.0);
        res.setHeader("RateLimit-Policy", limite + ";w=" + janelaS);
        res.setHeader("RateLimit-Limit", String.valueOf(limite));
        res.setHeader("RateLimit-Remaining", String.valueOf(Math.max(0, limite - c.total())));
        res.setHeader("RateLimit-Reset", String.valueOf((long) Math.ceil(Math.max(0, c.msParaReiniciar()) / 1000.0)));
        if (c.total() > limite) {
            res.setHeader("Retry-After", String.valueOf((long) Math.ceil(config.rateLimitJanelaMs() / 1000.0)));
            res.setStatus(429);
            res.setContentType("text/html;charset=utf-8");
            byte[] corpo = MENSAGEM.getBytes(StandardCharsets.UTF_8);
            res.setContentLength(corpo.length);
            res.getOutputStream().write(corpo);
            return;
        }
        chain.doFilter(req, res);
    }

    /**
     * req.ip do Express com {@code trust proxy = N}: confia nos N saltos mais próximos e usa
     * o endereço logo antes deles no X-Forwarded-For.
     */
    static String ipCliente(HttpServletRequest req, int saltosConfiaveis) {
        List<String> enderecos = new ArrayList<>();
        enderecos.add(req.getRemoteAddr());
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && saltosConfiaveis > 0) {
            String[] partes = xff.split(",");
            for (int i = partes.length - 1; i >= 0; i--) {
                String p = partes[i].trim();
                if (!p.isEmpty()) enderecos.add(p);
            }
        }
        return enderecos.get(Math.min(saltosConfiaveis, enderecos.size() - 1));
    }
}
