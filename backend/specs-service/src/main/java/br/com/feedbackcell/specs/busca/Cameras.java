package br.com.feedbackcell.specs.busca;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Monta o texto da câmera: "50 MP (principal) + 12 MP (ultrawide) + 10 MP (tele) · frontal 12 MP".
 *
 * <p>A busca da MobileAPI só traz {@code camera} com a principal ("50MP"). O conjunto vem de
 * {@code /devices/{id}/main-camera/} e {@code /devices/{id}/selfie-camera/}, cujo campo
 * {@code modules} segue o texto do GSMArena, ex.:
 * {@code "50 MP, f/1.8, 24mm (wide), ...\n10 MP, f/2.4, 70mm (telephoto), ...\n12 MP, ... (ultrawide)"}.
 * Como o formato exato não é documentado, a leitura aceita texto, lista ou objeto.
 */
public final class Cameras {

    private static final Pattern MP = Pattern.compile("(?i)(\\d+(?:\\.\\d+)?)\\s*MP\\b");
    private static final Pattern PAPEL = Pattern.compile("\\(([^()]*)\\)");
    private static final Pattern BR = Pattern.compile("(?i)<br\\s*/?>");
    private static final int MAX = 300;

    private Cameras() {
    }

    /** Uma lente: megapixels já formatados ("12,5") e o papel em pt-BR (ou null). */
    record Modulo(String mp, String papel) {
        String texto() {
            return mp + " MP" + (papel == null ? "" : " (" + papel + ")");
        }
    }

    /**
     * @param cameraBusca campo {@code camera} da busca (fallback da traseira)
     * @param principal   resposta de main-camera (ou null)
     * @param frontal     resposta de selfie-camera (ou null)
     */
    public static String montar(String cameraBusca, JsonNode principal, JsonNode frontal) {
        List<Modulo> traseiras = modulos(textoModulos(principal), true);
        List<Modulo> frontais = modulos(textoModulos(frontal), false);
        String tras;
        if (!traseiras.isEmpty()) {
            tras = juntar(traseiras);
        } else {
            List<Modulo> daBusca = modulos(cameraBusca, false);
            tras = daBusca.isEmpty() ? NormalizacaoSpecs.traduzir(cameraBusca) : juntar(daBusca);
        }
        String frente = frontais.isEmpty() ? null : "frontal " + juntar(frontais);
        String r = tras == null ? frente : frente == null ? tras : tras + " · " + frente;
        return r == null ? null : Textos.corta(r, MAX);
    }

    private static String juntar(List<Modulo> modulos) {
        return String.join(" + ", modulos.stream().map(Modulo::texto).toList());
    }

    /** Texto do campo {@code modules} (ou do nó inteiro, se ele não existir). */
    static String textoModulos(JsonNode no) {
        if (no == null || no.isNull() || no.isMissingNode()) return null;
        JsonNode alvo = no.has("modules") ? no.get("modules") : no;
        List<String> partes = new ArrayList<>();
        coletar(alvo, partes, alvo == no);
        return partes.isEmpty() ? null : String.join("\n", partes);
    }

    private static void coletar(JsonNode no, List<String> partes, boolean raiz) {
        if (no == null || no.isNull()) return;
        if (no.isTextual()) {
            partes.add(BR.matcher(no.textValue()).replaceAll("\n"));
        } else if (no.isArray()) {
            for (JsonNode n : no) coletar(n, partes, false);
        } else if (no.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> campos = no.fields();
            List<String> linha = new ArrayList<>();
            while (campos.hasNext()) {
                Map.Entry<String, JsonNode> c = campos.next();
                // na raiz (sem "modules") ignora o que não descreve lentes
                if (raiz && (c.getKey().equals("features") || c.getKey().equals("video") || c.getKey().equals("id"))) continue;
                if (c.getValue().isValueNode()) linha.add(c.getValue().asText());
                else coletar(c.getValue(), partes, false);
            }
            if (!linha.isEmpty()) partes.add(String.join(", ", linha));
        }
    }

    /** Uma lente por ocorrência de "NN MP"; o papel é o primeiro parêntese reconhecido do trecho. */
    static List<Modulo> modulos(String texto, boolean traseira) {
        List<Modulo> lista = new ArrayList<>();
        if (texto == null) return lista;
        Matcher m = MP.matcher(texto);
        List<int[]> posicoes = new ArrayList<>();
        List<String> valores = new ArrayList<>();
        while (m.find()) {
            posicoes.add(new int[] {m.start(), m.end()});
            valores.add(m.group(1));
        }
        for (int i = 0; i < posicoes.size(); i++) {
            int fim = i + 1 < posicoes.size() ? posicoes.get(i + 1)[0] : texto.length();
            String trecho = texto.substring(posicoes.get(i)[1], fim);
            lista.add(new Modulo(numero(valores.get(i)), papel(trecho, traseira)));
        }
        return lista;
    }

    private static String numero(String mp) {
        return new BigDecimal(mp).stripTrailingZeros().toPlainString().replace('.', ',');
    }

    static String papel(String trecho, boolean traseira) {
        Matcher m = PAPEL.matcher(trecho);
        while (m.find()) {
            String p = m.group(1).toLowerCase(Locale.ROOT).strip();
            String traduzido = traduzirPapel(p);
            if (traduzido != null) {
                // na frontal a "wide" é a câmera comum: não precisa de rótulo
                return !traseira && traduzido.equals("principal") ? null : traduzido;
            }
        }
        return null;
    }

    private static String traduzirPapel(String p) {
        if (p.contains("ultrawide") || p.contains("ultra wide") || p.contains("ultra-wide")) return "ultrawide";
        if (p.contains("periscope")) return "tele periscópio";
        if (p.contains("telephoto") || p.equals("tele")) return "tele";
        if (p.contains("macro")) return "macro";
        if (p.contains("tof") || p.contains("3d")) return "sensor 3D";
        if (p.contains("depth")) return "profundidade";
        if (p.contains("monochrome") || p.contains("b/w")) return "monocromática";
        if (p.contains("wide")) return "principal";
        return null;
    }
}
