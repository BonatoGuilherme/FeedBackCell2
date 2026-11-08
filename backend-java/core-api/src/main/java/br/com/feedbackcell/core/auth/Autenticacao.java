package br.com.feedbackcell.core.auth;

import br.com.feedbackcell.core.config.Configuracao;
import br.com.feedbackcell.core.web.ErroApi;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

/** authMiddleware e requireAdmin do Node. */
@Component
public class Autenticacao {

    private static final Logger LOG = LoggerFactory.getLogger(Autenticacao.class);

    /** Usuário do token; {@code id} é null se a claim idusuario não for um inteiro. */
    public record Usuario(Long id, String email) {
    }

    private final Jwt jwt;
    private final Configuracao config;

    public Autenticacao(Jwt jwt, Configuracao config) {
        this.jwt = jwt;
        this.config = config;
    }

    /** Token do header Authorization como {@code authorization.split(" ")[1]} do Node. */
    public static String token(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header == null) return null;
        String[] partes = header.split(" ", -1);
        return partes.length > 1 && !partes[1].isEmpty() ? partes[1] : null;
    }

    public Usuario exigir(HttpServletRequest req) {
        return exigir(req, "Erro ao verificar autenticação");
    }

    /** Valida o token; {@code mensagem500} é a resposta para falhas que não são de token. */
    public Usuario exigir(HttpServletRequest req, String mensagem500) {
        String token = token(req);
        if (token == null) throw ErroApi.de(401, "Token não fornecido");
        JsonNode payload;
        try {
            payload = jwt.verificar(token);
        } catch (Jwt.ErroToken e) {
            switch (e.falha()) {
                case EXPIRADO -> throw ErroApi.de(401, "Token expirado");
                case INVALIDO -> throw ErroApi.de(401, "Token inválido");
                default -> {
                    LOG.error("Erro na autenticação: {}", e.getMessage());
                    throw ErroApi.de(500, mensagem500);
                }
            }
        }
        JsonNode id = payload.get("idusuario");
        Long idusuario = id != null && id.isIntegralNumber() && id.canConvertToLong() ? id.asLong() : null;
        JsonNode email = payload.get("email");
        return new Usuario(idusuario, email != null && email.isString() ? email.stringValue() : null);
    }

    public void exigirAdmin(Usuario usuario) {
        if (config.adminIds().isEmpty()) {
            throw ErroApi.de(503, "O acesso administrativo não está configurado");
        }
        if (usuario.id() == null || !config.adminIds().contains(usuario.id())) {
            throw ErroApi.de(403, "Acesso restrito a administradores");
        }
    }
}
