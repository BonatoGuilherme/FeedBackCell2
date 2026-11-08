package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.feedbackcell.specs.HttpFalso;
import br.com.feedbackcell.specs.HttpFalso.Resposta;
import br.com.feedbackcell.specs.api.EspecificacoesResource;
import br.com.feedbackcell.specs.busca.CorrespondenciaNome.Opcoes;
import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.Resultado;
import br.com.feedbackcell.specs.http.ClienteHttp;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Portado de backend/test/especificacoes.test.js. */
class EspecificacoesServiceTest {

    private static final String UID = "9e045e469d514fea9dda2ccd161f5fa3";
    private static final String UID2 = "1e8fecdb2a1849ec8dad382b73bd39d1";
    private static final String PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

    private final HttpFalso http = new HttpFalso();

    private EspecificacoesService servico(String chave) {
        return new EspecificacoesService(http, new ImagensHdService(http), Optional.ofNullable(chave));
    }

    private static boolean wiki(HttpFalso.Chamada c) {
        return c.url().matches(".*wiki(pedia|media)\\.org.*");
    }

    private long externas() {
        return http.chamadas.stream().filter(c -> !wiki(c)).count();
    }

    @Test
    void escolheOAparelhoCertoEntreParecidosEUsaCache() {
        http.responder(c -> c.url().startsWith("https://api.mobileapi.dev/") ? Resposta.ok("""
                {"devices":[
                  {"name":"GALAXY Note 3 N9006","manufacturer_name":"Samsung"},
                  {"name":"Galaxy S24 Ultra","manufacturer_name":"Samsung"},
                  {"name":"Galaxy S24","manufacturer_name":"Samsung","image_b64":"%s","storage":"128 GB, 256 GBBuy memory card",
                   "weight":"168.00","thickness":"7.6mm","battery_capacity":4000}]}""".formatted(PNG_B64))
                : wiki(c) ? Resposta.ok("{}")
                : Resposta.ok("""
                {"results":[{"uid":"%s","name":"IPhone 15 Pro"},
                  {"uid":"%s","name":"Galaxy S24 Ultra - $20","user":{"displayName":"autor"},
                   "thumbnails":{"images":[{"url":"https://media.sketchfab.com/t.jpg","width":640}]}}]}""".formatted(UID, UID2)));
        EspecificacoesService s = servico("chave-teste");

        Resultado r = s.buscar("Samsung", "Galaxy S24", false);
        assertEquals("Galaxy S24", r.aparelho().nome());
        assertEquals("128 GB, 256 GB", r.aparelho().armazenamento());
        assertEquals("168 g", r.aparelho().peso());
        assertEquals("7.6mm", r.aparelho().espessura());
        assertEquals("4000", r.aparelho().bateria());
        assertEquals("data:image/png;base64," + PNG_B64, r.aparelho().imagem());
        // 3D: aceita a variante próxima quando não existe a exata
        assertEquals("https://sketchfab.com/models/" + UID2 + "/embed", r.modelo3d().embedUrl());
        assertEquals("https://media.sketchfab.com/t.jpg", r.modelo3d().thumbnail());
        assertEquals(List.of(), r.avisos());

        HttpFalso.Chamada mobile = http.chamadas.stream().filter(c -> c.url().contains("mobileapi")).findFirst().orElseThrow();
        assertEquals("Galaxy S24", mobile.param("name"));
        assertEquals("Samsung", mobile.param("manufacturer"));
        assertEquals("Token chave-teste", mobile.headers().get("Authorization"));

        s.buscar("SAMSUNG", "galaxy s24", false);
        assertEquals(2, externas(), "segunda busca deve vir do cache");
    }

