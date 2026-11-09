package br.com.feedbackcell.specs.busca;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converte os textos em inglês da MobileAPI (copiados do GSMArena) para pt-BR: datas no formato
 * dd/MM/aaaa, unidades com vírgula decimal e palavras traduzidas.
 */
public final class NormalizacaoSpecs {

    private static final Map<String, Integer> MESES = Map.ofEntries(
            Map.entry("january", 1), Map.entry("february", 2), Map.entry("march", 3), Map.entry("april", 4),
            Map.entry("may", 5), Map.entry("june", 6), Map.entry("july", 7), Map.entry("august", 8),
            Map.entry("september", 9), Map.entry("october", 10), Map.entry("november", 11),
            Map.entry("december", 12), Map.entry("jan", 1), Map.entry("feb", 2), Map.entry("mar", 3),
            Map.entry("apr", 4), Map.entry("jun", 6), Map.entry("jul", 7), Map.entry("aug", 8),
            Map.entry("sep", 9), Map.entry("sept", 9), Map.entry("oct", 10), Map.entry("nov", 11),
            Map.entry("dec", 12));

    private static final Pattern ANO_MES_DIA = Pattern.compile("(\\d{4}),?\\s+([A-Za-z]+)\\.?\\s+(\\d{1,2})(?!\\d)");
    private static final Pattern MES_DIA_ANO = Pattern.compile("([A-Za-z]+)\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})");
    private static final Pattern ANO_MES = Pattern.compile("(\\d{4}),?\\s+([A-Za-z]+)");
    private static final Pattern MES_ANO = Pattern.compile("([A-Za-z]+)\\.?,?\\s+(\\d{4})");
    private static final Pattern ANO_TRIMESTRE = Pattern.compile("(\\d{4}),?\\s+Q([1-4])", Pattern.CASE_INSENSITIVE);
    private static final Pattern SO_ANO = Pattern.compile("^(\\d{4})$");
    private static final Pattern RELEASED = Pattern.compile("(?i)\\breleased\\b");
    private static final Pattern PALAVRAS_DATA = Pattern.compile(
            "(?i)\\b(available|coming soon|exp\\.? release|expected|released|announced)\\b\\.?");

    /** Número com ponto decimal seguido de unidade: só esses ganham vírgula (versões como "5.1" ficam). */
    private static final Pattern DECIMAL_COM_UNIDADE = Pattern.compile(
            "(\\d+)\\.(\\d+)(?=\\s*(?:\"|''|polegadas|mm|cm²|cm|g\\b|kg|GHz|MHz|MP|mAh|Wh|W\\b|%|:|\\s*x\\s*\\d))");
    private static final Pattern POLEGADAS = Pattern.compile("(?i)(\\d+(?:[.,]\\d+)?)\\s*(?:\"|''|inches|inch)");
    private static final Pattern RESOLUCAO = Pattern.compile("(?i)(\\d{3,4})\\s*[x×]\\s*(\\d{3,4})(\\s*(?:pixels|px)\\b)?");
    private static final Pattern BYTES = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(GB|TB|MB)\\b");
    private static final Pattern ARMAZ_COM_RAM = Pattern.compile("(\\d+ [GT]B)\\s+(\\d+ GB) de RAM");
    private static final Pattern RAM_GRUDADA = Pattern.compile("(\\d{1,2}) GB(\\d{1,2}) GB");
    private static final Pattern TERA = Pattern.compile("\\b(?:1000|1024)\\s*GB\\b");
    private static final Pattern SO_CAPACIDADE = Pattern.compile("(\\d+(?:[.,]\\d+)?) (GB|TB)");
    private static final Pattern MAH =Pattern.compile("(?i)(\\d+)\\s*mAh");
    private static final Pattern SO_NUMERO = Pattern.compile("^\\d+(?:\\.\\d+)?$");
    private static final Pattern ONCAS = Pattern.compile("(?i)\\s*\\(\\s*[\\d.]+\\s*oz\\s*\\)");
    private static final Pattern POL_ENTRE_PARENTESES = Pattern.compile("(?i)\\s*\\(\\s*[\\d.]+\\s*in\\s*\\)");
    private static final Pattern UNIDADE_COLADA = Pattern.compile("(\\d)(mm|g|kg)\\b");

