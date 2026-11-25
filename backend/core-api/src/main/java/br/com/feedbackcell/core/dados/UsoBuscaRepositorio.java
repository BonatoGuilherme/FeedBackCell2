package br.com.feedbackcell.core.dados;

import java.time.LocalDate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Buscas de especificações (que gastaram crédito da MobileAPI) por usuário e por dia. */
@Repository
public class UsoBuscaRepositorio {

    private final JdbcTemplate db;

    public UsoBuscaRepositorio(JdbcTemplate db) {
        this.db = db;
    }

    public int buscasNoDia(long idusuario, LocalDate dia) {
        Integer n = db.query("SELECT buscas FROM UsoBuscaEspecificacoes WHERE idusuario = ? AND dia = ?",
                rs -> rs.next() ? rs.getInt(1) : 0, idusuario, java.sql.Date.valueOf(dia));
        return n == null ? 0 : n;
    }

    /** Soma 1 busca no dia (cria a linha se for a primeira). */
    public void registrar(long idusuario, LocalDate dia) {
        db.update("INSERT INTO UsoBuscaEspecificacoes (idusuario, dia, buscas) VALUES (?, ?, 1) "
                + "ON DUPLICATE KEY UPDATE buscas = buscas + 1", idusuario, java.sql.Date.valueOf(dia));
    }
}
