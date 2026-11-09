package br.com.feedbackcell.specs.http;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.Map;

/** GET que devolve JSON; abstração para os testes trocarem a rede por respostas falsas. */
public interface ClienteHttp {

    /**
     * Faz o GET com {@code Accept: application/json} mais os {@code headers} dados.
     *
     * @throws ErroHttp status fora de 2xx (com {@link ErroHttp#status()}), timeout, rede ou JSON inválido
     */
    JsonNode buscarJson(String url, Map<String, String> headers, Duration timeout) throws ErroHttp;

    /** Falha de uma chamada externa; {@code status} é 0 quando não houve resposta HTTP. */
    final class ErroHttp extends Exception {
        private final int status;

        public ErroHttp(int status, String mensagem, Throwable causa) {
            super(mensagem, causa);
            this.status = status;
        }

        public static ErroHttp deStatus(int status) {
            return new ErroHttp(status, "HTTP " + status, null);
        }

        public int status() {
            return status;
        }
    }
}
