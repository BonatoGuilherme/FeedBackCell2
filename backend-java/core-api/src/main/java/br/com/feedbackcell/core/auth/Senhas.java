package br.com.feedbackcell.core.auth;

import br.com.feedbackcell.core.config.Configuracao;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

/**
 * bcrypt compatível com o bcryptjs do Node ($2a$/$2b$). Como o bcryptjs, considera só os
 * primeiros 72 bytes UTF-8 da senha (o Spring recusaria senhas maiores).
 */
@Component
public class Senhas {

    private static final int MAX_BYTES = 72;

    private final Configuracao config;

    public Senhas(Configuracao config) {
        this.config = config;
    }

    public String hash(String senha) {
        return BCrypt.hashpw(bytes(senha), BCrypt.gensalt("$2b", config.bcryptRounds()));
    }

    public boolean confere(String senha, String hash) {
        if (senha == null || hash == null) return false;
        try {
            return BCrypt.checkpw(bytes(senha), hash);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static byte[] bytes(String senha) {
        byte[] b = senha.getBytes(StandardCharsets.UTF_8);
        return b.length > MAX_BYTES ? Arrays.copyOf(b, MAX_BYTES) : b;
    }
}
