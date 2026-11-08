package br.com.feedbackcell.specs.busca;

import java.util.List;

/** Formas do JSON devolvido por GET /especificacoes (iguais às do especificacoesService.js). */
public final class Modelos {

    private Modelos() {
    }

    /** Foto em alta resolução (Wikimedia) e o crédito exigido pela licença. */
    public record FotoHd(String imagemHd, String creditoImagem, String creditoImagemUrl) {
    }

    public record Aparelho(
            String nome, String fabricante, String imagem, String lancamento, String tela, String hardware,
            String armazenamento, String camera, String bateria, String peso, String espessura, String cores,
            String imagemHd, String creditoImagem, String creditoImagemUrl) {

        /** Chave "fabricante|nome" usada para casar a foto HD com o aparelho. */
        public String chave() {
            return (fabricante == null ? "" : fabricante) + "|" + nome;
        }

        public Aparelho comFoto(FotoHd f) {
            return new Aparelho(nome, fabricante, imagem, lancamento, tela, hardware, armazenamento, camera,
                    bateria, peso, espessura, cores,
                    f == null ? null : f.imagemHd(), f == null ? null : f.creditoImagem(),
                    f == null ? null : f.creditoImagemUrl());
        }

        /** Tem alguma especificação técnica (além de nome e fabricante)? */
        public boolean temEspecificacoes() {
            return lancamento != null || tela != null || hardware != null || armazenamento != null
                    || camera != null || bateria != null || peso != null || espessura != null || cores != null;
        }
    }

    public record Modelo3d(String nome, String autor, String embedUrl, String viewerUrl, String thumbnail) {

        /** uid de 32 hex do Sketchfab, extraído do embedUrl. */
        public String uid() {
            String prefixo = "https://sketchfab.com/models/";
            return embedUrl.substring(prefixo.length(), prefixo.length() + 32);
        }
    }

    public record Resultado(String consulta, Aparelho aparelho, List<Aparelho> sugestoes, Modelo3d modelo3d,
                            List<String> avisos) {
    }
}
