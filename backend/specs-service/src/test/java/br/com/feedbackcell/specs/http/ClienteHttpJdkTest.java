package br.com.feedbackcell.specs.http;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Servidor local de verdade: timeout, status de erro e nenhuma mensagem com a chave da API. */
class ClienteHttpJdkTest {

    private static final String CHAVE = "segredo-123";
    private static final Map<String, String> AUTH = Map.of("Authorization", "Token " + CHAVE);

    private static HttpServer servidor(int status, long atrasoMs) throws Exception {
        HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        s.createContext("/", troca -> {
            try {
                Thread.sleep(atrasoMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            byte[] corpo = "{}".getBytes();
            troca.sendResponseHeaders(status, corpo.length);
            troca.getResponseBody().write(corpo);
            troca.close();
        });
        s.start();
        return s;
    }

    private static String url(HttpServer s) {
        return "http://127.0.0.1:" + s.getAddress().getPort() + "/x";
    }

    @Test
    void timeoutViraErroTemporarioSemAChave() throws Exception {
        HttpServer s = servidor(200, 3000);
        try {
            long inicio = System.nanoTime();
            ClienteHttp.ErroHttp e = assertThrows(ClienteHttp.ErroHttp.class,
                    () -> new ClienteHttpJdk().buscarJson(url(s), AUTH, Duration.ofMillis(300)));
            assertEquals(0, e.status());
            assertFalse(e.getMessage().contains(CHAVE));
            assertFalse(Duration.ofNanos(System.nanoTime() - inicio).compareTo(Duration.ofSeconds(2)) > 0,
                    "respeita o timeout pedido");
        } finally {
            s.stop(0);
        }
    }

    @Test
    void statusDeErroNaoLevaAChaveNaMensagem() throws Exception {
        HttpServer s = servidor(401, 0);
        try {
            ClienteHttp.ErroHttp e = assertThrows(ClienteHttp.ErroHttp.class,
                    () -> new ClienteHttpJdk().buscarJson(url(s), AUTH, Duration.ofSeconds(2)));
            assertEquals(401, e.status());
            assertEquals("HTTP 401", e.getMessage());
        } finally {
            s.stop(0);
        }
    }
}
