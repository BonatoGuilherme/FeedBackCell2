package br.com.feedbackcell.specs.busca;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Limpeza de textos das APIs externas (funções texto/limparSpec/comUnidade/imagemDataUri do Node). */
public final class Textos {

    private static final Pattern ESPACOS = Pattern.compile("(?U)\\s+");
    private static final Pattern BUY_MEMORY = Pattern.compile("(?iU)\\s*Buy memory card\\b");
    private static final Pattern ESPACO_VIRGULA = Pattern.compile("(?U)\\s+,");
    private static final Pattern NUMERO = Pattern.compile("^\\d+(\\.\\d+)?$");
    private static final Pattern DATA_URI = Pattern.compile("^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$");
    private static final Pattern BASE64 = Pattern.compile("^[A-Za-z0-9+/=\\s]+$");
    private static final Pattern TAG = Pattern.compile("<[^>]*>");
    private static final Pattern ENTIDADE = Pattern.compile("(?i)&[a-z#0-9]+;");

    private Textos() {
    }

    /** {@code texto(valor, max)}: número vira texto, array vira lista com vírgulas, string é aparada. */
    public static String texto(JsonNode valor, int max) {
        if (valor == null || valor.isNull() || valor.isMissingNode()) return null;
        if (valor.isNumber()) return numeroJs(valor);
        if (valor.isArray()) {
            List<String> partes = new ArrayList<>();
            for (JsonNode v : valor) {
                String t = texto(v, max);
                if (t != null && !t.isEmpty()) partes.add(t);
            }
            return partes.isEmpty() ? null : corta(String.join(", ", partes), max);
        }
        if (!valor.isTextual()) return null;
        return texto(valor.textValue(), max);
    }

    public static String texto(String valor, int max) {
        if (valor == null) return null;
        String limpo = ESPACOS.matcher(valor).replaceAll(" ").strip();
        return limpo.isEmpty() ? null : corta(limpo, max);
    }

    /** String(numero) do JavaScript: 4000 -> "4000", 7.5 -> "7.5". */
    static String numeroJs(JsonNode n) {
        if (n.isIntegralNumber()) return n.bigIntegerValue().toString();
        double d = n.doubleValue();
        if (!Double.isFinite(d)) return null;
        return BigDecimal.valueOf(d).stripTrailingZeros().toPlainString();
    }

    static String corta(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    /** A MobileAPI copia lixo do site de origem, ex.: "16 GBBuy memory card". */
    public static String limparSpec(String valor) {
        if (valor == null) return null;
        String s = ESPACO_VIRGULA.matcher(BUY_MEMORY.matcher(valor).replaceAll("")).replaceAll(",").strip();
        return s.isEmpty() ? null : s;
    }

    /** "168.00" -> "168 g"; mantém valores que já trazem unidade ("8.30mm"). */
    public static String comUnidade(String valor, String unidade) {
        if (valor == null || valor.isEmpty()) return null;
        if (!NUMERO.matcher(valor).matches()) return valor;
        NumberFormat f = NumberFormat.getNumberInstance(Locale.forLanguageTag("pt-BR"));
        f.setMaximumFractionDigits(3);
        f.setRoundingMode(RoundingMode.HALF_EVEN);
        return f.format(new BigDecimal(valor)) + " " + unidade;
    }

    /** Miniatura em base64 da MobileAPI como data URI, só para JPEG/PNG/WebP. */
    public static String imagemDataUri(JsonNode no) {
        if (no == null || !no.isTextual()) return null;
        String b64 = no.textValue();
        if (b64.length() < 16) return null;
        if (DATA_URI.matcher(b64).matches()) return b64;
        if (!BASE64.matcher(b64).matches()) return null;
        String limpo = b64.replaceAll("\\s+", "");
        String mime = limpo.startsWith("/9j/") ? "image/jpeg"
                : limpo.startsWith("iVBOR") ? "image/png"
                : limpo.startsWith("UklGR") ? "image/webp" : null;
        return mime == null ? null : "data:" + mime + ";base64," + limpo;
    }

    /** Texto visível de um trecho HTML (crédito do Commons). */
    public static String semHtml(String html, int max) {
        String s = TAG.matcher(html == null ? "" : html).replaceAll(" ")
                .replace("&amp;", "&").replace("&nbsp;", " ");
        s = ESPACOS.matcher(ENTIDADE.matcher(s).replaceAll("")).replaceAll(" ").strip();
        return s.isEmpty() ? null : corta(s, max);
    }
}
