package br.com.feedbackcell.core.web;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.regex.Pattern;

/** Paginação e ids de rota com as mesmas regras do Node (utils/pagination.js e parseId). */
public final class Parametros {

    public static final int MAX_PAGE_SIZE = 100;
    public static final String ERRO_PAGINACAO =
            "Página e limite devem ser inteiros positivos; limite máximo: " + MAX_PAGE_SIZE;

    private static final long MAX_SAFE = 9_007_199_254_740_991L;
    private static final Pattern INTEIRO_POSITIVO = Pattern.compile("^[1-9]\\d*$");
    private static final Pattern NUMERO_JS = Pattern.compile("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$");
    private static final Pattern ID_FOTO = Pattern.compile("^[1-9]\\d{0,9}$");

    public record Paginacao(int page, int limit) {
        public long offset() {
            return (long) (page - 1) * limit;
        }
    }

    private Parametros() {
    }

    /** Paginação de ?page=&limit= ou null se inválida (inclusive parâmetro repetido). */
    public static Paginacao paginacao(HttpServletRequest req) {
        Long page = inteiroPositivo(req.getParameterValues("page"), 1);
        Long limit = inteiroPositivo(req.getParameterValues("limit"), 10);
        if (page == null || limit == null || limit > MAX_PAGE_SIZE || page > MAX_SAFE / limit + 1) return null;
        if (page > Integer.MAX_VALUE) return null;
        return new Paginacao(page.intValue(), limit.intValue());
    }

    private static Long inteiroPositivo(String[] valores, long padrao) {
        if (valores == null) return padrao;
        if (valores.length != 1 || !INTEIRO_POSITIVO.matcher(valores[0]).matches() || valores[0].length() > 16) {
            return null;
        }
        long v = Long.parseLong(valores[0]);
        return v <= MAX_SAFE ? v : null;
    }

    /**
     * {@code Number(value)} do JavaScript seguido de "inteiro seguro e positivo"
     * (parseId dos comentários). Devolve null se não for.
     */
    public static Long idJs(String valor) {
        BigDecimal n = numeroJs(valor);
        if (n == null || n.signum() <= 0) return null;
        try {
            long v = n.longValueExact();
            return v <= MAX_SAFE ? v : null;
        } catch (ArithmeticException e) {
            return null;
        }
    }

    /** {@code Number(texto)} do JavaScript (decimal, expoente, 0x/0o/0b; vazio = 0); null = NaN. */
    public static BigDecimal numeroJs(String valor) {
        if (valor == null) return null;
        String s = valor.strip();
        if (s.isEmpty()) return BigDecimal.ZERO;
        try {
            if (s.length() > 2 && s.charAt(0) == '0') {
                char base = Character.toLowerCase(s.charAt(1));
                int radix = base == 'x' ? 16 : base == 'o' ? 8 : base == 'b' ? 2 : 0;
                if (radix != 0) return new BigDecimal(new java.math.BigInteger(s.substring(2), radix));
            }
            if (!NUMERO_JS.matcher(s).matches() || s.length() > 400) return null;
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Id de celular nas rotas /celulares/:id: o Node só rejeita (400) o que é NaN; um número
     * não inteiro ou fora do INT simplesmente não acha nada (404). Devolve -1 nesse caso.
     */
    public static long idCelular(String valor) {
        BigDecimal n = numeroJs(valor);
        if (n == null || valor.isEmpty()) throw ErroApi.de(400, "ID inválido");
        try {
            long v = n.longValueExact();
            return v > 0 && v <= Integer.MAX_VALUE ? v : -1;
        } catch (ArithmeticException e) {
            return -1;
        }
    }

    /** Ids das rotas de fotos: /^[1-9]\d{0,9}$/. */
    public static Long idFoto(String valor) {
        return valor != null && ID_FOTO.matcher(valor).matches() ? Long.parseLong(valor) : null;
    }
}
