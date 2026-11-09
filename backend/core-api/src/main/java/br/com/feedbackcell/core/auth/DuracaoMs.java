package br.com.feedbackcell.core.auth;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converte durações no formato da biblioteca {@code ms} (usada pelo jsonwebtoken do Node)
 * em milissegundos: "24h", "30m", "7d", "1.5h", "2 days". Número sem unidade = milissegundos,
 * exatamente como {@code expiresIn: "3600"} no Node.
 */
public final class DuracaoMs {

    private static final Pattern FORMATO = Pattern.compile(
            "^(-?(?:\\d+)?\\.?\\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$",
            Pattern.CASE_INSENSITIVE);

    private static final double S = 1000;
    private static final double M = S * 60;
    private static final double H = M * 60;
    private static final double D = H * 24;
    private static final double W = D * 7;
    private static final double Y = D * 365.25;

    private DuracaoMs() {
    }

    /** Milissegundos, ou null se o texto não for uma duração válida. */
    public static Double parse(String texto) {
        if (texto == null || texto.isEmpty() || texto.length() > 100) return null;
        Matcher m = FORMATO.matcher(texto);
        if (!m.matches()) return null;
        double n = Double.parseDouble(m.group(1));
        String unidade = m.group(2) == null ? "ms" : m.group(2).toLowerCase(Locale.ROOT);
        return switch (unidade) {
            case "years", "year", "yrs", "yr", "y" -> n * Y;
            case "weeks", "week", "w" -> n * W;
            case "days", "day", "d" -> n * D;
            case "hours", "hour", "hrs", "hr", "h" -> n * H;
            case "minutes", "minute", "mins", "min", "m" -> n * M;
            case "seconds", "second", "secs", "sec", "s" -> n * S;
            default -> n;
        };
    }
}
