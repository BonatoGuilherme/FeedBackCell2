package br.com.feedbackcell.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.feedbackcell.core.limite.ArmazemMemoria;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Rate limit global: headers RateLimit-*, 429 em texto e /health fora do limite. */
@SpringBootTest(properties = {"app.rate-limit.limit=2", "app.jwt.secret=x"})
@AutoConfigureMockMvc
class LimiteTest {

    @Autowired MockMvc mvc;

    @Test
    void bloqueiaDepoisDoLimite() throws Exception {
        mvc.perform(get("/auth/verify")).andExpect(header().string("RateLimit-Remaining", "1"))
                .andExpect(header().string("RateLimit-Policy", "2;w=60"));
        mvc.perform(get("/auth/verify")).andExpect(header().string("RateLimit-Remaining", "0"));
        mvc.perform(get("/auth/verify"))
                .andExpect(status().isTooManyRequests())
                .andExpect(content().string("Muitas requisições, tente novamente mais tarde"));
        mvc.perform(get("/health")).andExpect(status().isOk());
    }

    @Test
    void janelaReiniciaNoArmazemEmMemoria() throws InterruptedException {
        ArmazemMemoria m = new ArmazemMemoria();
        assertThat(m.incrementar("ip", 50).total()).isEqualTo(1);
        assertThat(m.incrementar("ip", 50).total()).isEqualTo(2);
        assertThat(m.incrementar("outro", 50).total()).isEqualTo(1);
        Thread.sleep(80);
        assertThat(m.incrementar("ip", 50).total()).isEqualTo(1);
    }
}
