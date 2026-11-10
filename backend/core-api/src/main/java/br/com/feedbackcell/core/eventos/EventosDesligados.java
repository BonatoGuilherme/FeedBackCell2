package br.com.feedbackcell.core.eventos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** BUSCA_AUTOMATICA=false: nenhuma busca é pedida (testes e desenvolvimento sem specs-service). */
@Component
@ConditionalOnProperty(name = "app.busca-automatica", havingValue = "false", matchIfMissing = true)
public class EventosDesligados implements EventosCelular {

    private static final Logger LOG = LoggerFactory.getLogger(EventosDesligados.class);

    @Override
    public void celularCriado(long idcelular, String marca, String modelo,
                              boolean precisaEspecificacoes, boolean precisaModelo3d) {
        LOG.debug("Busca automática desligada; celular {} fica sem especificações automáticas", idcelular);
    }
}
