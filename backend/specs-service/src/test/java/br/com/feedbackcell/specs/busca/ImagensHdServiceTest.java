package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.feedbackcell.specs.HttpFalso;
import br.com.feedbackcell.specs.HttpFalso.Resposta;
import br.com.feedbackcell.specs.busca.ImagensHdService.Avaliacao;
import br.com.feedbackcell.specs.busca.ImagensHdService.Candidata;
import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.FotoHd;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ImagensHdServiceTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String S23 = "Galaxy S23";

    private static JsonNode info(int largura, int altura, String descricao, String licenca) throws Exception {
        String meta = "{\"ImageDescription\":{\"value\":" + JSON.writeValueAsString(descricao == null ? "" : descricao)
                + "},\"LicenseShortName\":{\"value\":" + JSON.writeValueAsString(licenca) + "}}";
        return JSON.readTree("{\"width\":" + largura + ",\"height\":" + altura + ",\"extmetadata\":" + meta + "}");
    }

    private static JsonNode info(int largura, int altura) throws Exception {
        return info(largura, altura, null, "CC BY-SA 4.0");
    }

    private static FotoHd foto(String nome) {
        return new FotoHd("https://upload.wikimedia.org/wikipedia/commons/" + nome, "Foto: x", null);
    }

    // ---- indicaGrupo ----

    @Test
    void indicaGrupoParaLancamentoSerieEVariosAparelhos() {
        assertTrue(ImagensHdService.indicaGrupo(S23, "Samsung Galaxy S23 series launch", true));
        assertTrue(ImagensHdService.indicaGrupo(S23, "Galaxy Unpacked 2023", true));
        assertTrue(ImagensHdService.indicaGrupo(S23, "Galaxy S23 and S23 Plus", true), "\"and\" no título = vários");
        assertTrue(ImagensHdService.indicaGrupo(S23, "Samsung Galaxy S23s", true), "plural do modelo");
        assertTrue(ImagensHdService.indicaGrupo(S23, "Three phones at the keynote", false));
    }

    @Test
    void indicaGrupoParaVarianteNaoPedida() {
        assertTrue(ImagensHdService.indicaGrupo(S23, "Samsung Galaxy S23 Ultra", true));
        assertFalse(ImagensHdService.indicaGrupo("Galaxy S23 Ultra", "Samsung Galaxy S23 Ultra", true));
    }

    @Test
    void frenteEVersoContaComoUmAparelho() {
        assertFalse(ImagensHdService.indicaGrupo(S23, "Samsung Galaxy S23 front and back", true));
        assertFalse(ImagensHdService.indicaGrupo(S23, "Galaxy_S23_back-and-front", true));
        assertFalse(ImagensHdService.indicaGrupo(S23, "Front and back of the phone", false),
                "\"and\" na descrição não indica grupo");
    }

    @Test
    void naoIndicaGrupoParaFotoSimplesOuTextoVazio() {
        assertFalse(ImagensHdService.indicaGrupo(S23, "Samsung Galaxy S23 front", true));
        assertFalse(ImagensHdService.indicaGrupo(S23, null, true));
        assertFalse(ImagensHdService.indicaGrupo(S23, "", false));
    }

    // ---- avaliar ----

    @Test
    void avaliarFotoRetratoDeUmAparelhoEhAdequadaComNotaMaior() throws Exception {
        Avaliacao retrato = ImagensHdService.avaliar(S23, "Samsung Galaxy S23 front", info(1500, 3000), true);
        Avaliacao grupo = ImagensHdService.avaliar(S23, "Samsung Galaxy S23 launch", info(4000, 2000), true);
        assertNotNull(retrato);
        assertNotNull(grupo);
        assertTrue(retrato.adequada());
        assertFalse(grupo.adequada());
        assertTrue(retrato.nota() > grupo.nota());
    }

    @Test
    void avaliarPaisagemOuDescricaoDeGrupoNaoEhAdequada() throws Exception {
        assertFalse(ImagensHdService.avaliar(S23, "Samsung Galaxy S23", info(3000, 2000), true).adequada(),
                "proporção acima de " + ImagensHdService.PROPORCAO_MAXIMA);
        assertTrue(ImagensHdService.avaliar(S23, "Samsung Galaxy S23", info(2000, 2000), true).adequada());
        assertFalse(ImagensHdService.avaliar(S23, "Samsung Galaxy S23",
                info(1500, 3000, "<p>The Galaxy S23 series at the launch event</p>", "CC BY 2.0"), true).adequada());
    }

    @Test
    void avaliarRejeitaOutroModeloELicencaNaoLivre() throws Exception {
        assertNull(ImagensHdService.avaliar(S23, "Samsung Galaxy S23 Ultra front", info(1500, 3000), true),
                "S23 Ultra não serve para o S23");
        assertNull(ImagensHdService.avaliar(S23, "Samsung Galaxy S23 front", info(1500, 3000, null, "Fair use"), true));
        assertNotNull(ImagensHdService.avaliar(S23, "IMG_1234", info(1500, 3000), false),
                "sem exigir o nome (foto do artigo), arquivo genérico serve");
    }

    // ---- escolher ----

    @Test
    void grupoPaisagemPerdeParaRetratoDeUmAparelho() throws Exception {
        FotoHd grupo = foto("grupo.jpg");
        FotoHd retrato = foto("retrato.jpg");
        Candidata c1 = new Candidata(grupo,
                ImagensHdService.avaliar(S23, "Samsung Galaxy S23 series launch", info(4000, 2250), true));
        Candidata c2 = new Candidata(retrato,
                ImagensHdService.avaliar(S23, "Samsung Galaxy S23", info(1200, 2400), true));
        assertEquals(retrato, ImagensHdService.escolher(List.of(c1, c2)));
        assertEquals(retrato, ImagensHdService.escolher(List.of(c2, c1)));
    }

    @Test
    void adequadaVenceMesmoComNotaMenorENaoAdequadaSoSeNaoHouverOutra() {
        FotoHd a = foto("a.jpg");
        FotoHd b = foto("b.jpg");
        FotoHd c = foto("c.jpg");
        assertEquals(b, ImagensHdService.escolher(List.of(
                new Candidata(a, new Avaliacao(9, false)), new Candidata(b, new Avaliacao(1, true)))));
        assertEquals(c, ImagensHdService.escolher(List.of(
                new Candidata(b, new Avaliacao(1, true)), new Candidata(c, new Avaliacao(2, true)))));
        assertEquals(a, ImagensHdService.escolher(List.of(
                new Candidata(c, new Avaliacao(1, false)), new Candidata(a, new Avaliacao(3, false)))));
        assertNull(ImagensHdService.escolher(List.of()));
    }

    // ---- busca completa ----

    private static Aparelho aparelho(String fabricante, String nome) {
        return new Aparelho(nome, fabricante, null, null, null, null, null, null, null, null, null, null,
                null, null, null);
    }

    @Test
    void fotoDeLancamentoDoArtigoPerdeParaRetratoDoCommons() {
        String grupo = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/S23_launch.jpg/960px-S23_launch.jpg";
        String retrato = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/S23.jpg/960px-S23.jpg";
        String ultra = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/S23U.jpg/960px-S23U.jpg";
        HttpFalso http = new HttpFalso();
        http.responder(c -> {
            if (c.host().equals("en.wikipedia.org") && "pageimages".equals(c.param("prop"))) {
                return Resposta.ok("""
                        {"query":{"pages":[{"title":"Samsung Galaxy S23","pageimage":"Samsung_Galaxy_S23_series_launch.jpg"}]}}""");
            }
            if (c.host().equals("en.wikipedia.org")) {
                return Resposta.ok("""
                        {"query":{"pages":[{"title":"File:Samsung Galaxy S23 series launch.jpg",
                          "imageinfo":[{"thumburl":"%s","width":4000,"height":2250}]}]}}""".formatted(grupo));
            }
            if (c.host().equals("commons.wikimedia.org")) {
                return Resposta.ok("""
                        {"query":{"pages":[
                          {"title":"File:Samsung Galaxy S23 Ultra front.jpg","imageinfo":[{"thumburl":"%s","width":1500,"height":3000}]},
                          {"title":"File:Samsung Galaxy S23 front and back.jpg","imageinfo":[{"thumburl":"%s","width":1600,"height":2000}]}]}}"""
                        .formatted(ultra, retrato));
            }
            return Resposta.ok("{}");
        });
        Map<String, FotoHd> r = new ImagensHdService(http).buscar(List.of(aparelho("Samsung", S23)));
        assertEquals(retrato, r.get("Samsung|" + S23).imagemHd());
    }

    @Test
    void semAlternativaNoCommonsUsaAFotoDoArtigoMesmoNaoAdequada() {
        String grupo = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/S23_launch.jpg/960px-S23_launch.jpg";
        HttpFalso http = new HttpFalso();
        http.responder(c -> {
            if (c.host().equals("en.wikipedia.org") && "pageimages".equals(c.param("prop"))) {
                return Resposta.ok("""
                        {"query":{"pages":[{"title":"Samsung Galaxy S23","pageimage":"Samsung_Galaxy_S23_series_launch.jpg"}]}}""");
            }
            if (c.host().equals("en.wikipedia.org")) {
                return Resposta.ok("""
                        {"query":{"pages":[{"title":"File:Samsung Galaxy S23 series launch.jpg",
                          "imageinfo":[{"thumburl":"%s","width":4000,"height":2250}]}]}}""".formatted(grupo));
            }
            return Resposta.ok("{\"query\":{\"pages\":[]}}");
        });
        Map<String, FotoHd> r = new ImagensHdService(http).buscar(List.of(aparelho("Samsung", S23)));
        assertEquals(grupo, r.get("Samsung|" + S23).imagemHd());
        assertTrue(http.chamadas.stream().anyMatch(c -> c.host().equals("commons.wikimedia.org")),
                "foto não adequada do artigo faz consultar o Commons");
    }
}
