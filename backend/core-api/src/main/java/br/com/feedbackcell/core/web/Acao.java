package br.com.feedbackcell.core.web;

import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * O try/catch de cada controller Node: erros previstos ({@link ErroApi}) passam,
 * qualquer outro vira 500 com a mensagem própria da rota (ex.: "Erro ao buscar celulares").
 */
public final class Acao {

    private static final Logger LOG = LoggerFactory.getLogger(Acao.class);

    private Acao() {
    }

    public static <T> T executar(String mensagemErro, Supplier<T> acao) {
        try {
            return acao.get();
        } catch (ErroApi e) {
            throw e;
        } catch (RuntimeException e) {
            LOG.error("{}:", mensagemErro, e);
            throw ErroApi.de(500, mensagemErro);
        }
    }
}
