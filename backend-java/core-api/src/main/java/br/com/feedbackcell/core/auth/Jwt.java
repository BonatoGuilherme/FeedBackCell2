package br.com.feedbackcell.core.auth;

import br.com.feedbackcell.core.config.Configuracao;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * JWT HS256 compatível com o jsonwebtoken do Node: payload {@code {idusuario, email, iat, exp}},
 * mesmo segredo e mesmas regras de expiração, então tokens dos dois backends são intercambiáveis.
 */
@Component
public class Jwt {

    /** Por que a verificação falhou; espelha TokenExpiredError / JsonWebTokenError / NotBeforeError. */
    public enum Falha { EXPIRADO, INVALIDO, AINDA_NAO_VALIDO }

    public static final class ErroToken extends Exception {
        private final Falha falha;

        ErroToken(Falha falha, String mensagem) {
            super(mensagem);
            this.falha = falha;
        }

        public Falha falha() {
            return falha;
        }
    }

    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64D = Base64.getUrlDecoder();
    private static final Map<String, String> ALGORITMOS = Map.of(
            "HS256", "HmacSHA256", "HS384", "HmacSHA384", "HS512", "HmacSHA512");

    private final Configuracao config;
    private final ObjectMapper json;

    public Jwt(Configuracao config, ObjectMapper json) {
        this.config = config;
        this.json = json;
    }

    public String assinar(long idusuario, String email) {
        long agora = System.currentTimeMillis() / 1000;
        double ms = DuracaoMs.parse(config.jwtExpiracao());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("idusuario", idusuario);
        payload.put("email", email);
        payload.put("iat", agora);
        payload.put("exp", (long) Math.floor(agora + ms / 1000));
        String cabecalho = B64.encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String corpo = B64.encodeToString(json.writeValueAsBytes(payload));
        String conteudo = cabecalho + "." + corpo;
        return conteudo + "." + B64.encodeToString(hmac("HmacSHA256", conteudo));
    }

    /** Valida assinatura, exp e nbf e devolve o payload. */
    public JsonNode verificar(String token) throws ErroToken {
        String segredo = config.jwtSecret();
        if (segredo == null || segredo.isEmpty()) {
            throw new ErroToken(Falha.INVALIDO, "secret or public key must be provided");
        }
        String[] partes = token.split("\\.", -1);
        if (partes.length != 3) throw new ErroToken(Falha.INVALIDO, "jwt malformed");

        JsonNode cabecalho;
        JsonNode payload;
        byte[] assinatura;
        try {
            cabecalho = json.readTree(B64D.decode(partes[0]));
            payload = json.readTree(B64D.decode(partes[1]));
            assinatura = B64D.decode(partes[2]);
        } catch (RuntimeException e) {
            throw new ErroToken(Falha.INVALIDO, "invalid token");
        }
        if (cabecalho == null || !cabecalho.isObject() || payload == null || !payload.isObject()) {
            throw new ErroToken(Falha.INVALIDO, "invalid token");
        }
        String algoritmo = ALGORITMOS.get(cabecalho.path("alg").asString(""));
        if (algoritmo == null) throw new ErroToken(Falha.INVALIDO, "invalid algorithm");
        byte[] esperado = hmac(algoritmo, partes[0] + "." + partes[1]);
        if (!MessageDigest.isEqual(esperado, assinatura)) {
            throw new ErroToken(Falha.INVALIDO, "invalid signature");
        }

        double agora = System.currentTimeMillis() / 1000.0;
        JsonNode nbf = payload.get("nbf");
        if (nbf != null && !nbf.isNull()) {
            if (!nbf.isNumber()) throw new ErroToken(Falha.INVALIDO, "invalid nbf value");
            if (Math.floor(agora) < nbf.asDouble()) throw new ErroToken(Falha.AINDA_NAO_VALIDO, "jwt not active");
        }
        JsonNode exp = payload.get("exp");
        if (exp != null && !exp.isNull()) {
            if (!exp.isNumber()) throw new ErroToken(Falha.INVALIDO, "invalid exp value");
            if (Math.floor(agora) >= exp.asDouble()) throw new ErroToken(Falha.EXPIRADO, "jwt expired");
        }
        return payload;
    }

    private byte[] hmac(String algoritmo, String conteudo) {
        try {
            Mac mac = Mac.getInstance(algoritmo);
            mac.init(new SecretKeySpec(config.jwtSecret().getBytes(StandardCharsets.UTF_8), algoritmo));
            return mac.doFinal(conteudo.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Falha ao calcular HMAC do JWT", e);
        }
    }
}
