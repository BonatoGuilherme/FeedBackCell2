package br.com.feedbackcell.specs;

import static io.restassured.RestAssured.given;

import br.com.feedbackcell.specs.HttpFalso.Resposta;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Com SPECS_TOKEN: sem o header certo dá 401; com ele passa; o health check segue livre. */
@QuarkusTest
@TestProfile(TokenInternoTest.ComToken.class)
class TokenInternoTest {

    public static class ComToken implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("specs.token", "segredo-teste");
        }
    }

    @Inject HttpFalsoBean http;

    @Test
    void semHeaderOuComHeaderErradoDa401() {
        given().queryParam("marca", "Samsung").queryParam("modelo", "Galaxy S24")
                .when().get("/especificacoes").then().statusCode(401);
        given().header("X-Internal-Token", "errado").queryParam("marca", "Samsung").queryParam("modelo", "Galaxy S24")
                .when().get("/especificacoes").then().statusCode(401);
        given().body("{}").when().post("/eventos/celular-criado").then().statusCode(401);
    }

    @Test
    void comHeaderCertoPassa() {
        http.responder(c -> Resposta.ok("{\"results\":[]}"));
        given().header("X-Internal-Token", "segredo-teste").queryParam("marca", "Samsung").queryParam("modelo", "Galaxy S24")
                .when().get("/especificacoes").then().statusCode(200);
    }

    @Test
    void healthCheckNaoPedeToken() {
        given().when().get("/q/health/live").then().statusCode(200);
    }
}
