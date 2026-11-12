package br.com.feedbackcell.core.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ConfiguracaoTest {

    private static final String SEGREDO_FORTE = "0123456789abcdef0123456789abcdef";

    private static Configuracao config(String env, String segredo) {
        return new Configuracao(env, segredo, "24h", "10", "", "", "1", "100", "60000",
                "http://specs");
    }

    @Test
    void producaoExigeJwtSecretComPeloMenos32Caracteres() {
        for (String fraco : new String[]{"", "   ", "curto", SEGREDO_FORTE.substring(1)}) {
            assertThatThrownBy(() -> config("production", fraco))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("JWT_SECRET");
        }
        assertThat(config(" Production ", SEGREDO_FORTE).producao()).isTrue();
    }

    @Test
    void foraDeProducaoSegredoFracoSoAvisa() {
        assertThatCode(() -> config("development", "")).doesNotThrowAnyException();
        assertThatCode(() -> config("test", "segredo-de-teste")).doesNotThrowAnyException();
    }
}
