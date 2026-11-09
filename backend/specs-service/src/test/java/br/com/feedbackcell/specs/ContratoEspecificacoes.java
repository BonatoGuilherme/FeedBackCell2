package br.com.feedbackcell.specs;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * O que o core-api aceita em feedbackcell.celular.especificacoes: cópia das regras de
 * core-api/.../eventos/AplicadorEspecificacoes.java e de Esquemas.ESPECIFICACOES
 * (validacao/Esquemas.java). Se lá mudar, mude aqui.
 */
public final class ContratoEspecificacoes {

    static final Set<String> CAMPOS_300 = Set.of("nome", "fabricante", "lancamento", "tela", "hardware",
            "armazenamento", "camera", "bateria", "peso", "espessura", "cores", "creditoImagem");
    private static final Pattern MODELO3D = Pattern.compile("^[0-9a-f]{32}$");
    private static final Pattern CREDITO_URL = Pattern.compile("^https://commons\\.wikimedia\\.org/wiki/");

    private ContratoEspecificacoes() {
    }

    /** Lista vazia = o core-api aplica o evento sem descartar nada. */
    public static List<String> violacoes(JsonNode evento) {
        List<String> erros = new ArrayList<>();
        JsonNode id = evento.get("idcelular");
        if (id == null || !id.isIntegralNumber() || !id.canConvertToInt() || id.asInt() < 1) erros.add("idcelular");

        JsonNode m3d = evento.get("modelo3d");
        if (m3d == null) erros.add("modelo3d ausente");
        else if (!m3d.isNull() && !(m3d.isTextual() && MODELO3D.matcher(m3d.textValue()).matches())) erros.add("modelo3d");

        JsonNode spec = evento.get("especificacoes");
        if (spec == null) {
            erros.add("especificacoes ausente");
        } else if (!spec.isNull()) {
            if (!spec.isObject()) {
                erros.add("especificacoes não é objeto");
                return erros;
            }
            // o core-api ignora campos desconhecidos (stripUnknown) e grava NULL se o objeto ficar vazio
            boolean algumConhecido = false;
            for (Iterator<String> it = spec.fieldNames(); it.hasNext(); ) {
                String campo = it.next();
                JsonNode v = spec.get(campo);
                if (CAMPOS_300.contains(campo)) {
                    algumConhecido = true;
                    if (!v.isNull() && !(v.isTextual() && v.textValue().length() <= 300)) erros.add(campo);
                } else if (campo.equals("creditoImagemUrl")) {
                    algumConhecido = true;
                    if (!v.isNull() && !(v.isTextual() && (v.textValue().isEmpty()
                            || (v.textValue().length() <= 500 && CREDITO_URL.matcher(v.textValue()).find())))) {
                        erros.add(campo);
                    }
                } else {
                    erros.add("campo desconhecido " + campo);
                }
            }
            if (!algumConhecido) erros.add("especificacoes vazio (core-api grava NULL)");
        }
        return erros;
    }
}
