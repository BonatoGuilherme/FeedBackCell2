package br.com.feedbackcell.core.eventos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Chamada ao specs-service (POST /eventos/celular-criado) com um servidor HTTP local. */
class EventosHttpTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String RESPOSTA = "{\"idcelular\":12,\"especificacoes\":null,\"modelo3d\":\"0123456789abcdef0123456789abcdef\"}";

    private final AplicadorEspecificacoes aplicador = mock(AplicadorEspecificacoes.class);
    private final List<String> recebidos = new CopyOnWriteArrayList<>();
    private HttpServer servidor;
    private EventosHttp eventos;

    private void subir(int... status) throws Exception {
        AtomicInteger chamada = new AtomicInteger();
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/eventos/celular-criado", troca -> {
            recebidos.add(new String(troca.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            int s = status[Math.min(chamada.getAndIncrement(), status.length - 1)];
            byte[] corpo = (s == 200 ? RESPOSTA : "{}").getBytes(StandardCharsets.UTF_8);
            troca.sendResponseHeaders(s, corpo.length);
            troca.getResponseBody().write(corpo);
            troca.close();
        });
        servidor.start();
        eventos = new EventosHttp(aplicador, JSON, "http://127.0.0.1:" + servidor.getAddress().getPort());
        eventos.esperaRepeticao = Duration.ZERO;
    }

    @AfterEach
    void parar() {
        if (eventos != null) eventos.close();
        if (servidor != null) servidor.stop(0);
    }

    @Test
    void enviaOEventoEAplicaAResposta() throws Exception {
        subir(200);
        eventos.celularCriado(12, "Samsung", "Galaxy S24", false, true);
        verify(aplicador, timeout(5000)).aplicar(RESPOSTA);
        JsonNode e = JSON.readTree(recebidos.get(0));
        assertThat(e.get("idcelular").asLong()).isEqualTo(12);
        assertThat(e.get("marca").stringValue()).isEqualTo("Samsung");
        assertThat(e.get("precisaEspecificacoes").asBoolean()).isFalse();
        assertThat(e.get("precisaModelo3d").asBoolean()).isTrue();
        assertThat(e.hasNonNull("ocorridoEm")).isTrue();
    }

    @Test
    void repeteUmaVezDepoisDe5xx() throws Exception {
        subir(503, 200);
        eventos.celularCriado(12, "Samsung", "Galaxy S24", true, true);
        verify(aplicador, timeout(5000)).aplicar(RESPOSTA);
        assertThat(recebidos).hasSize(2);
    }

    @Test
    void naoRepeteNemAplicaRespostaRecusada() throws Exception {
        subir(400);
        eventos.celularCriado(12, "Samsung", "Galaxy S24", true, true);
        Thread.sleep(300);
        assertThat(recebidos).hasSize(1);
        verify(aplicador, never()).aplicar(ArgumentMatchers.anyString());
    }

    @Test
    void specsServiceForaDoArNaoQuebraNada() {
        eventos = new EventosHttp(aplicador, JSON, "http://127.0.0.1:1");
        eventos.esperaRepeticao = Duration.ZERO;
        eventos.celularCriado(12, "Samsung", "Galaxy S24", true, true);
        verify(aplicador, after(1000).never()).aplicar(ArgumentMatchers.anyString());
    }
}
