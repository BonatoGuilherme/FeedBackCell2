package br.com.feedbackcell.core.validacao;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

/**
 * Subconjunto do Joi usado pelo backend Node ({@code middlewares/schemas.js}) com as mesmas
 * mensagens, {@code abortEarly: false}, {@code stripUnknown: true} e a conversão de números
 * em texto ("10" -> 10) que o Joi faz por padrão.
 */
public final class Esquema {

    private static final JsonNodeFactory NOS = JsonNodeFactory.instance;
    private static final Pattern NUMERO_TEXTO =
            Pattern.compile("^\\s*[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?\\s*$");
    private static final double MAX_SAFE = 9_007_199_254_740_991d;

    public record Resultado(ObjectNode valor, List<String> erros) {
        public boolean valido() {
            return erros.isEmpty();
        }
    }

    private enum Tipo { STRING, NUMBER, OBJECT }

    /** Regra de um campo; os métodos retornam {@code this} para encadear como no Joi. */
    public static final class Campo {
        private final String nome;
        private final Tipo tipo;
        private boolean obrigatorio;
        private boolean permiteNull;
        private boolean permiteVazio;
        private Integer min;
        private Integer max;
        private BigDecimal nMin;
        private BigDecimal nMax;
        private boolean email;
        private Pattern padrao;
        private String padraoJs;
        private String igualA;
        private String mensagemIgualA;
        private Esquema filho;

        private Campo(String nome, Tipo tipo) {
            this.nome = nome;
            this.tipo = tipo;
        }

        public Campo obrigatorio() { obrigatorio = true; return this; }
        public Campo permiteNull() { permiteNull = true; return this; }
        public Campo permiteVazio() { permiteVazio = true; return this; }
        public Campo min(int n) { min = n; return this; }
        public Campo max(int n) { max = n; return this; }
        public Campo min(String n) { nMin = new BigDecimal(n); return this; }
        public Campo max(String n) { nMax = new BigDecimal(n); return this; }
        public Campo email() { email = true; return this; }

        /** {@code padraoJs} é o literal mostrado na mensagem, ex.: {@code /^[0-9a-f]{32}$/}. */
        public Campo padrao(String regexJava, String padraoJs) {
            this.padrao = Pattern.compile(regexJava);
            this.padraoJs = padraoJs;
            return this;
        }

        /** {@code .valid(Joi.ref(outro)).messages({"any.only": mensagem})}. */
        public Campo igualA(String outro, String mensagem) {
            this.igualA = outro;
            this.mensagemIgualA = mensagem;
            return this;
        }
    }

    private final List<Campo> campos;

    private Esquema(List<Campo> campos) {
        this.campos = campos;
    }

    public static Esquema de(Campo... campos) {
        return new Esquema(List.of(campos));
    }

    public static Campo texto(String nome) { return new Campo(nome, Tipo.STRING); }
    public static Campo numero(String nome) { return new Campo(nome, Tipo.NUMBER); }

    public static Campo objeto(String nome, Esquema filho) {
        Campo c = new Campo(nome, Tipo.OBJECT);
        c.filho = filho;
        return c;
    }

    public Resultado validar(JsonNode corpo) {
        List<String> erros = new ArrayList<>();
        if (corpo == null || !corpo.isObject()) {
            erros.add("\"value\" must be of type object");
            return new Resultado(NOS.objectNode(), erros);
        }
        ObjectNode valor = validarObjeto(corpo, "", erros);
        return new Resultado(valor, erros);
    }

    private ObjectNode validarObjeto(JsonNode corpo, String prefixo, List<String> erros) {
        ObjectNode saida = NOS.objectNode();
        for (Campo c : campos) {
            String rotulo = "\"" + prefixo + c.nome + "\"";
            JsonNode v = corpo.get(c.nome);
            if (v == null || v.isMissingNode()) {
                if (c.obrigatorio) erros.add(rotulo + " is required");
                continue;
            }
            if (c.igualA != null) {
                JsonNode ref = saida.has(c.igualA) ? saida.get(c.igualA) : corpo.get(c.igualA);
                if (ref == null || !ref.equals(v)) erros.add(c.mensagemIgualA);
                else saida.set(c.nome, v);
                continue;
            }
            if (v.isNull()) {
                if (c.permiteNull) saida.set(c.nome, v);
                else erros.add(rotulo + erroDeTipo(c.tipo));
                continue;
            }
            JsonNode convertido = switch (c.tipo) {
                case STRING -> validarTexto(c, v, rotulo, erros);
                case NUMBER -> validarNumero(c, v, rotulo, erros);
                case OBJECT -> {
                    if (!v.isObject()) {
                        erros.add(rotulo + erroDeTipo(c.tipo));
                        yield null;
                    }
                    yield c.filho.validarObjeto(v, prefixo + c.nome + ".", erros);
                }
            };
            if (convertido != null) saida.set(c.nome, convertido);
        }
        return saida;
    }

    private static String erroDeTipo(Tipo tipo) {
        return switch (tipo) {
            case STRING -> " must be a string";
            case NUMBER -> " must be a number";
            case OBJECT -> " must be of type object";
        };
    }

    private static JsonNode validarTexto(Campo c, JsonNode v, String rotulo, List<String> erros) {
        if (!v.isString()) {
            erros.add(rotulo + " must be a string");
            return null;
        }
        String s = v.stringValue();
        if (s.isEmpty()) {
            if (c.permiteVazio) return v;
            erros.add(rotulo + " is not allowed to be empty");
            return null;
        }
        int antes = erros.size();
        if (c.min != null && s.length() < c.min) {
            erros.add(rotulo + " length must be at least " + c.min + " characters long");
        }
        if (c.max != null && s.length() > c.max) {
            erros.add(rotulo + " length must be less than or equal to " + c.max + " characters long");
        }
        if (c.email && !EmailJoi.valido(s)) erros.add(rotulo + " must be a valid email");
        if (c.padrao != null && !c.padrao.matcher(s).find()) {
            erros.add(rotulo + " with value \"" + s + "\" fails to match the required pattern: " + c.padraoJs);
        }
        return erros.size() == antes ? v : null;
    }

    private static JsonNode validarNumero(Campo c, JsonNode v, String rotulo, List<String> erros) {
        BigDecimal n;
        if (v.isNumber()) {
            n = v.decimalValue();
        } else if (v.isString() && NUMERO_TEXTO.matcher(v.stringValue()).matches()) {
            n = new BigDecimal(v.stringValue().trim());
        } else {
            erros.add(rotulo + " must be a number");
            return null;
        }
        if (Math.abs(n.doubleValue()) > MAX_SAFE) {
            erros.add(rotulo + " must be a safe number");
            return null;
        }
        int antes = erros.size();
        if (c.nMin != null && n.compareTo(c.nMin) < 0) {
            erros.add(rotulo + " must be greater than or equal to " + c.nMin.toPlainString());
        }
        if (c.nMax != null && n.compareTo(c.nMax) > 0) {
            erros.add(rotulo + " must be less than or equal to " + c.nMax.toPlainString());
        }
        if (erros.size() != antes) return null;
        return v.isNumber() ? v : NOS.numberNode(n.stripTrailingZeros().scale() <= 0 ? n.stripTrailingZeros() : n);
    }
}
