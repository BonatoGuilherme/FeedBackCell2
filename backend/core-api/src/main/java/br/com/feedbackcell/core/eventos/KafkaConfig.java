package br.com.feedbackcell.core.eventos;

import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/** Kafka só existe com KAFKA_ENABLED=true (padrão); com false nenhum cliente é criado. */
@Configuration
@EnableKafka
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class KafkaConfig {

    private static final Logger LOG = LoggerFactory.getLogger(KafkaConfig.class);

    @Value("${app.kafka.bootstrap-servers}")
    private String servidores;

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate() {
        Map<String, Object> p = new HashMap<>();
        p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, servidores);
        p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        p.put(ProducerConfig.ACKS_CONFIG, "all");
        // não segura a thread por muito tempo se o broker estiver fora
        p.put(ProducerConfig.MAX_BLOCK_MS_CONFIG, 5000);
        p.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, 10000);
        p.put(ProducerConfig.DELIVERY_TIMEOUT_MS_CONFIG, 30000);
        return new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(p));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory() {
        Map<String, Object> c = new HashMap<>();
        c.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, servidores);
        c.put(ConsumerConfig.GROUP_ID_CONFIG, "core-api");
        c.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        c.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        c.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        ConcurrentKafkaListenerContainerFactory<String, String> f = new ConcurrentKafkaListenerContainerFactory<>();
        f.setConsumerFactory(new DefaultKafkaConsumerFactory<>(c));
        // falha de banco: tenta 3 vezes e segue; a mensagem é só um preenchimento opcional
        f.setCommonErrorHandler(new DefaultErrorHandler(
                (registro, erro) -> LOG.error("Descartando evento {} após falhas: {}", registro.key(), erro.toString()),
                new FixedBackOff(2000, 2)));
        return f;
    }
}
