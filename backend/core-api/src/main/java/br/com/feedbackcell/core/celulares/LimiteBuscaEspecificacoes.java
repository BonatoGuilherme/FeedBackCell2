package br.com.feedbackcell.core.celulares;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.config.Configuracao;
import br.com.feedbackcell.core.dados.UsoBuscaRepositorio;
import br.com.feedbackcell.core.web.ErroApi;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Protege os créditos do plano gratuito da MobileAPI com duas travas, ambas gravadas no MySQL
 * (sobrevivem ao reinício do Render):
 * <ul>
 *   <li>por usuário: {@code buscas-por-usuario-dia} buscas completas por dia (fuso America/Sao_Paulo);
 *       admins ficam de fora;</li>
 *   <li>global: teto de créditos por dia e por mês (UTC, como o specs-service), para todos, admins inclusive.</li>
 * </ul>
 * Vale para a busca manual e para a busca automática ao cadastrar um celular. Só contam buscas em que
 * o specs-service informou ter gasto crédito.
 */
@Component
public class LimiteBuscaEspecificacoes {

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    static final String MENSAGEM = "Você já usou sua busca automática de hoje. Ela volta amanhã; "
            + "enquanto isso, dá para preencher a ficha do celular à mão.";
    static final String MENSAGEM_TETO_DIA = "A busca automática atingiu o limite de créditos de hoje. Ela volta "
            + "amanhã; enquanto isso, dá para preencher a ficha do celular à mão.";
    static final String MENSAGEM_TETO_MES = "A busca automática atingiu o limite de créditos do mês (plano gratuito "
            + "da MobileAPI). Dá para preencher a ficha do celular à mão.";

    private static final Logger LOG = LoggerFactory.getLogger(LimiteBuscaEspecificacoes.class);

    /** Vez reservada de uma busca; {@code contaUsuario} = é preciso contar e liberar a vez do usuário. */
    public record Reserva(long idusuario, boolean contaUsuario) {
    }

    /** Saldo global persistido; {@code null} no campo cujo teto está desligado. */
    public record Saldo(Integer restantesHoje, Integer restantesMes) {
    }

    private final UsoBuscaRepositorio uso;
    private final Configuracao config;
    private final Clock relogio;
    private final int porDia;
    private final int creditosPorDia;
    private final int creditosPorMes;
    /** Quem já tem uma busca em andamento: evita disparar várias em paralelo antes de a primeira ser contada. */
    private final Set<Long> emAndamento = ConcurrentHashMap.newKeySet();

    @Autowired
    public LimiteBuscaEspecificacoes(UsoBuscaRepositorio uso, Configuracao config,
                                     @Value("${app.specs.buscas-por-usuario-dia:1}") int porDia,
                                     @Value("${app.specs.creditos-por-dia:15}") int creditosPorDia,
                                     @Value("${app.specs.creditos-por-mes:50}") int creditosPorMes) {
        this(uso, config, porDia, creditosPorDia, creditosPorMes, Clock.systemUTC());
    }

    /** Relógio injetável para os testes. */
    LimiteBuscaEspecificacoes(UsoBuscaRepositorio uso, Configuracao config, int porDia, int creditosPorDia,
                              int creditosPorMes, Clock relogio) {
        this.uso = uso;
        this.config = config;
        this.porDia = porDia;
        this.creditosPorDia = creditosPorDia;
        this.creditosPorMes = creditosPorMes;
        this.relogio = relogio;
    }

    private LocalDate hojeSaoPaulo() {
        return relogio.instant().atZone(FUSO).toLocalDate();
    }

    private LocalDate hojeUtc() {
        return relogio.instant().atZone(ZoneOffset.UTC).toLocalDate();
    }

    private static long id(Autenticacao.Usuario usuario) {
        if (usuario.id() == null) throw ErroApi.de(401, "Token inválido");
        return usuario.id();
    }

    private boolean semLimiteDoUsuario(long id) {
        return porDia <= 0 || config.adminIds().contains(id);
    }

    /** Créditos que ainda restam hoje e no mês, pelo que o core-api registrou; null = teto desligado. */
    public Saldo saldoGlobal() {
        LocalDate hoje = hojeUtc();
        Integer dia = creditosPorDia > 0 ? Math.max(0, creditosPorDia - uso.creditosNoDia(hoje)) : null;
        Integer mes = null;
        if (creditosPorMes > 0) {
            YearMonth ym = YearMonth.from(hoje);
            mes = Math.max(0, creditosPorMes - uso.creditosNoPeriodo(ym.atDay(1), ym.atEndOfMonth()));
        }
        return new Saldo(dia, mes);
    }

    private boolean tetoGlobalLivre() {
        Saldo saldo = saldoGlobal();
        return (saldo.restantesHoje() == null || saldo.restantesHoje() > 0)
                && (saldo.restantesMes() == null || saldo.restantesMes() > 0);
    }

    /** Verdadeiro se o usuário ainda pode fazer a busca automática de hoje (sua vez e os tetos globais). */
    public boolean podeBuscarHoje(Autenticacao.Usuario usuario) {
        long id = id(usuario);
        return tetoGlobalLivre() && (semLimiteDoUsuario(id) || uso.buscasNoDia(id, hojeSaoPaulo()) < porDia);
    }

    /**
     * Reserva a vez do usuário; lança 429 se o teto global de créditos acabou, se ele já usou a busca
     * de hoje ou se tem outra em andamento. Quem recebe a reserva precisa chamar {@link #concluir}
     * no fim (use try/finally).
     */
    public Reserva iniciar(Autenticacao.Usuario usuario) {
        long id = id(usuario);
        Saldo saldo = saldoGlobal();
        if (saldo.restantesMes() != null && saldo.restantesMes() <= 0) throw ErroApi.de(429, MENSAGEM_TETO_MES);
        if (saldo.restantesHoje() != null && saldo.restantesHoje() <= 0) throw ErroApi.de(429, MENSAGEM_TETO_DIA);
        if (semLimiteDoUsuario(id)) return new Reserva(id, false);
        // Reserva a vez ANTES de ler a contagem: lendo antes, uma busca paralela podia ler 0, a primeira
        // terminar (contar e liberar a vez) e a paralela pegar a vez com a contagem velha.
        if (!emAndamento.add(id)) throw ErroApi.de(429, MENSAGEM);
        boolean liberada = false;
        try {
            liberada = uso.buscasNoDia(id, hojeSaoPaulo()) < porDia;
        } finally {
            if (!liberada) emAndamento.remove(id);
        }
        if (!liberada) throw ErroApi.de(429, MENSAGEM);
        return new Reserva(id, true);
    }

    /** Soma os créditos gastos ao teto global; libera a vez e conta a busca do usuário se gastou crédito. */
    public void concluir(Reserva reserva, int creditosGastos) {
        try {
            if (creditosGastos > 0) {
                uso.somarCreditos(hojeUtc(), creditosGastos);
                if (reserva.contaUsuario()) uso.registrar(reserva.idusuario(), hojeSaoPaulo());
            }
        } catch (RuntimeException e) {
            LOG.error("Não foi possível registrar o uso da busca de especificações: {}", e.toString());
        } finally {
            if (reserva.contaUsuario()) emAndamento.remove(reserva.idusuario());
        }
    }
}
