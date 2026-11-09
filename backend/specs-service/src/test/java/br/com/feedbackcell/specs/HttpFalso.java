package br.com.feedbackcell.specs;

import br.com.feedbackcell.specs.http.ClienteHttp;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Function;

/** Substitui a rede nos testes, como o mockFetch dos testes Node. */
public class HttpFalso implements ClienteHttp {

    public record Chamada(String url, Map<String, String> headers) {
        public String host() {
            return URI.create(url).getHost();
        }

        public String param(String nome) {
            return params(url).get(nome);
        }
    }

    /** Resposta falsa: corpo JSON ou status de erro. */
    public record Resposta(String json, int status) {
        public static Resposta ok(String json) {
            return new Resposta(json, 200);
        }

        public static Resposta erro(int status) {
            return new Resposta("{}", status);
        }
    }

    private static final ObjectMapper JSON = new ObjectMapper();

    public final List<Chamada> chamadas = new CopyOnWriteArrayList<>();
    private volatile Function<Chamada, Resposta> handler = c -> Resposta.ok("{}");

    public void responder(Function<Chamada, Resposta> handler) {
        this.handler = handler;
        chamadas.clear();
    }

    public static Map<String, String> params(String url) {
        Map<String, String> m = new HashMap<>();
        String q = URI.create(url).getRawQuery();
        if (q == null) return m;
        for (String par : q.split("&")) {
            String[] kv = par.split("=", 2);
            m.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8),
                    kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "");
        }
        return m;
    }

    @Override
    public JsonNode buscarJson(String url, Map<String, String> headers, Duration timeout) throws ErroHttp {
        Chamada c = new Chamada(url, headers);
        chamadas.add(c);
        Resposta r = handler.apply(c);
        if (r.status() < 200 || r.status() > 299) throw ErroHttp.deStatus(r.status());
        try {
            return JSON.readTree(r.json());
        } catch (java.io.IOException e) {
            throw new ErroHttp(0, "JSON inválido", e);
        }
    }
}
