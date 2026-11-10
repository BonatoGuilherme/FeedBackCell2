package br.com.feedbackcell.core.eventos;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Consome feedbackcell.celular.especificacoes (grupo core-api). */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class EspecificacoesListener {

    private final AplicadorEspecificacoes aplicador;

    public EspecificacoesListener(AplicadorEspecificacoes aplicador) {
        this.aplicador = aplicador;
    }

    @KafkaListener(topics = EventosCelular.TOPICO_ESPECIFICACOES, groupId = "core-api")
    public void receber(String mensagem) {
        aplicador.aplicar(mensagem);
    }
}