    @Test
    void naoMostraEspecificacaoDeOutroAparelho() {
        http.responder(c -> c.url().contains("mobileapi")
                ? Resposta.ok("{\"devices\":[{\"name\":\"GALAXY Note 3 N9006\"},{\"name\":\"Galaxy A01 Dual SIM\"}]}")
                : Resposta.ok("{\"results\":[{\"uid\":\"" + UID + "\",\"name\":\"IPhone 15 Pro\"}]}"));
        Resultado r = servico("x").buscar("Samsung", "Galaxy S24", false);
        assertNull(r.aparelho());
        assertNull(r.modelo3d());
        assertEquals(List.of(), r.sugestoes());
        assertTrue(r.avisos().get(0).contains("Não encontramos"));
    }

    @Test
    void semChaveAindaDevolveO3dComAviso() {
        http.responder(c -> Resposta.ok("{\"results\":[{\"uid\":\"" + UID + "\",\"name\":\"Galaxy S24\"}]}"));
        Resultado r = servico(null).buscar("Samsung", "Galaxy S24", false);
        assertNull(r.aparelho());
        assertNotNull(r.modelo3d());
        assertTrue(r.avisos().get(0).contains("MOBILEAPI_KEY"));
    }

    @Test
    void falhaExternaNaoEhCacheadaEViraAviso() {
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.erro(429) : Resposta.ok("{\"results\":[]}"));
        EspecificacoesService s = servico("x");
        Resultado r = s.buscar("Motorola", "Moto G", false);
        assertNull(r.aparelho());
        assertNull(r.modelo3d());
        assertTrue(r.avisos().get(0).contains("Limite"));
        s.buscar("Motorola", "Moto G", false);
        assertEquals(4, externas());
    }

    @Test
    void ignoraUidInvalidoDoSketchfab() {
        http.responder(c -> Resposta.ok("{\"results\":[{\"uid\":\"../../evil\",\"name\":\"Xiaomi 14\"}]}"));
        assertNull(servico(null).buscar("Xiaomi", "14", false).modelo3d());
    }

    @Test
    void pontuarExigeNumerosEVariantesPedidas() {
        assertNull(CorrespondenciaNome.pontuar("Galaxy S24", "Galaxy Note 3 N9006"));
        assertNull(CorrespondenciaNome.pontuar("Galaxy S24", "Galaxy S24 Ultra"));
        assertNotNull(CorrespondenciaNome.pontuar("Galaxy S24", "Galaxy S24 Ultra", new Opcoes(true, false)));
        assertNull(CorrespondenciaNome.pontuar("iPhone 15 Pro", "iPhone 15"));
        assertNotNull(CorrespondenciaNome.pontuar("iPhone 15 Pro", "Apple iPhone 15 Pro (5G)"));
        assertNull(CorrespondenciaNome.pontuar("Galaxy S24+", "Galaxy S24"));
        assertNotNull(CorrespondenciaNome.pontuar("Galaxy S24+", "Galaxy S24 Plus"));
        List<String> lista = List.of("Galaxy S24 Ultra", "Galaxy S24 Dual SIM", "Galaxy S24 FE");
        assertEquals("Galaxy S24 Dual SIM",
                CorrespondenciaNome.melhorCandidato("Galaxy S24", lista, n -> n, new Opcoes(true, false)));
    }

    @Test
    void validacaoDaConsulta() {
        assertNotNull(EspecificacoesResource.validar("", ""));
        assertNotNull(EspecificacoesResource.validar("", "a"));
        assertNotNull(EspecificacoesResource.validar("<b>", "S24"));
        assertNotNull(EspecificacoesResource.validar("", "x".repeat(121)));
        assertNotNull(EspecificacoesResource.validar("x".repeat(81), "S24"));
        assertNull(EspecificacoesResource.validar("Samsung", "Galaxy S24+ (5G)"));
    }

    @Test
    void imagemDataUriRejeitaConteudoDesconhecido() {
        ObjectMapper json = new ObjectMapper();
        assertNull(Textos.imagemDataUri(json.valueToTree("PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==")));
        assertNull(Textos.imagemDataUri(json.valueToTree("data:image/svg+xml;base64,AAAA")));
        assertEquals("1.234,5 g", Textos.comUnidade("1234.5", "g"));
    }

    @Test
    void sugestoesAceitamPalavraIncompletaEVariantes() {
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.ok("""
                {"devices":[{"name":"Galaxy A01 Dual SIM"},{"name":"Galaxy S24 Ultra"},{"name":"Galaxy S23"},{"name":"Galaxy S24"}]}""")
                : Resposta.ok("{\"results\":[]}"));
        Resultado r = servico("x").buscar("Samsung", "Galaxy S2", false);
        assertNull(r.aparelho(), "sem modelo exato não escolhe um sozinho");
        assertEquals(List.of("Galaxy S23", "Galaxy S24", "Galaxy S24 Ultra"),
                r.sugestoes().stream().map(Aparelho::nome).sorted().toList());
        assertEquals(List.of(), r.avisos());
    }

    @Test
    void somente3dNaoConsultaAMobileApi() {
        http.responder(c -> Resposta.ok("{\"results\":[{\"uid\":\"" + UID + "\",\"name\":\"Galaxy S24 Ultra\"}]}"));
        Resultado r = servico("x").buscar("Samsung", "Galaxy S24 Ultra", true);
        assertEquals(1, http.chamadas.size());
        assertTrue(http.chamadas.get(0).url().contains("sketchfab"));
        assertNotNull(r.modelo3d());
    }

    @Test
    void anexaFotoHdComCreditoSoDoModeloCerto() {
        String thumb = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/S24.jpg/960px-S24.jpg";
        http.responder(c -> {
            if (c.host().equals("api.mobileapi.dev")) {
                return Resposta.ok("{\"devices\":[{\"name\":\"Galaxy S24\",\"manufacturer_name\":\"Samsung\"},"
                        + "{\"name\":\"Galaxy S24 Ultra\",\"manufacturer_name\":\"Samsung\"}]}");
            }
            if (c.host().equals("en.wikipedia.org") && "pageimages".equals(c.param("prop"))) {
                // "Samsung Galaxy S24 Ultra" redireciona para o artigo do S24: não pode usar a foto do S24
                return Resposta.ok("""
                        {"query":{"redirects":[{"from":"Samsung Galaxy S24 Ultra","to":"Samsung Galaxy S24"}],
                         "pages":[{"title":"Samsung Galaxy S24","pageimage":"S24.jpg"}]}}""");
            }
            if (c.host().equals("en.wikipedia.org") && "imageinfo".equals(c.param("prop"))) {
                return Resposta.ok("""
                        {"query":{"pages":[{"title":"File:S24.jpg","imageinfo":[{"thumburl":"%s?utm_source=x",
                         "descriptionurl":"https://commons.wikimedia.org/wiki/File:S24.jpg",
                         "extmetadata":{"Artist":{"value":"<a href=\\"//x\\">Fulano</a>"},"LicenseShortName":{"value":"CC BY-SA 4.0"}}}]}]}}"""
                        .formatted(thumb));
            }
            if (c.host().equals("commons.wikimedia.org")) {
                // a busca no Commons só acha arquivo de outro modelo
                return Resposta.ok("""
                        {"query":{"pages":[{"title":"File:Galaxy S23 Ultra.jpg","imageinfo":[{"thumburl":"%s","width":2000,"height":4000}]}]}}"""
                        .formatted(thumb));
            }
            return Resposta.ok("{\"results\":[]}");
        });
        Resultado r = servico("x").buscar("Samsung", "Galaxy S24", false);
        assertEquals(thumb, r.aparelho().imagemHd(), "sem os parâmetros de rastreio");
        assertEquals("Foto: Fulano · CC BY-SA 4.0 · Wikimedia Commons", r.aparelho().creditoImagem());
        assertEquals("https://commons.wikimedia.org/wiki/File:S24.jpg", r.aparelho().creditoImagemUrl());
        Aparelho ultra = r.sugestoes().stream().filter(s -> s.nome().equals("Galaxy S24 Ultra")).findFirst().orElseThrow();
        assertNull(ultra.imagemHd(), "não usa a foto do S24 nem a do S23 Ultra para o S24 Ultra");
    }

    @Test
    void seAWikimediaFalharSegueComAMiniatura() {
        http.responder(c -> c.url().contains("mobileapi")
                ? Resposta.ok("{\"devices\":[{\"name\":\"Galaxy S24\",\"image_b64\":\"" + PNG_B64 + "\"}]}")
                : wiki(c) ? Resposta.erro(503) : Resposta.ok("{\"results\":[]}"));
        Resultado r = servico("x").buscar("Samsung", "Galaxy S24", false);
        assertNull(r.aparelho().imagemHd());
        assertEquals("data:image/png;base64," + PNG_B64, r.aparelho().imagem());
    }

    @Test
    void cacheTemLimiteDeTamanhoETtl() {
        http.responder(c -> Resposta.ok("{\"results\":[]}"));
        EspecificacoesService s = servico(null);
        long[] agora = {1_000};
        s.relogio = () -> agora[0];
        for (int i = 0; i <= EspecificacoesService.CACHE_MAX; i++) s.buscar("Marca", "Modelo " + i, true);
        assertEquals(EspecificacoesService.CACHE_MAX, s.tamanhoCache());

        http.responder(c -> Resposta.ok("{\"results\":[]}"));
        s.buscar("Marca", "Modelo 0", true);
        assertEquals(1, http.chamadas.size(), "o mais antigo saiu do cache");
        s.buscar("Marca", "Modelo 2", true);
        assertEquals(1, http.chamadas.size(), "os outros continuam no cache");

        agora[0] += EspecificacoesService.CACHE_TTL_MS + 1;
        s.buscar("Marca", "Modelo 2", true);
        assertEquals(2, http.chamadas.size(), "expirado é buscado de novo");
        assertEquals(1, s.tamanhoCache(), "gravar limpa os expirados");
    }

    @Test
    void piorCasoDasChamadasExternasCabeNoProxyDe30s() {
        // MobileAPI e Sketchfab em paralelo, depois até 3 chamadas em sequência à Wikimedia
        Duration pior = EspecificacoesService.TIMEOUT.plus(ImagensHdService.TIMEOUT.multipliedBy(3));
        assertTrue(pior.compareTo(Duration.ofSeconds(25)) <= 0, "pior caso " + pior);
    }

    @Test
    void falhaDeRedeEhTemporariaMasCotaEChaveInvalidaNao() {
        assertTrue(EspecificacoesService.temporaria(new ClienteHttp.ErroHttp(0, "timeout", null)));
        assertTrue(EspecificacoesService.temporaria(ClienteHttp.ErroHttp.deStatus(503)));
        assertFalse(EspecificacoesService.temporaria(ClienteHttp.ErroHttp.deStatus(429)));
        assertFalse(EspecificacoesService.temporaria(ClienteHttp.ErroHttp.deStatus(401)));
    }

    @Test
    void semMobileApiAindaDevolveAFotoHdDoModeloDigitado() {
        String thumb = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Pixel_8.jpg/960px-Pixel_8.jpg";
        http.responder(c -> {
            if (c.host().equals("en.wikipedia.org") && "pageimages".equals(c.param("prop"))) {
                return Resposta.ok("{\"query\":{\"pages\":[{\"title\":\"Pixel 8\",\"pageimage\":\"Pixel_8.jpg\"}]}}");
            }
            if (c.host().equals("en.wikipedia.org")) {
                return Resposta.ok("{\"query\":{\"pages\":[{\"title\":\"File:Pixel_8.jpg\",\"imageinfo\":[{\"thumburl\":\"" + thumb + "\"}]}]}}");
            }
            return Resposta.ok("{\"results\":[]}");
        });
        Resultado r = servico(null).buscar("Google", "Pixel 8", false);
        assertEquals("Pixel 8", r.aparelho().nome());
        assertEquals(thumb, r.aparelho().imagemHd());
        assertNull(r.aparelho().tela());
    }
}
