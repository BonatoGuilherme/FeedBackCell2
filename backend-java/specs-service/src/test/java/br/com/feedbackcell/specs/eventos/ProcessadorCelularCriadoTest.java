package br.com.feedbackcell.specs.eventos;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.feedbackcell.specs.ContratoEspecificacoes;
import br.com.feedbackcell.specs.HttpFalso;
import br.com.feedbackcell.specs.HttpFalso.Resposta;
import br.com.feedbackcell.specs.busca.EspecificacoesService;
import br.com.feedbackcell.specs.busca.ImagensHdService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** Contrato de feedbackcell.celular.especificacoes com o core-api (AplicadorEspecificacoes). */
class ProcessadorCelularCriadoTest {

    private static final String UID = "9e045e469d514fea9dda2ccd161f5fa3";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String EVENTO = """
            {"idcelular":12,"marca":"Samsung","modelo":"Galaxy S24","precisaEspecificacoes":true,
             "precisaModelo3d":true,"ocorridoEm":"2026-11-08T19:00:00Z"}""";
    private static final String MOBILEAPI = """
            {"devices":[{"name":"Galaxy S24","manufacturer_name":"Samsung","release_date":"2024, January 17",
              "screen_resolution":"1080 x 2340","hardware":"Exynos 2400","storage":"128 GB, 256 GBBuy memory card",
              "camera":"50 MP","battery_capacity":4000,"weight":"168.00","thickness":"7.6mm",
              "colors":["Onyx Black","Marble Gray"],"image_b64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"}]}""";
    private static final String SKETCHFAB = "{\"results\":[{\"uid\":\"" + UID + "\",\"name\":\"Samsung Galaxy S24\"}]}";

    private final HttpFalso http = new HttpFalso();

    private ProcessadorCelularCriado processador(String chave) {
        EspecificacoesService s = new EspecificacoesService(http, new ImagensHdService(http), Optional.ofNullable(chave));
        return new ProcessadorCelularCriado(s, JSON, Duration.ZERO);
    }

    private String publicado(ProcessadorCelularCriado p, String evento) {
        ProcessadorCelularCriado.Resposta r = p.processar(evento).orElseThrow();
        assertEquals("12", r.chave());
        return r.valor();
    }

    private long chamadas(String host) {
        return http.chamadas.stream().filter(c -> c.url().contains(host)).count();
    }

    @Test
    void jsonPublicadoEhExatamenteOQueOCoreApiAceita() throws Exception {
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.ok(MOBILEAPI)
                : c.url().contains("sketchfab") ? Resposta.ok(SKETCHFAB) : Resposta.ok("{}"));
        String valor = publicado(processador("chave-teste"), EVENTO);

        assertTrue(valor.matches(".*\"ocorridoEm\":\"\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ\"}$"), valor);
        assertEquals("""
                {"idcelular":12,"especificacoes":{"nome":"Galaxy S24","fabricante":"Samsung",\
                "lancamento":"2024, January 17","tela":"1080 x 2340","hardware":"Exynos 2400",\
                "armazenamento":"128 GB, 256 GB","camera":"50 MP","bateria":"4000","peso":"168 g",\
                "espessura":"7.6mm","cores":"Onyx Black, Marble Gray","creditoImagem":null,"creditoImagemUrl":null},\
                "modelo3d":"%s","ocorridoEm":"T"}""".formatted(UID),
                valor.replaceFirst("\"ocorridoEm\":\"[^\"]+\"", "\"ocorridoEm\":\"T\""));
        assertEquals(List.of(), ContratoEspecificacoes.violacoes(JSON.readTree(valor)));
    }

    @Test
    void textosLongosDaMobileApiContinuamDentroDoLimiteDe300() throws Exception {
        String longo = "x".repeat(1000);
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.ok("""
                {"devices":[{"name":"Galaxy S24","manufacturer_name":"%s","release_date":"%s","screen_resolution":"%s",
                  "hardware":"%s","storage":"%s","camera":"%s","battery_capacity":"%s","weight":"%s","thickness":"%s","colors":"%s"}]}"""
                .formatted(longo, longo, longo, longo, longo, longo, longo, longo, longo, longo))
                : Resposta.ok("{\"results\":[]}"));
        JsonNode r = JSON.readTree(publicado(processador("x"), EVENTO));
        assertTrue(r.get("especificacoes").isObject());
        assertEquals(List.of(), ContratoEspecificacoes.violacoes(r));
    }

    @Test
    void semMobileApiKeyEspecificacoesVemNullMasO3dVem() throws Exception {
        // é o cenário do e2e: modelo3d preenchido e especificacoes NULL
        http.responder(c -> c.url().contains("sketchfab") ? Resposta.ok(SKETCHFAB) : Resposta.ok("{}"));
        JsonNode r = JSON.readTree(publicado(processador(null), EVENTO));
        assertTrue(r.get("especificacoes").isNull());
        assertEquals(UID, r.get("modelo3d").asText());
        assertEquals(0, chamadas("mobileapi"));
        assertEquals(List.of(), ContratoEspecificacoes.violacoes(r));
    }

    @Test
    void falhaTemporariaDaMobileApiEhRepetidaUmaVez() throws Exception {
        AtomicInteger tentativas = new AtomicInteger();
        http.responder(c -> c.url().contains("mobileapi")
                ? (tentativas.incrementAndGet() == 1 ? Resposta.erro(0) : Resposta.ok(MOBILEAPI))
                : c.url().contains("sketchfab") ? Resposta.ok(SKETCHFAB) : Resposta.ok("{}"));
        JsonNode r = JSON.readTree(publicado(processador("x"), EVENTO));
        assertEquals("1080 x 2340", r.get("especificacoes").get("tela").asText());
        assertEquals(UID, r.get("modelo3d").asText());
        assertEquals(2, chamadas("mobileapi"));
    }

    @Test
    void falhaQueContinuaRespondeComNullDepoisDeDuasTentativas() throws Exception {
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.erro(503)
                : c.url().contains("sketchfab") ? Resposta.ok(SKETCHFAB) : Resposta.ok("{}"));
        JsonNode r = JSON.readTree(publicado(processador("x"), EVENTO));
        assertTrue(r.get("especificacoes").isNull());
        assertEquals(UID, r.get("modelo3d").asText());
        assertEquals(2, chamadas("mobileapi"));
    }

    @Test
    void cotaEsgotadaNaoEhRepetida() {
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.erro(429) : Resposta.ok(SKETCHFAB));
        publicado(processador("x"), EVENTO);
        assertEquals(1, chamadas("mobileapi"));
    }

    @Test
    void falhaSoDoSketchfabRepeteSoO3dSemGastarCota() throws Exception {
        AtomicInteger tentativas = new AtomicInteger();
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.ok(MOBILEAPI)
                : c.url().contains("sketchfab")
                ? (tentativas.incrementAndGet() == 1 ? Resposta.erro(502) : Resposta.ok(SKETCHFAB))
                : Resposta.ok("{}"));
        JsonNode r = JSON.readTree(publicado(processador("x"), EVENTO));
        assertTrue(r.get("especificacoes").isObject());
        assertEquals(UID, r.get("modelo3d").asText());
        assertEquals(1, chamadas("mobileapi"));
        assertEquals(2, chamadas("sketchfab"));
    }
}
