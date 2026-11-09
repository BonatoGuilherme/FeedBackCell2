package br.com.feedbackcell.specs.http;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
        /** "retry_after" do corpo de um 429 (ex.: MobileAPI: {"retry_after": 1.52, ...}). */
        private static final Pattern RETRY_AFTER = Pattern.compile("\"retry_after\"\\s*:\\s*(\\d{1,4}(?:\\.\\d+)?)");

        private final int status;
        private final Duration esperar;

        public ErroHttp(int status, String mensagem, Throwable causa) {
            this(status, mensagem, causa, null);
        }

        private ErroHttp(int status, String mensagem, Throwable causa, Duration esperar) {
            super(mensagem, causa);
            this.status = status;
            this.esperar = esperar;
        }

        public static ErroHttp deStatus(int status) {
            return new ErroHttp(status, "HTTP " + status, null);
        }

        /** Como {@link #deStatus}, guardando o "retry_after" do corpo, se houver. */
        public static ErroHttp deResposta(int status, String corpo) {
            Duration esperar = null;
            if (corpo != null) {
                Matcher m = RETRY_AFTER.matcher(corpo);
                if (m.find()) esperar = Duration.ofMillis((long) Math.ceil(Double.parseDouble(m.group(1)) * 1000));
            }
            return new ErroHttp(status, "HTTP " + status, null, esperar);
        }

        /** Quanto a API pediu para esperar antes de tentar de novo, ou null. */
        public Duration esperar() {
            return esperar;
        }

        public int status() {
            return status;
        }
    }
}
