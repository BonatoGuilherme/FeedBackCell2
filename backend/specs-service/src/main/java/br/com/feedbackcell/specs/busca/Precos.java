package br.com.feedbackcell.specs.busca;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Preço de lançamento do texto da MobileAPI (GET /devices/{id}/misc/, estilo GSMArena, ex.:
 * "About 800 EUR", "$ 799.99 / € 899.99 / ₹ 79,900", "Rs. 21,999", "€ 1.099,00").
 *
 * <p>Escolhe a moeda na ordem USD &gt; EUR &gt; GBP &gt; INR e converte para reais pela cotação fixa da
 * configuração. Texto que não tem preço reconhecível vira {@code null}, sem erro.
 */
@ApplicationScoped
public class Precos {

    /** {@code lancamento}: valor original com o código ISO ("799,99 USD"); {@code estimado}: "R$ 4.960". */
    public record Preco(String lancamento, String estimado) {
    }

    /** Valor numérico e moeda (ISO) de um trecho do texto. */
    record Achado(String moeda, BigDecimal valor) {
    }

    /** Número com separadores de milhar e/ou decimal, ex.: 800, 799.99, 79,900, 1.099,00. */
    private static final String VALOR = "\\d+(?:[.,]\\d+)*";
    private static final String SIMBOLO = "US\\$|\\$|€|£|₹|Rs\\.?|INR|USD|EUR|GBP";
    /** "$ 799.99", "€1,099.00", "Rs. 21,999". */
    private static final Pattern SIMBOLO_ANTES = Pattern.compile("(" + SIMBOLO + ")\\s*(" + VALOR + ")");
    /** "800 EUR", "150 USD". */
    private static final Pattern CODIGO_DEPOIS = Pattern.compile("(" + VALOR + ")\\s*(" + SIMBOLO + ")");
    private static final List<String> PREFERENCIA = List.of("USD", "EUR", "GBP", "INR");
    private static final Map<String, String> MOEDA_DO_SIMBOLO = Map.ofEntries(
            Map.entry("$", "USD"), Map.entry("US$", "USD"), Map.entry("USD", "USD"),
            Map.entry("€", "EUR"), Map.entry("EUR", "EUR"),
            Map.entry("£", "GBP"), Map.entry("GBP", "GBP"),
            Map.entry("₹", "INR"), Map.entry("Rs", "INR"), Map.entry("Rs.", "INR"), Map.entry("INR", "INR"));
    /** Acima disso o texto não é um preço de celular (provável erro de leitura). */
    private static final BigDecimal TETO = new BigDecimal("10000000");
    private final Map<String, BigDecimal> cotacoes;

    @Inject
    public Precos(@ConfigProperty(name = "cotacao.usd-brl") BigDecimal usdBrl,
                  @ConfigProperty(name = "cotacao.eur-brl") BigDecimal eurBrl,
                  @ConfigProperty(name = "cotacao.gbp-brl") BigDecimal gbpBrl,
                  @ConfigProperty(name = "cotacao.inr-brl") BigDecimal inrBrl) {
        this.cotacoes = Map.of("USD", usdBrl, "EUR", eurBrl, "GBP", gbpBrl, "INR", inrBrl);
    }

    /** Cotações do application.properties (sem CDI: testes e construtores de conveniência). */
    public static Precos comCotacoesPadrao() {
        return new Precos(new BigDecimal("5.40"), new BigDecimal("6.20"), new BigDecimal("7.20"),
                new BigDecimal("0.065"));
    }

    private static DecimalFormatSymbols pontoDeMilhar() {
        DecimalFormatSymbols s = new DecimalFormatSymbols(Locale.ROOT);
        s.setGroupingSeparator('.');
        return s;
    }

    /** Preço do JSON do /misc (primeira chave com "price" cujo valor é texto), ou null. */
    public Preco deMisc(JsonNode misc) {
        String texto = textoDePreco(misc, 0);
        return texto == null ? null : converter(texto);
    }

