package br.com.feedbackcell.specs.eventos;

import io.smallrye.reactive.messaging.annotations.Blocking;
import io.smallrye.reactive.messaging.kafka.Record;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.reactive.messaging.Outgoing;

/**
 * Consome feedbackcell.celular.criado (grupo specs-service) e publica uma resposta em
 * feedbackcell.celular.especificacoes. Os canais são desligados com KAFKA_ENABLED=false.
 */
@ApplicationScoped
public class CelularCriadoConsumidor {

    private final ProcessadorCelularCriado processador;

    public CelularCriadoConsumidor(ProcessadorCelularCriado processador) {
        this.processador = processador;
    }

    /** Retornar null descarta a mensagem sem publicar nada (evento inválido). */
    @Incoming("celular-criado")
    @Outgoing("celular-especificacoes")
    @Blocking(ordered = false)
    public Record<String, String> processar(String mensagem) {
        return processador.processar(mensagem)
                .map(r -> Record.of(r.chave(), r.valor()))
                .orElse(null);
    }
}
