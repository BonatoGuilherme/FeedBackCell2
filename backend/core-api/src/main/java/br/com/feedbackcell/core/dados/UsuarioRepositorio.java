package br.com.feedbackcell.core.dados;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** authModel + usuarioModel do Node; chaves JSON com a capitalização das colunas (Nome, Email). */
@Repository
public class UsuarioRepositorio {

    public record Credenciais(long idusuario, String nome, String email, String senha) {
    }

    private static final RowMapper<Map<String, Object>> PERFIL = (rs, i) -> {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("idusuario", rs.getLong("idusuario"));
        m.put("Nome", rs.getString("Nome"));
        m.put("Email", rs.getString("Email"));
        m.put("dataCriacao", Linhas.data(rs, "dataCriacao"));
        return m;
    };

    private final JdbcTemplate db;

    public UsuarioRepositorio(JdbcTemplate db) {
        this.db = db;
    }

    public Credenciais porEmail(String email) {
        List<Credenciais> r = db.query("SELECT idusuario, Nome, Email, Senha FROM Usuarios WHERE Email = ?",
                (rs, i) -> new Credenciais(rs.getLong("idusuario"), rs.getString("Nome"),
                        rs.getString("Email"), rs.getString("Senha")),
                email);
        return r.isEmpty() ? null : r.get(0);
    }

    /** {idusuario, Nome, Email} (usado pelo /auth/verify). */
    public Map<String, Object> resumo(long id) {
        List<Map<String, Object>> r = db.query("SELECT idusuario, Nome, Email FROM Usuarios WHERE idusuario = ?",
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("idusuario", rs.getLong("idusuario"));
                    m.put("Nome", rs.getString("Nome"));
                    m.put("Email", rs.getString("Email"));
                    return m;
                }, id);
        return r.isEmpty() ? null : r.get(0);
    }

    public boolean emailExiste(String email) {
        return !db.queryForList("SELECT idusuario FROM Usuarios WHERE Email = ?", Long.class, email).isEmpty();
    }

    public long criar(String nome, String email, String senhaHash) {
        GeneratedKeyHolder chave = new GeneratedKeyHolder();
        db.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO Usuarios (Nome, Email, Senha) VALUES (?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, nome);
            ps.setString(2, email);
            ps.setString(3, senhaHash);
            return ps;
        }, chave);
        return chave.getKey().longValue();
    }

    public Map<String, Object> perfil(long id) {
        List<Map<String, Object>> r = db.query(
                "SELECT idusuario, Nome, Email, dataCriacao FROM Usuarios WHERE idusuario = ?", PERFIL, id);
        return r.isEmpty() ? null : r.get(0);
    }

    public String hashSenha(long id) {
        List<String> r = db.queryForList("SELECT Senha FROM Usuarios WHERE idusuario = ?", String.class, id);
        return r.isEmpty() || r.get(0) == null || r.get(0).isEmpty() ? null : r.get(0);
    }

    public void atualizarPerfil(long id, String nome, String email) {
        db.update("UPDATE Usuarios SET Nome = ?, Email = ? WHERE idusuario = ?", nome, email, id);
    }

    public void atualizarSenha(long id, String hash) {
        db.update("UPDATE Usuarios SET Senha = ? WHERE idusuario = ?", hash, id);
    }

    public void excluir(long id) {
        db.update("DELETE FROM Usuarios WHERE idusuario = ?", id);
    }

    public List<Map<String, Object>> listar(int limit, long offset) {
        return db.query("SELECT idusuario, Nome, Email, dataCriacao FROM Usuarios LIMIT ? OFFSET ?",
                PERFIL, limit, offset);
    }

    public long contar() {
        return db.queryForObject("SELECT COUNT(*) FROM Usuarios", Long.class);
    }
}
