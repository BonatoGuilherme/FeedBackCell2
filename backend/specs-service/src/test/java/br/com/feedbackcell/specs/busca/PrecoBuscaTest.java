package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.com.feedbackcell.specs.HttpFalso;
import br.com.feedbackcell.specs.HttpFalso.Resposta;
import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.Resultado;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** GET /devices/{id}/misc/ (preço de lançamento) no service, com a rede falsa. */
class PrecoBuscaTest {

    private static final String BUSCA = """
            {"devices":[{"id":77,"name":"Galaxy S23","manufacturer_name":"Samsung"},
              {"id":78,"name":"Galaxy S23 Ultra","manufacturer_name":"Samsung"}]}""";

    private final HttpFalso http = new HttpFalso();

    private EspecificacoesService servico(boolean precoAtivo) {
        EspecificacoesService s = new EspecificacoesService(http, new ImagensHdService(http), Optional.of("x"),
                false, precoAtivo, Precos.comCotacoesPadrao());
        s.espera429 = Duration.ZERO;
        return s;
    }

    private static boolean wiki(HttpFalso.Chamada c) {
        return c.url().matches(".*wiki(pedia|media)\\.org.*");
    }

    private long chamadasAoMisc(String id) {
        return http.chamadas.stream().filter(c -> c.url().endsWith("/devices/" + id + "/misc/")).count();
    }

    /** Busca responde o aparelho 77; o /misc responde {@code misc}. */
    private void responder(Resposta misc) {
        http.responder(c -> {
            if (c.url().contains("/devices/search/")) return Resposta.ok(BUSCA);
            if (c.url().endsWith("/devices/77/misc/")) return misc;
            return wiki(c) ? Resposta.ok("{}") : Resposta.ok("{\"results\":[]}");
        });
    }

    @Test
    void precoDoMiscVaiParaOAparelhoEscolhido() {
        responder(Resposta.ok("""
                {"id":77,"name":"Galaxy S23","models":["SM-S911B"],"prices":{"price":"About 800 EUR"}}"""));
        Aparelho a = servico(true).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertEquals("800 EUR", a.precoLancamento());
        assertEquals("R$ 4.960", a.precoEstimado());
        assertEquals("Token x", http.chamadas.stream().filter(c -> c.url().endsWith("/misc/")).findFirst()
                .orElseThrow().headers().get("Authorization"));
    }

    @Test
    void semPrecoNoMiscDeixaOsDoisCamposNull() {
        responder(Resposta.ok("{\"id\":77,\"name\":\"Galaxy S23\",\"models\":[\"SM-S911B\"]}"));
        Aparelho a = servico(true).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertNull(a.precoLancamento());
        assertNull(a.precoEstimado());
        assertEquals("Galaxy S23", a.nome());
    }

    @Test
    void miscComPrecoNaoReconhecidoNaoDaErro() {
        responder(Resposta.ok("{\"price\":\"Not announced\"}"));
        Aparelho a = servico(true).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertNull(a.precoLancamento());
        assertNull(a.precoEstimado());
    }

    @Test
    void miscComErro404OuRedeNaoDerrubaABusca() {
        responder(Resposta.erro(404));
        Aparelho a = servico(true).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertNull(a.precoLancamento());
        assertEquals("Galaxy S23", a.nome());
    }

    @Test
    void miscComErro429TentaDeNovoEAchaOPreco() {
        AtomicInteger tentativas = new AtomicInteger();
        http.responder(c -> {
            if (c.url().contains("/devices/search/")) return Resposta.ok(BUSCA);
            if (c.url().endsWith("/devices/77/misc/")) {
                return tentativas.getAndIncrement() == 0 ? Resposta.erro(429)
                        : Resposta.ok("{\"price\":\"About 150 USD\"}");
            }
            return wiki(c) ? Resposta.ok("{}") : Resposta.ok("{\"results\":[]}");
        });
        Aparelho a = servico(true).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertEquals("150 USD", a.precoLancamento());
        assertEquals("R$ 810", a.precoEstimado());
        assertEquals(2, chamadasAoMisc("77"));
    }

    @Test
    void miscComErro429SempreDesisteNoLimiteDeTentativas() {
        responder(Resposta.erro(429));
        Aparelho a = servico(true).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertNull(a.precoLancamento());
        assertEquals(3, chamadasAoMisc("77"), "uma tentativa e até 2 repetições");
    }

    @Test
    void flagDesligadaNaoConsultaOMisc() {
        responder(Resposta.ok("{\"price\":\"About 800 EUR\"}"));
        Aparelho a = servico(false).buscar("Samsung", "Galaxy S23", false).aparelho();
        assertNull(a.precoLancamento());
        assertNull(a.precoEstimado());
        assertEquals(0, chamadasAoMisc("77"));
    }

    /** Sugestões do autocomplete não gastam cota com o /misc: só o aparelho escolhido. */
    @Test
    void sugestoesNaoBuscamPreco() {
        responder(Resposta.ok("{\"price\":\"About 800 EUR\"}"));
        Resultado r = servico(true).buscar("Samsung", "Galaxy S23", false);
        assertEquals(0, chamadasAoMisc("78"));
        assertTrue(r.sugestoes().stream().allMatch(s -> s.precoLancamento() == null && s.precoEstimado() == null));
    }
}
