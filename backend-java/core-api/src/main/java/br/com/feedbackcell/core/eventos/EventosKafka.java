package br.com.feedbackcell.core.eventos;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** Produz feedbackcell.celular.criado (chave = idcelular) fora da thread da requisição. */
@Component
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class EventosKafka implements EventosCelular, AutoCloseable {

    private static final Logger LOG = LoggerFactory.getLogger(EventosKafka.class);

    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper json;
    private final ExecutorService envio = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "kafka-envio");
        t.setDaemon(true);
        return t;
    });

    public EventosKafka(KafkaTemplate<String, String> kafka, ObjectMapper json) {
        this.kafka = kafka;
        this.json = json;
    }

    @Override
    public void celularCriado(long idcelular, String marca, String modelo,
                              boolean precisaEspecificacoes, boolean precisaModelo3d) {
        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("idcelular", idcelular);
        evento.put("marca", marca);
        evento.put("modelo", modelo);
        evento.put("precisaEspecificacoes", precisaEspecificacoes);
        evento.put("precisaModelo3d", precisaModelo3d);
        evento.put("ocorridoEm", Instant.now().truncatedTo(ChronoUnit.SECONDS).toString());
        try {
            String valor = json.writeValueAsString(evento);
            envio.execute(() -> {
                try {
                    kafka.send(TOPICO_CRIADO, String.valueOf(idcelular), valor).whenComplete((r, erro) -> {
                        if (erro != null) LOG.error("Falha ao publicar {} do celular {}: {}", TOPICO_CRIADO, idcelular, erro.toString());
                    });
                } catch (RuntimeException e) {
                    LOG.error("Falha ao publicar {} do celular {}: {}", TOPICO_CRIADO, idcelular, e.toString());
                }
            });
        } catch (RuntimeException e) {
            LOG.error("Falha ao preparar evento do celular {}: {}", idcelular, e.toString());
        }
    }

    @Override
    public void close() {
        envio.shutdown();
    }
}
