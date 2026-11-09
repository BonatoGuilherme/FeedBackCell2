package br.com.feedbackcell.core.eventos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** KAFKA_ENABLED=false: nada é publicado (testes e desenvolvimento sem Kafka). */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "false", matchIfMissing = true)
public class EventosDesligados implements EventosCelular {

    private static final Logger LOG = LoggerFactory.getLogger(EventosDesligados.class);

    @Override
    public void celularCriado(long idcelular, String marca, String modelo,
                              boolean precisaEspecificacoes, boolean precisaModelo3d) {
        LOG.debug("Kafka desligado; celular {} não terá busca automática de especificações", idcelular);
    }
}
