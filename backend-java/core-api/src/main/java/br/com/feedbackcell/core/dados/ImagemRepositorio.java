package br.com.feedbackcell.core.dados;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** celularImagemModel do Node: fotos guardadas como MEDIUMBLOB em CelularImagens. */
@Repository
public class ImagemRepositorio {

    public record Foto(long idimagem, long idcelular, String mime, byte[] dados) {
    }

    private final JdbcTemplate db;
    private final NamedParameterJdbcTemplate nomeado;

    public ImagemRepositorio(JdbcTemplate db) {
        this.db = db;
        this.nomeado = new NamedParameterJdbcTemplate(db);
    }

    public int contar(long idcelular) {
        return db.queryForObject("SELECT COUNT(*) FROM CelularImagens WHERE idcelular = ?", Integer.class, idcelular);
    }

    public List<Map<String, Object>> listar(long idcelular) {
        return db.query("""
                SELECT idimagem, mime, tamanho, ordem
                FROM CelularImagens
                WHERE idcelular = ?
                ORDER BY ordem, idimagem""", (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("idimagem", rs.getLong("idimagem"));
            m.put("mime", rs.getString("mime"));
            m.put("tamanho", rs.getInt("tamanho"));
            m.put("ordem", rs.getInt("ordem"));
            return m;
        }, idcelular);
    }

    /** Ids das fotos de vários celulares de uma vez (para as listagens). */
    public Map<Long, List<Long>> idsPorCelulares(List<Long> ids) {
        Map<Long, List<Long>> mapa = new LinkedHashMap<>();
        if (ids.isEmpty()) return mapa;
        nomeado.query("""
                SELECT idcelular, idimagem
                FROM CelularImagens
                WHERE idcelular IN (:ids)
                ORDER BY idcelular, ordem, idimagem""", Map.of("ids", ids), rs -> {
            mapa.computeIfAbsent(rs.getLong("idcelular"), k -> new ArrayList<>()).add(rs.getLong("idimagem"));
        });
        return mapa;
    }

    public Foto porId(long idimagem) {
        List<Foto> r = db.query("SELECT idimagem, idcelular, mime, dados FROM CelularImagens WHERE idimagem = ?",
                (rs, i) -> new Foto(rs.getLong("idimagem"), rs.getLong("idcelular"),
                        rs.getString("mime"), rs.getBytes("dados")),
                idimagem);
        return r.isEmpty() ? null : r.get(0);
    }

    public long criar(long idcelular, String mime, byte[] dados, int ordem) {
        GeneratedKeyHolder chave = new GeneratedKeyHolder();
        db.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO CelularImagens (idcelular, mime, tamanho, dados, ordem)
                    VALUES (?, ?, ?, ?, ?)""", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, idcelular);
            ps.setString(2, mime);
            ps.setInt(3, dados.length);
            ps.setBytes(4, dados);
            ps.setInt(5, ordem);
            return ps;
        }, chave);
        return chave.getKey().longValue();
    }

    public boolean excluir(long idimagem, long idcelular) {
        return db.update("DELETE FROM CelularImagens WHERE idimagem = ? AND idcelular = ?", idimagem, idcelular) > 0;
    }
}
