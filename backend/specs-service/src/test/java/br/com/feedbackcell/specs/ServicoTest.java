package br.com.feedbackcell.specs;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.feedbackcell.specs.HttpFalso.Resposta;
import br.com.feedbackcell.specs.busca.EspecificacoesService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** REST + POST /eventos/celular-criado, sem rede. */
@QuarkusTest
class ServicoTest {

    private static final String UID = "9e045e469d514fea9dda2ccd161f5fa3";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Inject HttpFalsoBean http;
    @Inject EspecificacoesService service;

    @BeforeEach
    void limpar() {
        service.limparCache();
        http.responder(c -> c.url().contains("mobileapi")
                ? Resposta.ok("{\"devices\":[{\"name\":\"Galaxy S24\",\"manufacturer_name\":\"Samsung\",\"screen_resolution\":\"1080 x 2340\"}]}")
                : c.url().contains("sketchfab")
                ? Resposta.ok("{\"results\":[{\"uid\":\"" + UID + "\",\"name\":\"Samsung Galaxy S24\"}]}")
                : Resposta.ok("{}"));
    }

    @Test
    void restDevolveOMesmoJsonDoNode() {
        given().queryParam("marca", " Samsung ").queryParam("modelo", "Galaxy  S24")
                .when().get("/especificacoes")
                .then().statusCode(200)
                .body("consulta", equalTo("Samsung Galaxy S24"))
                .body("aparelho.nome", equalTo("Galaxy S24"))
                .body("aparelho.tela", equalTo("1080 x 2340 px"))
                .body("aparelho.imagemHd", nullValue())
                .body("modelo3d.embedUrl", equalTo("https://sketchfab.com/models/" + UID + "/embed"))
                .body("avisos.size()", equalTo(0))
                .body("$", not(hasKey("falhaTemporariaSpec")))
                .body("$", not(hasKey("falhaTemporaria3d")));
    }

    @Test
    void restValidaAConsulta() {
        given().queryParam("modelo", "S24<script>").when().get("/especificacoes")
                .then().statusCode(400).body("erro", equalTo("O nome do celular contém caracteres inválidos."));
        given().when().get("/especificacoes")
                .then().statusCode(400).body("erro", equalTo("Informe marca e modelo do celular."));
    }

    @Test
    void health() {
        given().when().get("/q/health/live").then().statusCode(200).body("status", equalTo("UP"));
    }

    private JsonNode publicar(String evento) throws Exception {
        String corpo = given().contentType("application/json").body(evento)
                .when().post("/eventos/celular-criado")
                .then().statusCode(200).contentType("application/json").extract().asString();
        return JSON.readTree(corpo);
    }

    @Test
    void eventoCriadoGeraEspecificacoesE3d() throws Exception {
        JsonNode r = publicar("""
                {"idcelular":12,"marca":"Samsung","modelo":"Galaxy S24","precisaEspecificacoes":true,
                 "precisaModelo3d":true,"ocorridoEm":"2026-11-08T19:00:00Z"}""");
        assertEquals(12, r.get("idcelular").asInt());
        assertEquals("1080 x 2340 px", r.get("especificacoes").get("tela").asText());
        assertTrue(r.get("especificacoes").get("creditoImagem").isNull());
        assertEquals(UID, r.get("modelo3d").asText());
        assertTrue(r.hasNonNull("ocorridoEm"));
        // com o ObjectMapper do Quarkus (o mesmo da produção)
        assertEquals(List.of(), ContratoEspecificacoes.violacoes(r));
    }

    @Test
    void soO3dNaoGastaCotaDaMobileApi() throws Exception {
        JsonNode r = publicar("""
                {"idcelular":7,"marca":"Samsung","modelo":"Galaxy S24","precisaEspecificacoes":false,"precisaModelo3d":true}""");
        assertTrue(r.get("especificacoes").isNull());
        assertEquals(UID, r.get("modelo3d").asText());
        assertTrue(http.chamadas.stream().noneMatch(c -> c.url().contains("mobileapi")));
    }

    @Test
    void nadaEncontradoRespondeComNulls() throws Exception {
        http.responder(c -> c.url().contains("mobileapi") ? Resposta.ok("{\"devices\":[]}") : Resposta.ok("{\"results\":[]}"));
        JsonNode r = publicar("{\"idcelular\":3,\"marca\":\"Marca\",\"modelo\":\"Inexistente 9000\","
                + "\"precisaEspecificacoes\":true,\"precisaModelo3d\":true}");
        assertTrue(r.get("especificacoes").isNull());
        assertNull(r.get("modelo3d").textValue());
    }

    @Test
    void eventoInvalidoDa400() throws Exception {
        given().contentType("application/json").body("isso não é json").when().post("/eventos/celular-criado")
                .then().statusCode(400).body("erro", equalTo("Evento inválido"));
        given().contentType("application/json").body("{\"marca\":\"sem id\"}").when().post("/eventos/celular-criado")
                .then().statusCode(400);
        JsonNode r = publicar("{\"idcelular\":5,\"marca\":\"Samsung\",\"modelo\":\"Galaxy S24\","
                + "\"precisaEspecificacoes\":false,\"precisaModelo3d\":true}");
        assertEquals(5, r.get("idcelular").asInt());
    }

    @Test
    void readinessUpSemKafka() {
        given().when().get("/q/health/ready").then().statusCode(200).body("status", equalTo("UP"));
    }
}
