package br.com.feedbackcell.core.celulares;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.feedbackcell.core.auth.Autenticacao.Usuario;
import br.com.feedbackcell.core.config.Configuracao;
import br.com.feedbackcell.core.dados.UsoBuscaRepositorio;
import br.com.feedbackcell.core.web.ErroApi;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LimiteBuscaEspecificacoesTest {

    /** Repositório em memória no lugar do MySQL. */
    private static final class UsoEmMemoria extends UsoBuscaRepositorio {
        final Map<String, Integer> contagem = new HashMap<>();
        /** Roda depois de ler e antes de devolver: simula outra requisição no meio da leitura. */
        Runnable aoLer;

        UsoEmMemoria() {
            super(null);
        }

        @Override
        public int buscasNoDia(long idusuario, LocalDate dia) {
            int lido = contagem.getOrDefault(idusuario + "|" + dia, 0);
            if (aoLer != null) aoLer.run();
            return lido;
        }

        @Override
        public void registrar(long idusuario, LocalDate dia) {
            contagem.merge(idusuario + "|" + dia, 1, Integer::sum);
        }
    }

    /** Relógio que os testes avançam à mão. */
    private static final class RelogioManual extends Clock {
        Instant agora;

        RelogioManual(String iso) {
            this.agora = Instant.parse(iso);
        }

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
    }

    private static final Usuario COMUM = new Usuario(5L, "a@b.com");
    private static final Usuario OUTRO = new Usuario(6L, "c@d.com");
    private static final Usuario ADMIN = new Usuario(1L, "adm@b.com");

    private final UsoEmMemoria uso = new UsoEmMemoria();
    private final RelogioManual relogio = new RelogioManual("2026-11-10T15:00:00Z");

    private LimiteBuscaEspecificacoes limite(int porDia) {
        Configuracao config = new Configuracao("development", "segredo-de-teste", "", "4", "", "1", "1", "100",
                "60000", "http://x", "");
        return new LimiteBuscaEspecificacoes(uso, config, porDia, relogio);
    }

    /** Uma busca completa que gastou crédito. */
    private static void buscar(LimiteBuscaEspecificacoes limite, Usuario u) {
        boolean controlado = limite.iniciar(u);
        if (controlado) limite.concluir(u, true);
    }

    @Test
    void primeiraBuscaDoDiaPassaESegundaRecebe429() {
        LimiteBuscaEspecificacoes limite = limite(1);
        assertThat(limite.podeBuscarHoje(COMUM)).isTrue();
        buscar(limite, COMUM);
        assertThat(limite.podeBuscarHoje(COMUM)).isFalse();
        assertThatThrownBy(() -> limite.iniciar(COMUM)).isInstanceOfSatisfying(ErroApi.class, e -> {
            assertThat(e.status()).isEqualTo(429);
            assertThat(e.corpo().get("erro").toString()).contains("amanhã", "à mão");
        });
    }

    @Test
    void outroUsuarioNaoEhAfetado() {
        LimiteBuscaEspecificacoes limite = limite(1);
        buscar(limite, COMUM);
        assertThat(limite.podeBuscarHoje(OUTRO)).isTrue();
        buscar(limite, OUTRO);
    }

    @Test
    void adminNaoTemLimitePorUsuario() {
        LimiteBuscaEspecificacoes limite = limite(1);
        for (int i = 0; i < 5; i++) buscar(limite, ADMIN);
        assertThat(limite.podeBuscarHoje(ADMIN)).isTrue();
        assertThat(uso.contagem).isEmpty();
    }

    @Test
    void buscaQueNaoGastouCreditoNaoConta() {
        LimiteBuscaEspecificacoes limite = limite(1);
        assertThat(limite.iniciar(COMUM)).isTrue();
        limite.concluir(COMUM, false);
        assertThat(limite.podeBuscarHoje(COMUM)).isTrue();
        assertThat(uso.contagem).isEmpty();
    }

    @Test
    void viradaDoDiaEmSaoPauloLiberaDeNovo() {
        LimiteBuscaEspecificacoes limite = limite(1);
        // 10/11 22:00 em São Paulo (UTC-3) = 11/11 01:00 UTC
        relogio.agora = Instant.parse("2026-11-11T01:00:00Z");
        buscar(limite, COMUM);
        // ainda é 10/11 em São Paulo (23:30), embora já seja 11/11 em UTC
        relogio.agora = Instant.parse("2026-11-11T02:30:00Z");
        assertThat(limite.podeBuscarHoje(COMUM)).isFalse();
        // 00:00 de 11/11 em São Paulo = 03:00 UTC
        relogio.agora = Instant.parse("2026-11-11T03:00:00Z");
        assertThat(limite.podeBuscarHoje(COMUM)).isTrue();
        buscar(limite, COMUM);
    }

    @Test
    void segundaBuscaEmParaleloDoMesmoUsuarioEhBarrada() {
        LimiteBuscaEspecificacoes limite = limite(1);
        assertThat(limite.iniciar(COMUM)).isTrue();
        assertThatThrownBy(() -> limite.iniciar(COMUM)).isInstanceOf(ErroApi.class);
        limite.concluir(COMUM, true);
    }

    @Test
    void buscaParalelaQueLeuAContagemAntesDaPrimeiraTerminarEhBarrada() {
        LimiteBuscaEspecificacoes limite = limite(1);
        assertThat(limite.iniciar(COMUM)).isTrue();
        // a primeira busca termina (conta e libera a vez) bem no meio da leitura da paralela
        uso.aoLer = () -> limite.concluir(COMUM, true);
        assertThatThrownBy(() -> limite.iniciar(COMUM)).isInstanceOfSatisfying(ErroApi.class,
                e -> assertThat(e.status()).isEqualTo(429));
        uso.aoLer = null;
        // a primeira (se ainda não terminou) conclui; só ela foi contada e o dia acabou para o usuário
        if (uso.contagem.isEmpty()) limite.concluir(COMUM, true);
        assertThat(uso.contagem).containsEntry("5|2026-11-10", 1);
        assertThatThrownBy(() -> limite.iniciar(COMUM)).isInstanceOf(ErroApi.class);
    }

    @Test
    void reservaRecusadaPelaContagemLiberaAVez() {
        LimiteBuscaEspecificacoes limite = limite(1);
        buscar(limite, COMUM);
        assertThatThrownBy(() -> limite.iniciar(COMUM)).isInstanceOf(ErroApi.class);
        // passou o dia: a vez não pode ter ficado presa pela tentativa recusada
        relogio.agora = Instant.parse("2026-11-11T15:00:00Z");
        assertThat(limite.iniciar(COMUM)).isTrue();
    }

    @Test
    void limiteZeroDesliga() {
        LimiteBuscaEspecificacoes limite = limite(0);
        buscar(limite, COMUM);
        buscar(limite, COMUM);
        assertThat(limite.podeBuscarHoje(COMUM)).isTrue();
    }
}
