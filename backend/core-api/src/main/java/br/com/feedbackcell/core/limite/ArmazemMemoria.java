package br.com.feedbackcell.core.limite;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Contador do rate limit em memória, como o MemoryStore do express-rate-limit. Cada réplica do
 * core-api conta à parte: com N réplicas, o limite efetivo por cliente fica até N vezes maior.
 */
@Component
public class ArmazemMemoria implements ArmazemLimite {

    private record Janela(long total, long expiraEm) {
    }

    private final ConcurrentHashMap<String, Janela> janelas = new ConcurrentHashMap<>();

    @Override
    public Contagem incrementar(String chave, long janelaMs) {
        long agora = System.currentTimeMillis();
        if (janelas.size() > 100_000) janelas.values().removeIf(j -> j.expiraEm() <= agora);
        Janela j = janelas.compute(chave, (k, atual) -> atual == null || atual.expiraEm() <= agora
                ? new Janela(1, agora + janelaMs)
                : new Janela(atual.total() + 1, atual.expiraEm()));
        return new Contagem(j.total(), j.expiraEm() - agora);
    }

    @Override
    public boolean pronto() {
        return true;
    }
}
