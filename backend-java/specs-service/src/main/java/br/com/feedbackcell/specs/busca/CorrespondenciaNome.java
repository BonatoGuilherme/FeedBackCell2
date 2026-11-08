package br.com.feedbackcell.specs.busca;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 * Escolhe, entre resultados "parecidos" de uma API, o aparelho cujo nome
 * corresponde de fato ao modelo pedido. Porta de backend/services/correspondenciaNome.js.
 */
public final class CorrespondenciaNome {

    /** Palavras que mudam o aparelho: "S24" e "S24 Ultra" são celulares diferentes. */
    static final Set<String> VARIANTES = Set.of(
            "pro", "max", "ultra", "plus", "mini", "lite", "fe", "edge",
            "fold", "flip", "note", "neo", "prime", "power", "play");

    /** Palavras que não mudam o aparelho (nem penalizam o candidato). */
    static final Set<String> IRRELEVANTES = Set.of(
            "dual", "sim", "5g", "4g", "lte", "global", "version", "edition",
            "smartphone", "phone", "mobile", "model", "3d", "free", "low", "poly",
            "lowpoly", "realistic");

    private static final Pattern ACENTOS = Pattern.compile("[\\u0300-\\u036f]");
    private static final Pattern SEPARADOR = Pattern.compile("[^a-z0-9]+");
    private static final Pattern DIGITO = Pattern.compile("\\d");

    /** Opções de {@link #pontuar}. */
    public record Opcoes(boolean variantesExtrasPermitidas, boolean prefixo) {
        public static final Opcoes PADRAO = new Opcoes(false, false);
    }

    private CorrespondenciaNome() {
    }

    public static List<String> tokens(String texto) {
        String s = Normalizer.normalize(texto == null ? "" : texto, Normalizer.Form.NFD);
        s = ACENTOS.matcher(s).replaceAll("").toLowerCase(Locale.ROOT).replace("+", " plus ");
        List<String> lista = new ArrayList<>();
        for (String t : SEPARADOR.split(s)) {
            if (!t.isEmpty()) lista.add(t);
        }
        return lista;
    }

    public static Double pontuar(String consulta, String candidato) {
        return pontuar(consulta, candidato, Opcoes.PADRAO);
    }

    /**
     * Nota de um candidato, ou null se ele não serve. Ele precisa conter todos os
     * tokens com número ("s24", "15") e todas as variantes pedidas ("pro"); sem
     * nenhum desses na consulta, precisa conter todos os tokens.
     * Sem {@code variantesExtrasPermitidas}, rejeita variantes não pedidas.
     * Com {@code prefixo}, a última palavra pode estar incompleta ("Galaxy S2" casa com "S24").
     */
    public static Double pontuar(String consulta, String candidato, Opcoes opcoes) {
        List<String> q = tokens(consulta);
        Set<String> c = new LinkedHashSet<>(tokens(candidato));
        if (q.isEmpty() || c.isEmpty()) return null;

        // com prefixo, troca a última palavra pela palavra do candidato que começa com ela
        if (opcoes.prefixo()) {
            String ultima = q.get(q.size() - 1);
            if (!c.contains(ultima)) {
                String completa = c.stream().filter(t -> t.startsWith(ultima)).findFirst().orElse(null);
                if (completa == null) return null;
                q.set(q.size() - 1, completa);
            }
        }

        List<String> fortes = q.stream().filter(t -> DIGITO.matcher(t).find() || VARIANTES.contains(t)).toList();
        List<String> exigidos = fortes.isEmpty() ? q : fortes;
        if (!c.containsAll(exigidos)) return null;

        Set<String> pedidos = new HashSet<>(q);
        int extras = 0;
        int variantesExtras = 0;
        for (String t : c) {
            if (pedidos.contains(t) || IRRELEVANTES.contains(t)) continue;
            if (VARIANTES.contains(t)) variantesExtras += 1;
            else extras += 1;
        }
        if (variantesExtras > 0 && !opcoes.variantesExtrasPermitidas()) return null;

        long casados = q.stream().filter(c::contains).count();
        return casados - extras * 0.5 - variantesExtras * 3.0;
    }

    public static <T> T melhorCandidato(String consulta, List<T> lista, Function<T, String> nomeDe, Opcoes opcoes) {
        T melhor = null;
        double melhorNota = Double.NEGATIVE_INFINITY;
        for (T item : lista) {
            Double nota = pontuar(consulta, nomeDe.apply(item), opcoes);
            if (nota != null && nota > melhorNota) {
                melhor = item;
                melhorNota = nota;
            }
        }
        return melhor;
    }

    /** Os {@code limite} melhores candidatos, do mais parecido para o menos (ordenação estável). */
    public static <T> List<T> rankear(String consulta, List<T> lista, Function<T, String> nomeDe, Opcoes opcoes, int limite) {
        record Nota<T>(T item, double nota) {
        }
        List<Nota<T>> notas = new ArrayList<>();
        for (T item : lista) {
            Double nota = pontuar(consulta, nomeDe.apply(item), opcoes);
            if (nota != null) notas.add(new Nota<>(item, nota));
        }
        notas.sort(Comparator.comparingDouble((Nota<T> n) -> n.nota()).reversed());
        return notas.stream().limit(limite).map(Nota::item).toList();
    }
}