    /** Palavras e expressões traduzidas em qualquer campo (a ordem importa: as mais longas primeiro). */
    private static final String[][] TRADUCOES = {
            {"(?i)\\(~?([\\d.,]+)% screen-to-body ratio\\)", "(~$1% de aproveitamento da frente)"},
            {"(?i)screen-to-body ratio", "aproveitamento da frente"},
            {"(?i)\\bppi density\\b", "ppi"},
            {"(?i)(\\d+(?:\\.\\d+)?:\\d+)\\s+ratio\\b", "proporção $1"},
            {"(?i)\\bratio\\b", "proporção"},
            {"(?i)\\bnon-removable\\b", "não removível"},
            {"(?i)\\bremovable\\b", "removível"},
            {"(?i)\\bno card slot\\b", "sem entrada para cartão"},
            {"(?i)\\bshared SIM slot\\b", "slot compartilhado com o chip"},
            {"(?i)\\bdedicated slot\\b", "slot dedicado"},
            {"(?i)\\bwired\\b", "com fio"},
            {"(?i)\\bwireless\\b", "sem fio"},
            {"(?i)\\breverse\\b", "reverso"},
            {"(?i)\\bfast charging\\b", "carregamento rápido"},
            {"(?i)\\binches\\b|\\binch\\b", "polegadas"},
            {"(?i)\\bpixels\\b", "px"},
            {"(?i)\\bor\\b", "ou"},
            {"(?i)\\band\\b", "e"},
    };

    private NormalizacaoSpecs() {
    }

    /**
     * "Released 2023, February 17" → "17/02/2023"; "2023, February" → "02/2023";
     * "Exp. release 2025, March" → "Previsto para 03/2025"; "Announced 2023, February 01" →
     * "Anunciado em 01/02/2023". Texto sem data reconhecível sai sem as palavras em inglês.
     */
    public static String lancamento(String valor) {
        if (valor == null) return null;
        String baixo = valor.toLowerCase(Locale.ROOT);
        if (baixo.contains("cancelled") || baixo.contains("canceled")) return "Cancelado";
        Matcher released = RELEASED.matcher(valor);
        boolean lancado = released.find();
        String alvo = lancado ? valor.substring(released.end()) : valor;
        String prefixo = lancado ? ""
                : baixo.contains("exp") && baixo.contains("release") || baixo.contains("expected") ? "Previsto para "
                : baixo.contains("announced") ? "Anunciado em " : "";
        Optional<String> data = data(alvo);
        if (data.isPresent()) return prefixo + data.get();
        String limpo = PALAVRAS_DATA.matcher(valor).replaceAll(" ");
        limpo = limpo.replaceAll("^[\\s.,;:]+|[\\s.,;:]+$", "").replaceAll("\\s+", " ");
        if (limpo.isEmpty()) return baixo.contains("coming soon") ? "Em breve" : null;
        return prefixo + limpo;
    }

    static Optional<String> data(String texto) {
        String t = texto.strip();
        Matcher m = ANO_MES_DIA.matcher(t);
        while (m.find()) {
            Optional<String> d = dia(m.group(1), m.group(2), m.group(3));
            if (d.isPresent()) return d;
        }
        m = MES_DIA_ANO.matcher(t);
        while (m.find()) {
            Optional<String> d = dia(m.group(3), m.group(1), m.group(2));
            if (d.isPresent()) return d;
        }
        m = ANO_TRIMESTRE.matcher(t);
        if (m.find()) return Optional.of(m.group(2) + "º trimestre de " + m.group(1));
        m = ANO_MES.matcher(t);
        while (m.find()) {
            Integer mes = MESES.get(m.group(2).toLowerCase(Locale.ROOT));
            if (mes != null) return Optional.of("%02d/%s".formatted(mes, m.group(1)));
        }
        m = MES_ANO.matcher(t);
        while (m.find()) {
            Integer mes = MESES.get(m.group(1).toLowerCase(Locale.ROOT));
            if (mes != null) return Optional.of("%02d/%s".formatted(mes, m.group(2)));
        }
        m = SO_ANO.matcher(t.replaceAll("[\\s.,]+$", ""));
        return m.find() ? Optional.of(m.group(1)) : Optional.empty();
    }

    private static Optional<String> dia(String ano, String nomeMes, String dia) {
        Integer mes = MESES.get(nomeMes.toLowerCase(Locale.ROOT));
        if (mes == null) return Optional.empty();
        try {
            LocalDate d = LocalDate.of(Integer.parseInt(ano), mes, Integer.parseInt(dia));
            return Optional.of("%02d/%02d/%04d".formatted(d.getDayOfMonth(), d.getMonthValue(), d.getYear()));
        } catch (DateTimeException e) {
            return Optional.empty();
        }
    }

