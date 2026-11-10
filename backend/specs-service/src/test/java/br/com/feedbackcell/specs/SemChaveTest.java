package br.com.feedbackcell.specs;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import br.com.feedbackcell.specs.HttpFalso.Resposta;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Sem MOBILEAPI_KEY: sobe, fica pronto (readiness UP) e a busca devolve só o aviso. */
@QuarkusTest
@TestProfile(SemChaveTest.SemChave.class)
class SemChaveTest {

    public static class SemChave implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("mobileapi.key", "");
        }
    }

    @Inject HttpFalsoBean http;

    @Test
    void readinessUpERestSemChaveDevolveAviso() {
        given().when().get("/q/health/ready").then().statusCode(200).body("status", equalTo("UP"));

        http.responder(c -> Resposta.ok("{\"results\":[]}"));
        given().queryParam("marca", "Samsung").queryParam("modelo", "Galaxy S24").when().get("/especificacoes")
                .then().statusCode(200)
                .body("aparelho", equalTo(null))
                .body("avisos[0]", equalTo("Especificações indisponíveis: MOBILEAPI_KEY não configurada."));
    }
}
