package br.com.feedbackcell.core.web;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.JsonNodeFactory;

/**
 * Lê o corpo JSON como o express.json(): só {@code application/json}, até 100 KB,
 * topo precisa ser objeto ou array. Sem corpo JSON devolve objeto vazio (as validações
 * respondem "is required" em vez de quebrar).
 */
@Component
public class CorpoJson {

    static final int LIMITE_BYTES = 100 * 1024;

    private final ObjectMapper json;

    public CorpoJson(ObjectMapper json) {
        this.json = json;
    }

    public JsonNode ler(HttpServletRequest req) {
        String tipo = req.getContentType();
        if (tipo == null || !tipo.toLowerCase(Locale.ROOT).split(";")[0].trim().equals("application/json")) {
            return JsonNodeFactory.instance.objectNode();
        }
        if (req.getContentLengthLong() > LIMITE_BYTES) {
            throw ErroApi.comStatus(413, "request entity too large");
        }
        byte[] bytes;
        try (InputStream in = req.getInputStream()) {
            bytes = in.readNBytes(LIMITE_BYTES + 1);
        } catch (IOException e) {
            throw ErroApi.comStatus(400, "Corpo da requisição inválido");
        }
        if (bytes.length > LIMITE_BYTES) throw ErroApi.comStatus(413, "request entity too large");
        if (bytes.length == 0) return JsonNodeFactory.instance.objectNode();
        JsonNode no;
        try {
            no = json.readTree(bytes);
        } catch (JacksonException e) {
            throw ErroApi.comStatus(400, "JSON inválido no corpo da requisição");
        }
        if (no == null || !(no.isObject() || no.isArray())) {
            throw ErroApi.comStatus(400, "JSON inválido no corpo da requisição");
        }
        return no;
    }
}
