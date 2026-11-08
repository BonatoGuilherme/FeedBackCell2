package br.com.feedbackcell.core.web;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Interrompe a requisição com um status e um corpo JSON exatos (normalmente {@code {erro}}),
 * como os {@code return res.status(x).json(...)} dos controllers Node.
 */
public class ErroApi extends RuntimeException {

    private final int status;
    private final transient Map<String, Object> corpo;

    public ErroApi(int status, Map<String, Object> corpo) {
        super(String.valueOf(corpo.get("erro")), null, false, false);
        this.status = status;
        this.corpo = corpo;
    }

    public static ErroApi de(int status, String erro) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("erro", erro);
        return new ErroApi(status, corpo);
    }

    /** Formato do errorHandler do Node: {@code {erro, status}}. */
    public static ErroApi comStatus(int status, String erro) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("erro", erro);
        corpo.put("status", status);
        return new ErroApi(status, corpo);
    }

    public int status() {
        return status;
    }

    public Map<String, Object> corpo() {
        return corpo;
    }
}
