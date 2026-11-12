package br.com.feedbackcell.core.web;

import br.com.feedbackcell.core.limite.ArmazemLimite;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** /health (vivo) e /readyz (MySQL e contador do rate limit prontos). */
@RestController
public class SaudeController {

    private static final Logger LOG = LoggerFactory.getLogger(SaudeController.class);

    private final JdbcTemplate db;
    private final ArmazemLimite armazem;

    public SaudeController(JdbcTemplate db, ArmazemLimite armazem) {
        this.db = db;
        this.armazem = armazem;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/readyz")
    public ResponseEntity<Map<String, String>> readyz() {
        try {
            if (!armazem.pronto()) return ResponseEntity.status(503).body(Map.of("status", "unavailable"));
            db.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("status", "ready"));
        } catch (RuntimeException e) {
            LOG.error("Verificação de prontidão falhou: {}", e.toString());
            return ResponseEntity.status(503).body(Map.of("status", "unavailable"));
        }
    }
}
