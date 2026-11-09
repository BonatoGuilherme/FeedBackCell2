package br.com.feedbackcell.core.web;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Equivalente ao errorHandler central do Node. */
@RestControllerAdvice
public class TratadorErros {

    private static final Logger LOG = LoggerFactory.getLogger(TratadorErros.class);

    @ExceptionHandler(ErroApi.class)
    public ResponseEntity<Map<String, Object>> erroApi(ErroApi e) {
        return ResponseEntity.status(e.status()).body(e.corpo());
    }

    /** O Express responde 404 para rota ou método inexistente. */
    @ExceptionHandler({NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class})
    public ResponseEntity<Map<String, Object>> naoEncontrado(Exception e) {
        ErroApi erro = ErroApi.comStatus(404, "Recurso não encontrado");
        return ResponseEntity.status(404).body(erro.corpo());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> inesperado(Exception e) {
        LOG.error("Erro:", e);
        ErroApi erro = ErroApi.comStatus(500, "Erro interno do servidor");
        return ResponseEntity.status(500).body(erro.corpo());
    }
}
