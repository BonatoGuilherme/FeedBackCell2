package br.com.feedbackcell.core.dados;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** comentarioModel do Node. */
@Repository
public class ComentarioRepositorio {

    public record Dono(long idcomentario, long idusuario, long idcelular) {
    }

    private final JdbcTemplate db;

    public ComentarioRepositorio(JdbcTemplate db) {
        this.db = db;
    }

    public List<Map<String, Object>> doCelular(long idcelular, int limit, long offset) {
        return db.query("""
                SELECT c.idcomentario, c.texto, c.dataCriacao, u.idusuario, u.Nome
                FROM Comentarios c
                JOIN Usuarios u ON c.idusuario = u.idusuario
                WHERE c.idcelular = ?
                ORDER BY c.dataCriacao DESC, c.idcomentario DESC
                LIMIT ? OFFSET ?""", (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idcomentario", rs.getLong("idcomentario"));
            m.put("texto", rs.getString("texto"));
            m.put("dataCriacao", Linhas.data(rs, "dataCriacao"));
            m.put("idusuario", rs.getLong("idusuario"));
            m.put("Nome", rs.getString("Nome"));
            return m;
        }, idcelular, limit, offset);
    }

    public long contarDoCelular(long idcelular) {
        return db.queryForObject("SELECT COUNT(*) FROM Comentarios WHERE idcelular = ?", Long.class, idcelular);
    }

    public long criar(long idcelular, long idusuario, String texto) {
        GeneratedKeyHolder chave = new GeneratedKeyHolder();
        db.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO Comentarios (idcelular, idusuario, texto, dataCriacao) VALUES (?, ?, ?, NOW())",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, idcelular);
            ps.setLong(2, idusuario);
            ps.setString(3, texto);
            return ps;
        }, chave);
        return chave.getKey().longValue();
    }

    public Dono porId(long id) {
        List<Dono> r = db.query("SELECT idcomentario, idusuario, idcelular FROM Comentarios WHERE idcomentario = ?",
                (rs, i) -> new Dono(rs.getLong("idcomentario"), rs.getLong("idusuario"), rs.getLong("idcelular")), id);
        return r.isEmpty() ? null : r.get(0);
    }

    public void excluir(long id) {
        db.update("DELETE FROM Comentarios WHERE idcomentario = ?", id);
    }

    /** {@code SELECT *} do Node: colunas na ordem da tabela. */
    public List<Map<String, Object>> doUsuario(long idusuario) {
        return db.query("""
                SELECT idcomentario, idusuario, idcelular, texto, dataCriacao
                FROM Comentarios
                WHERE idusuario = ?
                ORDER BY dataCriacao DESC, idcomentario DESC""", (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idcomentario", rs.getLong("idcomentario"));
            m.put("idusuario", rs.getLong("idusuario"));
            m.put("idcelular", rs.getLong("idcelular"));
            m.put("texto", rs.getString("texto"));
            m.put("dataCriacao", Linhas.data(rs, "dataCriacao"));
            return m;
        }, idusuario);
    }
}
