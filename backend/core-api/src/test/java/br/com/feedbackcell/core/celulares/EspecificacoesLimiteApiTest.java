package br.com.feedbackcell.core.celulares;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.feedbackcell.core.auth.Jwt;
import br.com.feedbackcell.core.dados.UsoBuscaRepositorio;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Limite por usuário e saldo de créditos, com um specs-service falso e o banco simulado. */
@SpringBootTest(properties = {"app.jwt.secret=segredo-de-teste", "app.admin-user-ids=1"})
@AutoConfigureMockMvc
class EspecificacoesLimiteApiTest {

    private static final HttpServer SPECS = subir();
    /** Créditos que o specs-service falso diz ter gastado na próxima busca. */
    private static final AtomicInteger GASTOS = new AtomicInteger(3);
    private static volatile int statusCreditos = 200;
    /** Quantas consultas "só cache" chegaram ao specs-service falso (que tem só o Galaxy S23 em cache). */
    private static final AtomicInteger SO_CACHE = new AtomicInteger();

    private static HttpServer subir() {
        try {
            HttpServer s = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            s.createContext("/especificacoes/creditos", ex -> responder(ex, statusCreditos,
                    "{\"restantesHoje\":12,\"restantesMes\":41}", null));
            s.createContext("/especificacoes", ex -> {
                if (ex.getRequestURI().getPath().endsWith("/creditos")) return;
                String consulta = ex.getRequestURI().getRawQuery();
                if (consulta.contains("somenteCache=1")) {
                    SO_CACHE.incrementAndGet();
                    if (consulta.contains("Galaxy+S23")) responder(ex, 200, "{\"consulta\":\"cache\"}", 0);
                    else responder(ex, 404, "{\"erro\":\"Sem resultado em cache\"}", null);
                    return;
                }
                responder(ex, 200, "{\"consulta\":\"x\"}", GASTOS.get());
            });
            s.start();
            return s;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void responder(HttpExchange ex, int status, String corpo, Integer gastos) throws IOException {
        byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        if (gastos != null) ex.getResponseHeaders().add("X-Creditos-Gastos", String.valueOf(gastos));
        ex.sendResponseHeaders(status, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.close();
    }

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry r) {
        r.add("app.specs-service-url", () -> "http://127.0.0.1:" + SPECS.getAddress().getPort());
    }

    @AfterAll
    static void parar() {
        SPECS.stop(0);
    }

    @Autowired MockMvc mvc;
    @Autowired Jwt jwt;
    @MockitoBean UsoBuscaRepositorio uso;

    private final Map<String, Integer> contagem = new ConcurrentHashMap<>();

    @BeforeEach
    void preparar() {
        GASTOS.set(3);
        SO_CACHE.set(0);
        statusCreditos = 200;
        contagem.clear();
        when(uso.buscasNoDia(anyLong(), any(LocalDate.class)))
                .thenAnswer(i -> contagem.getOrDefault(i.getArgument(0).toString(), 0));
        doAnswer(i -> contagem.merge(i.getArgument(0).toString(), 1, Integer::sum))
                .when(uso).registrar(anyLong(), any(LocalDate.class));
    }

    private String bearer(long id) {
        return "Bearer " + jwt.assinar(id, "u" + id + "@teste.com");
    }

    private ResultActions buscar(long id) throws Exception {
        return mvc.perform(get("/celulares/especificacoes").param("marca", "Samsung").param("modelo", "Galaxy S24")
                .header("Authorization", bearer(id)));
    }

    @Test
    void primeiraBuscaPassaESegundaDoMesmoUsuarioRecebe429() throws Exception {
        buscar(20).andExpect(status().isOk());
        buscar(20).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value(Matchers.containsString("amanhã")));
        buscar(21).andExpect(status().isOk());
    }

    private ResultActions buscar(long id, String modelo) throws Exception {
        return mvc.perform(get("/celulares/especificacoes").param("marca", "Samsung").param("modelo", modelo)
                .header("Authorization", bearer(id)));
    }

    @Test
    void semBuscaNoDiaAindaServeOCacheSemContar() throws Exception {
        buscar(24).andExpect(status().isOk());
        // sem busca no dia: o Galaxy S23 está no cache do specs-service e sai sem gastar nem contar
        buscar(24, "Galaxy S23").andExpect(status().isOk()).andExpect(jsonPath("$.consulta").value("cache"));
        buscar(24, "Galaxy S23").andExpect(status().isOk());
        assertThat(SO_CACHE.get()).isEqualTo(2);
        assertThat(contagem).containsEntry("24", 1);
        verify(uso, times(1)).somarCreditos(any(LocalDate.class), anyInt());
    }

    @Test
    void semBuscaNoDiaEForaDoCacheContinua429() throws Exception {
        buscar(25).andExpect(status().isOk());
        buscar(25, "Galaxy S22").andExpect(status().isTooManyRequests())
                .andExpect(content().json("{\"erro\":\"" + LimiteBuscaEspecificacoes.MENSAGEM + "\"}", true));
        assertThat(SO_CACHE.get()).isEqualTo(1);
    }

    @Test
    void comBuscaDisponivelNaoConsultaSoOCache() throws Exception {
        buscar(26, "Galaxy S23").andExpect(status().isOk()).andExpect(jsonPath("$.consulta").value("x"));
        assertThat(SO_CACHE.get()).isZero();
    }

    @Test
    void adminNaoEhLimitado() throws Exception {
        buscar(1).andExpect(status().isOk());
        buscar(1).andExpect(status().isOk());
    }

    @Test
    void buscaSemCreditoGastoNaoConta() throws Exception {
        GASTOS.set(0);
        buscar(22).andExpect(status().isOk());
        buscar(22).andExpect(status().isOk());
    }

    @Test
    void somente3dNaoContaNemEhBarrado() throws Exception {
        buscar(23).andExpect(status().isOk());
        mvc.perform(get("/celulares/especificacoes").param("marca", "Samsung").param("modelo", "Galaxy S23")
                        .param("somente3d", "1").header("Authorization", bearer(23)))
                .andExpect(status().isOk());
    }

    @Test
    void creditosExigeLogin() throws Exception {
        mvc.perform(get("/celulares/especificacoes/creditos")).andExpect(status().isUnauthorized());
    }

    @Test
    void creditosJuntaSaldoGlobalComODoUsuario() throws Exception {
        mvc.perform(get("/celulares/especificacoes/creditos").header("Authorization", bearer(30)))
                .andExpect(status().isOk())
                .andExpect(content().json(
                        "{\"restantesMes\":41,\"restantesHoje\":12,\"usuarioPodeBuscarHoje\":true}", true));
        buscar(30).andExpect(status().isOk());
        mvc.perform(get("/celulares/especificacoes/creditos").header("Authorization", bearer(30)))
                .andExpect(jsonPath("$.usuarioPodeBuscarHoje").value(false));
    }

    @Test
    void creditosUsaOMenorEntreOSaldoGravadoEODoSpecsService() throws Exception {
        // o specs-service reiniciou (diz 12/41), mas o MySQL lembra 14 de 15 hoje e 45 de 50 no mês
        when(uso.creditosNoDia(any(LocalDate.class))).thenReturn(14);
        when(uso.creditosNoPeriodo(any(LocalDate.class), any(LocalDate.class))).thenReturn(45);
        mvc.perform(get("/celulares/especificacoes/creditos").header("Authorization", bearer(32)))
                .andExpect(content().json(
                        "{\"restantesMes\":5,\"restantesHoje\":1,\"usuarioPodeBuscarHoje\":true}", true));
    }

    @Test
    void tetoGlobalGravadoEsgotadoDa429AteParaAdmin() throws Exception {
        when(uso.creditosNoDia(any(LocalDate.class))).thenReturn(15);
        buscar(1).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.erro").value(Matchers.containsString("limite de créditos de hoje")));
    }

    @Test
    void creditosGastosSaoSomadosAoTetoGravado() throws Exception {
        buscar(33).andExpect(status().isOk());
        verify(uso).somarCreditos(any(LocalDate.class), eq(3));
    }

    @Test
    void creditosComSpecsServiceComErroDa503() throws Exception {
        statusCreditos = 500;
        mvc.perform(get("/celulares/especificacoes/creditos").header("Authorization", bearer(31)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erro").value("Serviço de especificações indisponível"));
    }
}
