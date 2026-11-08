package br.com.feedbackcell.specs.http;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/** Implementação com o HttpClient do JDK; o timeout cobre a requisição inteira (como AbortSignal.timeout). */
@ApplicationScoped
public class ClienteHttpJdk implements ClienteHttp {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final HttpClient client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    @Override
    public JsonNode buscarJson(String url, Map<String, String> headers, Duration timeout) throws ErroHttp {
        HttpRequest.Builder req = HttpRequest.newBuilder(URI.create(url)).GET().timeout(timeout)
                .header("Accept", "application/json");
        headers.forEach(req::setHeader);

        CompletableFuture<HttpResponse<String>> futuro = client.sendAsync(req.build(), HttpResponse.BodyHandlers.ofString());
        HttpResponse<String> resposta;
        try {
            resposta = futuro.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            futuro.cancel(true);
            throw new ErroHttp(0, "The operation was aborted due to timeout", e);
        } catch (InterruptedException e) {
            futuro.cancel(true);
            Thread.currentThread().interrupt();
            throw new ErroHttp(0, "Interrompido", e);
        } catch (ExecutionException e) {
            Throwable causa = e.getCause() == null ? e : e.getCause();
            throw new ErroHttp(0, "fetch failed: " + causa.getMessage(), causa);
        }

        if (resposta.statusCode() < 200 || resposta.statusCode() > 299) {
            throw ErroHttp.deStatus(resposta.statusCode());
        }
        try {
            String corpo = resposta.body();
            if (corpo == null || corpo.isBlank()) throw new ErroHttp(0, "Unexpected end of JSON input", null);
            return JSON.readTree(corpo);
        } catch (java.io.IOException e) {
            throw new ErroHttp(0, "JSON inválido: " + e.getMessage(), e);
        }
    }
}