    /** Primeira chave com "price" (em qualquer nível, na ordem do documento) cujo valor é texto. */
    static String textoDePreco(JsonNode no, int profundidade) {
        if (no == null || profundidade > 8) return null;
        if (no.isArray()) {
            for (JsonNode filho : no) {
                String t = textoDePreco(filho, profundidade + 1);
                if (t != null) return t;
            }
            return null;
        }
        if (!no.isObject()) return null;
        var campos = no.fields();
        while (campos.hasNext()) {
            Map.Entry<String, JsonNode> campo = campos.next();
            JsonNode valor = campo.getValue();
            if (campo.getKey().toLowerCase(Locale.ROOT).contains("price") && valor.isTextual()
                    && !valor.textValue().isBlank()) {
                return valor.textValue();
            }
            String t = textoDePreco(valor, profundidade + 1);
            if (t != null) return t;
        }
        return null;
    }

    /** Converte o texto do preço; null se não houver moeda e valor reconhecíveis. */
    public Preco converter(String texto) {
        if (texto == null) return null;
        List<Achado> achados = new ArrayList<>();
        Matcher m = SIMBOLO_ANTES.matcher(texto);
        while (m.find()) adicionar(achados, MOEDA_DO_SIMBOLO.get(m.group(1)), m.group(2));
        m = CODIGO_DEPOIS.matcher(texto);
        while (m.find()) adicionar(achados, MOEDA_DO_SIMBOLO.get(m.group(2)), m.group(1));
        for (String moeda : PREFERENCIA) {
            for (Achado a : achados) {
                if (a.moeda().equals(moeda)) return formatar(a);
            }
        }
        return null;
    }

    private static void adicionar(List<Achado> achados, String moeda, String valor) {
        if (moeda == null) return;
        BigDecimal v = valor(valor);
        if (v != null) achados.add(new Achado(moeda, v));
    }

    /**
     * "799.99" e "1,099.00" (ponto e vírgula juntos: o último é o decimal), "79,900" e "1.099" (um
     * separador seguido de 3 dígitos é milhar), "799,99" (2 dígitos é decimal). Null se fora da faixa.
     */
    static BigDecimal valor(String texto) {
        boolean virgula = texto.indexOf(',') >= 0;
        boolean ponto = texto.indexOf('.') >= 0;
        String limpo;
        if (virgula && ponto) {
            char decimal = texto.lastIndexOf(',') > texto.lastIndexOf('.') ? ',' : '.';
            char milhar = decimal == ',' ? '.' : ',';
            limpo = texto.replace(String.valueOf(milhar), "").replace(decimal, '.');
        } else if (virgula || ponto) {
            char sep = virgula ? ',' : '.';
            long ocorrencias = texto.chars().filter(c -> c == sep).count();
            int depois = texto.length() - texto.lastIndexOf(sep) - 1;
            limpo = ocorrencias > 1 || depois == 3
                    ? texto.replace(String.valueOf(sep), "")
                    : texto.replace(sep, '.');
        } else {
            limpo = texto;
        }
        try {
            BigDecimal v = new BigDecimal(limpo);
            return v.signum() > 0 && v.compareTo(TETO) < 0 ? v : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Preco formatar(Achado a) {
        BigDecimal limpo = a.valor().stripTrailingZeros();
        String numero = limpo.scale() > 0 ? limpo.toPlainString().replace('.', ',') : limpo.toPlainString();
        BigDecimal reais = a.valor().multiply(cotacoes.get(a.moeda())).setScale(0, RoundingMode.HALF_UP);
        // "4.960": milhar com ponto, sem casas decimais (pt-BR, independente da JVM); instância nova: DecimalFormat não é thread-safe
        String estimado = new DecimalFormat("#,##0", pontoDeMilhar()).format(reais);
        return new Preco(numero + " " + a.moeda(), "R$ " + estimado);
    }
}
