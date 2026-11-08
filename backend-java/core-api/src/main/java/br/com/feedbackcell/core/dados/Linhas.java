package br.com.feedbackcell.core.dados;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Conversões de colunas para o mesmo JSON que o mysql2 + JSON.stringify geram no Node. */
public final class Linhas {

    private static final DateTimeFormatter ISO_JS =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    private Linhas() {
    }

    /** TIMESTAMP -> "2026-11-08T19:00:00.000Z" (Date.toJSON). */
    public static String data(ResultSet rs, String coluna) throws SQLException {
        Timestamp t = rs.getTimestamp(coluna);
        return t == null ? null : ISO_JS.format(t.toInstant());
    }

    /** DECIMAL chega como texto no mysql2 ("1999.90"). */
    public static String decimal(ResultSet rs, String coluna) throws SQLException {
        BigDecimal d = rs.getBigDecimal(coluna);
        return d == null ? null : d.toPlainString();
    }

    public static Integer inteiro(ResultSet rs, String coluna) throws SQLException {
        int v = rs.getInt(coluna);
        return rs.wasNull() ? null : v;
    }

    /** Coluna JSON chega já como objeto no mysql2. */
    public static JsonNode json(ObjectMapper json, ResultSet rs, String coluna) throws SQLException {
        String s = rs.getString(coluna);
        if (s == null) return null;
        try {
            return json.readTree(s);
        } catch (RuntimeException e) {
            return null;
        }
    }
}