    /** {@code 6.1", 1080x2340 pixels} → {@code 6,1 polegadas, 1080 x 2340 px}. */
    public static String tela(String valor) {
        if (valor == null) return null;
        String s = POLEGADAS.matcher(valor).replaceAll("$1 polegadas");
        s = RESOLUCAO.matcher(s).replaceAll("$1 x $2 px");
        return traduzir(s);
    }

    /** {@code 8GB RAM, Exynos 2200} → {@code 8 GB de RAM, Exynos 2200}. */
    public static String hardware(String valor) {
        if (valor == null) return null;
        return traduzir(ram(valor));
    }

    /** {@code 128GB 8GB RAM, 256GB 8GB RAM} → {@code 128 GB (8 GB de RAM), 256 GB (8 GB de RAM)}. */
    public static String armazenamento(String valor) {
        if (valor == null) return null;
        String s = ARMAZ_COM_RAM.matcher(ram(TERA.matcher(valor).replaceAll("1 TB"))).replaceAll("$1 ($2 de RAM)");
        // "1 TB, 128 GB, 256 GB" (como a MobileAPI manda) → do menor para o maior
        String[] opcoes = s.split(",\\s*");
        if (opcoes.length > 1 && java.util.Arrays.stream(opcoes).allMatch(o -> SO_CAPACIDADE.matcher(o).matches())) {
            java.util.Arrays.sort(opcoes, java.util.Comparator.comparingDouble(NormalizacaoSpecs::emGb));
            s = String.join(", ", opcoes);
        }
        return traduzir(s);
    }

    private static double emGb(String capacidade) {
        Matcher m = SO_CAPACIDADE.matcher(capacidade);
        if (!m.matches()) return 0;
        double n = Double.parseDouble(m.group(1));
        return m.group(2).equals("TB") ? n * 1024 : n;
    }

    private static String ram(String valor) {
        String s = BYTES.matcher(valor).replaceAll("$1 $2");
        // "12 GB8 GB RAM" (opções de RAM grudadas na MobileAPI) → "8 GB / 12 GB RAM"
        Matcher m = RAM_GRUDADA.matcher(s);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            int a = Integer.parseInt(m.group(1));
            int b = Integer.parseInt(m.group(2));
            m.appendReplacement(sb, Math.min(a, b) + " GB / " + Math.max(a, b) + " GB");
        }
        m.appendTail(sb);
        return sb.toString().replaceAll("\\b(GB|MB)\\s+RAM\\b", "$1 de RAM");
    }

    /** {@code 4000} ou {@code 4000mAh} → {@code 4000 mAh}. */
    public static String bateria(String valor) {
        if (valor == null) return null;
        String s = SO_NUMERO.matcher(valor).matches() ? valor.replaceFirst("\\.0+$", "") + " mAh" : valor;
        return traduzir(MAH.matcher(s).replaceAll("$1 mAh"));
    }

    /** {@code 168.00} → {@code 168 g}; {@code 168 g (5.93 oz)} → {@code 168 g}. */
    public static String peso(String valor) {
        return medida(valor == null ? null : ONCAS.matcher(valor).replaceAll(""), "g");
    }

    /** {@code 7.6mm} → {@code 7,6 mm}; {@code 7.6 mm (0.30 in)} → {@code 7,6 mm}. */
    public static String espessura(String valor) {
        return medida(valor == null ? null : POL_ENTRE_PARENTESES.matcher(valor).replaceAll(""), "mm");
    }

    private static String medida(String valor, String unidade) {
        if (valor == null || valor.isBlank()) return null;
        String s = valor.strip();
        if (SO_NUMERO.matcher(s).matches()) return Textos.comUnidade(s, unidade);
        return traduzir(UNIDADE_COLADA.matcher(s).replaceAll("$1 $2"));
    }

    /** Traduções comuns a todos os campos e vírgula decimal nos números com unidade. */
    public static String traduzir(String valor) {
        if (valor == null) return null;
        String s = valor;
        for (String[] t : TRADUCOES) s = s.replaceAll(t[0], t[1]);
        s = DECIMAL_COM_UNIDADE.matcher(s).replaceAll("$1,$2");
        s = s.replaceAll("(\\d)\\s*cm2\\b", "$1 cm²").replaceAll("\\s+", " ").strip();
        return s.isEmpty() ? null : s;
    }
}
