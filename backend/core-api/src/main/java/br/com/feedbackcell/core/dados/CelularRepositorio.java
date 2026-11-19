package br.com.feedbackcell.core.dados;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.util.RawValue;

/** celularModel do Node. */
@Repository
public class CelularRepositorio {

    /**
     * Celular com a média das notas e a quantidade de notas. A subconsulta agrega os comentários com nota
     * de uma vez (sem N+1); sem nenhuma nota o LEFT JOIN deixa notaMedia NULL e avaliacoes 0.
     */
    private static final String COLUNAS = """
            SELECT c.idcelular, c.idusuario, c.Marca AS marca, c.Modelo AS modelo,
                   c.Imagem AS imagem, c.Descricao AS descricao,
                   c.Especificacoes AS especificacoes, c.Modelo3d AS modelo3d,
                   c.`Like` AS likes, c.Deslike AS dislikes, c.dataCriacao,
                   a.notaMedia, COALESCE(a.avaliacoes, 0) AS avaliacoes
            FROM Celulares c
            LEFT JOIN (
                SELECT idcelular, ROUND(AVG(Nota), 1) AS notaMedia, COUNT(Nota) AS avaliacoes
                FROM Comentarios
                GROUP BY idcelular
            ) a ON a.idcelular = c.idcelular
            """;

    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final RowMapper<Map<String, Object>> linha;
    /** Listagens: o JSON de especificações vai como veio do MySQL, sem parse + reserialização. */
    private final RowMapper<Map<String, Object>> linhaLista;

    public CelularRepositorio(JdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
        this.linha = mapeador(rs -> Linhas.json(json, rs, "especificacoes"));
        this.linhaLista = mapeador(rs -> {
            String s = rs.getString("especificacoes");
            return s == null ? null : new RawValue(s);
        });
    }

    private interface Coluna {
        Object ler(ResultSet rs) throws SQLException;
    }

    private static RowMapper<Map<String, Object>> mapeador(Coluna especificacoes) {
        return (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idcelular", rs.getLong("idcelular"));
            m.put("idusuario", rs.getLong("idusuario"));
            m.put("marca", rs.getString("marca"));
            m.put("modelo", rs.getString("modelo"));
            m.put("imagem", rs.getString("imagem"));
            m.put("descricao", rs.getString("descricao"));
            m.put("especificacoes", especificacoes.ler(rs));
            m.put("modelo3d", rs.getString("modelo3d"));
            m.put("likes", Linhas.inteiro(rs, "likes"));
            m.put("dislikes", Linhas.inteiro(rs, "dislikes"));
            m.put("dataCriacao", Linhas.data(rs, "dataCriacao"));
            m.put("notaMedia", notaMedia(rs));
            m.put("avaliacoes", Linhas.inteiro(rs, "avaliacoes"));
            return m;
        };
    }

    /** AVG já vem com 1 casa decimal (ROUND); sai como número JSON (4.3), ou null sem notas. */
    private static Double notaMedia(ResultSet rs) throws SQLException {
        BigDecimal m = rs.getBigDecimal("notaMedia");
        return m == null ? null : m.doubleValue();
    }

    public List<Map<String, Object>> listar(int limit, long offset) {
        return db.query(COLUNAS + " ORDER BY c.dataCriacao DESC, c.idcelular DESC LIMIT ? OFFSET ?", linhaLista, limit, offset);
    }

    public long contar() {
        return db.queryForObject("SELECT COUNT(*) FROM Celulares", Long.class);
    }

    public Map<String, Object> porId(long id) {
        List<Map<String, Object>> r = db.query(COLUNAS + " WHERE c.idcelular = ?", linha, id);
        return r.isEmpty() ? null : r.get(0);
    }

    /** Dono do celular, ou null se ele não existe (sem ler as colunas pesadas). */
    public Long idDono(long id) {
        List<Long> r = db.queryForList("SELECT idusuario FROM Celulares WHERE idcelular = ?", Long.class, id);
        return r.isEmpty() ? null : r.get(0);
    }

    public List<Map<String, Object>> doUsuario(long idusuario) {
        return db.query(COLUNAS + " WHERE c.idusuario = ? ORDER BY c.dataCriacao DESC, c.idcelular DESC", linhaLista, idusuario);
    }

    public long criar(String marca, String modelo, String descricao, long idusuario,
                      JsonNode especificacoes, String modelo3d) {
        GeneratedKeyHolder chave = new GeneratedKeyHolder();
        db.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO Celulares
                      (Marca, Modelo, Descricao, Especificacoes, Modelo3d, idusuario, dataCriacao)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())""", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, marca);
            ps.setString(2, modelo);
            ps.setString(3, descricao);
            ps.setString(4, jsonOuNull(especificacoes));
            ps.setString(5, modelo3d);
            ps.setLong(6, idusuario);
            return ps;
        }, chave);
        return chave.getKey().longValue();
    }

    public void atualizar(long id, String marca, String modelo, String descricao,
                          JsonNode especificacoes, String modelo3d) {
        db.update("""
                UPDATE Celulares
                SET Marca = ?, Modelo = ?, Descricao = ?, Especificacoes = ?, Modelo3d = ?
                WHERE idcelular = ?""",
                marca, modelo, descricao, jsonOuNull(especificacoes), modelo3d, id);
    }

    /**
     * Resultado da busca assíncrona (specs-service): grava só colunas que ainda estão NULL, para não
     * sobrescrever o que a pessoa escolheu. Devolve false se o celular não existe mais.
     */
    public boolean preencherSeVazio(long id, JsonNode especificacoes, String modelo3d) {
        int linhas = db.update("""
                UPDATE Celulares
                SET Especificacoes = COALESCE(Especificacoes, ?), Modelo3d = COALESCE(Modelo3d, ?)
                WHERE idcelular = ?""",
                ps -> {
                    String spec = jsonOuNull(especificacoes);
                    if (spec == null) ps.setNull(1, Types.VARCHAR);
                    else ps.setString(1, spec);
                    if (modelo3d == null) ps.setNull(2, Types.VARCHAR);
                    else ps.setString(2, modelo3d);
                    ps.setLong(3, id);
                });
        return linhas > 0;
    }

    public void excluir(long id) {
        db.update("DELETE FROM Celulares WHERE idcelular = ?", id);
    }

    /** {@code especificacoes ? JSON.stringify(especificacoes) : null}. */
    private String jsonOuNull(JsonNode especificacoes) {
        return especificacoes == null || especificacoes.isNull() ? null : json.writeValueAsString(especificacoes);
    }
}
