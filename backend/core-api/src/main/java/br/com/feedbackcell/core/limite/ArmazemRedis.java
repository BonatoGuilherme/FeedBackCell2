package br.com.feedbackcell.core.limite;

import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.ScriptOutputType;
import io.lettuce.core.api.StatefulRedisConnection;
import java.time.Duration;
import java.util.List;

/**
 * Mesmo script Lua e prefixo ("rl:") do rate-limit-redis do Node, então os dois backends
 * compartilham a contagem por cliente durante a migração.
 */
public class ArmazemRedis implements ArmazemLimite, AutoCloseable {

    private static final String SCRIPT = """
            local totalHits = redis.call("INCR", KEYS[1])
            local timeToExpire = redis.call("PTTL", KEYS[1])
            if timeToExpire <= 0 or ARGV[1] == "1"
            then
              redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[2]))
              timeToExpire = tonumber(ARGV[2])
            end
            return { totalHits, timeToExpire }
            """;

    private final RedisClient cliente;
    private final StatefulRedisConnection<String, String> conexao;

    /** Conecta já na inicialização: sem Redis o servidor não sobe (como connectRateLimitStore). */
    public ArmazemRedis(String url) {
        RedisURI uri = RedisURI.create(url);
        uri.setTimeout(Duration.ofSeconds(5));
        this.cliente = RedisClient.create(uri);
        this.conexao = cliente.connect();
    }

    @Override
    public Contagem incrementar(String chave, long janelaMs) {
        List<Long> r = conexao.sync().eval(SCRIPT, ScriptOutputType.MULTI,
                new String[]{"rl:" + chave}, "0", String.valueOf(janelaMs));
        return new Contagem(r.get(0), r.get(1));
    }

    @Override
    public boolean pronto() {
        try {
            return conexao.isOpen() && "PONG".equals(conexao.sync().ping());
        } catch (RuntimeException e) {
            return false;
        }
    }

    @Override
    public void close() {
        conexao.close();
        cliente.shutdown();
    }
}
