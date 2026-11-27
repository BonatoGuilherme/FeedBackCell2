package br.com.feedbackcell.core.eventos;

import br.com.feedbackcell.core.config.Configuracao;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.function.IntConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Pede ao specs-service (POST /eventos/celular-criado) o que o celular criado precisa e aplica a
 * resposta no banco, tudo fora da thread da requisição. Duas buscas por vez no máximo (a MobileAPI
 * do plano Free limita a frequência); uma falha temporária é repetida uma vez.
 */
@Component
@ConditionalOnProperty(name = "app.busca-automatica", havingValue = "true")
public class EventosHttp implements EventosCelular, AutoCloseable {

    private static final Logger LOG = LoggerFactory.getLogger(EventosHttp.class);
    /** O specs-service pode repetir a busca (MobileAPI + Wikimedia + Sketchfab, duas vezes). */
    private static final Duration TIMEOUT = Duration.ofSeconds(90);
    /** Espera antes de repetir uma falha temporária; os testes zeram. */
    Duration esperaRepeticao = Duration.ofSeconds(5);

    private final AplicadorEspecificacoes aplicador;
    private final ObjectMapper json;
    private final URI destino;
    private final String token;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final ThreadPoolExecutor envio = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(500), r -> {
                Thread t = new Thread(r, "busca-especificacoes");
                t.setDaemon(true);
                return t;
            });

    @Autowired
    public EventosHttp(AplicadorEspecificacoes aplicador, ObjectMapper json, Configuracao config) {
        this(aplicador, json, config.specsServiceUrl(), config.specsToken());
    }

    EventosHttp(AplicadorEspecificacoes aplicador, ObjectMapper json, String specsServiceUrl, String token) {
        this.aplicador = aplicador;
        this.json = json;
        this.destino = URI.create(specsServiceUrl + "/eventos/celular-criado");
        this.token = token;
    }

    @Override
    public void celularCriado(long idcelular, String marca, String modelo,
                              boolean precisaEspecificacoes, boolean precisaModelo3d, IntConsumer fim) {
        try {
            Map<String, Object> evento = new LinkedHashMap<>();
            evento.put("idcelular", idcelular);
            evento.put("marca", marca);
            evento.put("modelo", modelo);
            evento.put("precisaEspecificacoes", precisaEspecificacoes);
            evento.put("precisaModelo3d", precisaModelo3d);
            evento.put("ocorridoEm", Instant.now().truncatedTo(ChronoUnit.SECONDS).toString());
            String valor = json.writeValueAsString(evento);
            envio.execute(() -> {
                int gastos = 0;
                try {
                    gastos = enviar(idcelular, valor);
                } finally {
                    concluir(fim, gastos);
                }
            });
        } catch (RejectedExecutionException e) {
            LOG.error("Fila de busca de especificações cheia; celular {} fica sem busca automática", idcelular);
            concluir(fim, 0);
        } catch (RuntimeException e) {
            LOG.error("Falha ao preparar busca do celular {}: {}", idcelular, e.toString());
            concluir(fim, 0);
        }
    }

    private static void concluir(IntConsumer fim, int gastos) {
        try {
            fim.accept(gastos);
        } catch (RuntimeException e) {
            LOG.error("Falha ao registrar os créditos gastos na busca: {}", e.toString());
        }
    }

    /** Créditos da MobileAPI que a resposta do specs-service diz ter gastado (0 se ausente ou inválido). */
    private int creditosGastos(String corpo) {
        try {
            JsonNode n = json.readTree(corpo).get("creditosGastos");
            return n != null && n.isIntegralNumber() && n.asInt() > 0 ? n.asInt() : 0;
        } catch (RuntimeException e) {
            return 0;
        }
    }

    /** Envia o evento e devolve os créditos gastos (só a tentativa que respondeu 200 informa). */
    private int enviar(long idcelular, String evento) {
        HttpRequest.Builder construtor = HttpRequest.newBuilder(destino).timeout(TIMEOUT)
                .header("Content-Type", "application/json").header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(evento, StandardCharsets.UTF_8));
        if (!token.isEmpty()) construtor.header("X-Internal-Token", token);
        HttpRequest pedido = construtor.build();
        for (int tentativa = 1; tentativa <= 2; tentativa++) {
            String falha;
            try {
                HttpResponse<String> r = http.send(pedido, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (r.statusCode() == 200) {
                    int gastos = creditosGastos(r.body());
                    aplicador.aplicar(r.body());
                    return gastos;
                }
                if (r.statusCode() < 500) {
                    LOG.warn("specs-service recusou a busca do celular {}: HTTP {}", idcelular, r.statusCode());
                    return 0;
                }
                falha = "HTTP " + r.statusCode();
            } catch (IOException e) {
                falha = e.toString();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return 0;
            } catch (RuntimeException e) {
                LOG.error("Falha ao aplicar especificações do celular {}: {}", idcelular, e.toString());
                return 0;
            }
            if (tentativa == 2) {
                LOG.error("Busca de especificações do celular {} falhou: {}", idcelular, falha);
                return 0;
            }
            LOG.warn("Busca de especificações do celular {} falhou ({}); tentando de novo", idcelular, falha);
            try {
                Thread.sleep(esperaRepeticao);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return 0;
            }
        }
        return 0;
    }

    @Override
    public void close() {
        envio.shutdownNow();
    }
}
