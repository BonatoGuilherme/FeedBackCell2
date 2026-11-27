package br.com.feedbackcell.core.auth;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.feedbackcell.core.config.Configuracao;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

class ExpiracaoTokenTest {

    private static Jwt jwt(String expiracao) {
        Configuracao config = new Configuracao("development", "segredo-de-teste", expiracao, "4", "", "", "1",
                "100", "60000", "http://x", "");
        return new Jwt(config, new ObjectMapper());
    }

    private static long duracaoSegundos(Jwt jwt) throws Exception {
        JsonNode p = jwt.verificar(jwt.assinar(3, "a@b.com"));
        return p.get("exp").asLong() - p.get("iat").asLong();
    }

    @Test
    void semJwtExpirationOTokenDura4Horas() throws Exception {
        assertThat(duracaoSegundos(jwt(""))).isEqualTo(4 * 3600);
        assertThat(Configuracao.PADRAO_JWT_EXPIRACAO).isEqualTo("4h");
    }

    @Test
    void jwtExpirationContinuaConfiguravel() throws Exception {
        assertThat(duracaoSegundos(jwt("30m"))).isEqualTo(1800);
    }
}
