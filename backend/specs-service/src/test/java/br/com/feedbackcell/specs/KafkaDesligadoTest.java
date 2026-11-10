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

/** KAFKA_ENABLED=false: sobe, fica pronto (readiness UP) e o REST continua funcionando. */
@QuarkusTest
@TestProfile(KafkaDesligadoTest.SemKafka.class)
class KafkaDesligadoTest {

    public static class SemKafka implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "mp.messaging.incoming.celular-criado.enabled", "false",
                    "mp.messaging.outgoing.celular-especificacoes.enabled", "false",
                    "mobileapi.key", "");
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
