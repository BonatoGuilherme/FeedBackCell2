package br.com.feedbackcell.core.config;

import br.com.feedbackcell.core.auth.DuracaoMs;
import java.util.Arrays;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Variáveis de ambiente validadas na inicialização, com as mesmas regras do backend Node
 * (TRUST_PROXY, ADMIN_USER_IDS, RATE_LIMIT*, DB_POOL_SIZE falham cedo se inválidas).
 */
@Component
public class Configuracao {

    private static final Pattern ID_POSITIVO = Pattern.compile("^[1-9]\\d*$");

    private final boolean producao;
    private final String jwtSecret;
    private final String jwtExpiracao;
    private final int bcryptRounds;
    private final String corsOrigin;
    private final Set<Long> adminIds;
    private final int trustProxy;
    private final int rateLimit;
    private final long rateLimitJanelaMs;
    private final String redisUrl;
    private final String specsServiceUrl;

    public Configuracao(
            @Value("${app.env}") String env,
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${app.jwt.expiration}") String jwtExpiracao,
            @Value("${app.bcrypt-rounds}") String bcryptRounds,
            @Value("${app.cors-origin}") String corsOrigin,
            @Value("${app.admin-user-ids}") String adminIds,
            @Value("${app.trust-proxy}") String trustProxy,
            @Value("${app.rate-limit.limit}") String rateLimit,
            @Value("${app.rate-limit.window-ms}") String rateLimitJanelaMs,
            @Value("${app.rate-limit.redis-url}") String redisUrl,
            @Value("${app.specs-service-url}") String specsServiceUrl) {
        this.producao = "production".equalsIgnoreCase(env.trim());
        this.jwtSecret = jwtSecret;
        this.jwtExpiracao = jwtExpiracao.isBlank() ? "24h" : jwtExpiracao.trim();
        if (DuracaoMs.parse(this.jwtExpiracao) == null) {
            throw new IllegalStateException("JWT_EXPIRATION inválido: use valores como 24h, 30m ou 7d");
        }
        this.bcryptRounds = roundsBcrypt(bcryptRounds);
        this.corsOrigin = corsOrigin.isBlank() ? "http://localhost:3000" : corsOrigin;
        this.adminIds = parseAdminIds(adminIds);
        this.trustProxy = inteiroNaoNegativo("TRUST_PROXY", trustProxy.isBlank() ? "1" : trustProxy);
        this.rateLimit = (int) inteiroPositivo("RATE_LIMIT", rateLimit, 100);
        this.rateLimitJanelaMs = inteiroPositivo("RATE_LIMIT_WINDOW_MS", rateLimitJanelaMs, 60_000);
        this.redisUrl = redisUrl.isBlank() ? null : redisUrl.trim();
        this.specsServiceUrl = specsServiceUrl.replaceAll("/+$", "");
        if (producao && this.redisUrl == null) {
            throw new IllegalStateException("RATE_LIMIT_REDIS_URL is required in production");
        }
    }

    /** Como parseInt(BCRYPT_ROUNDS) || 10 do Node, limitado ao intervalo que o bcrypt aceita. */
    static int roundsBcrypt(String valor) {
        try {
            int r = Integer.parseInt(valor.trim());
            return r >= 4 && r <= 31 ? r : 10;
        } catch (NumberFormatException e) {
            return 10;
        }
    }

    static Set<Long> parseAdminIds(String valor) {
        if (valor == null || valor.isBlank()) return Set.of();
        String[] partes = Arrays.stream(valor.split(",")).map(String::trim).toArray(String[]::new);
        boolean validos = Arrays.stream(partes).allMatch(p -> ID_POSITIVO.matcher(p).matches() && p.length() <= 15);
        if (!validos) {
            throw new IllegalStateException("ADMIN_USER_IDS must contain comma-separated positive user IDs");
        }
        return Arrays.stream(partes).map(Long::parseLong).collect(Collectors.toUnmodifiableSet());
    }

    private static int inteiroNaoNegativo(String nome, String valor) {
        try {
            int n = Integer.parseInt(valor.trim());
            if (n >= 0) return n;
        } catch (NumberFormatException ignored) {
            // cai no erro abaixo
        }
        throw new IllegalStateException(nome + " must be a non-negative integer");
    }

    private static long inteiroPositivo(String nome, String valor, long padrao) {
        if (valor == null || valor.isEmpty()) return padrao;
        try {
            long n = Long.parseLong(valor.trim());
            if (n >= 1 && n <= Integer.MAX_VALUE) return n;
        } catch (NumberFormatException ignored) {
            // cai no erro abaixo
        }
        throw new IllegalStateException(nome + " must be a positive integer");
    }

    public boolean producao() { return producao; }
    public String jwtSecret() { return jwtSecret; }
    public String jwtExpiracao() { return jwtExpiracao; }
    public int bcryptRounds() { return bcryptRounds; }
    public String corsOrigin() { return corsOrigin; }
    public Set<Long> adminIds() { return adminIds; }
    public int trustProxy() { return trustProxy; }
    public int rateLimit() { return rateLimit; }
    public long rateLimitJanelaMs() { return rateLimitJanelaMs; }
    public String redisUrl() { return redisUrl; }
    public String specsServiceUrl() { return specsServiceUrl; }
}
