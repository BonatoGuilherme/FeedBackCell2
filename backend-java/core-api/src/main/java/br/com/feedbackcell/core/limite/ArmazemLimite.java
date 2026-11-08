package br.com.feedbackcell.core.limite;

/** Contador de janela fixa por chave (cliente). */
public interface ArmazemLimite {

    /** Resultado de um incremento: total de acessos na janela e ms até ela reiniciar. */
    record Contagem(long total, long msParaReiniciar) {
    }

    Contagem incrementar(String chave, long janelaMs);

    /** Para o /readyz: o armazenamento está conectado? */
    boolean pronto();
}
