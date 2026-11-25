package br.com.feedbackcell.core.celulares;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.config.Configuracao;
import br.com.feedbackcell.core.dados.UsoBuscaRepositorio;
import br.com.feedbackcell.core.web.ErroApi;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Limite de buscas automáticas de especificações por usuário e por dia (fuso America/Sao_Paulo), para
 * um único usuário não gastar sozinho os créditos do plano gratuito da MobileAPI. Só contam as buscas
 * em que o specs-service informou ter gastado crédito. Admins ficam de fora (só valem os tetos globais).
 */
@Component
public class LimiteBuscaEspecificacoes {

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");
    static final String MENSAGEM = "Você já usou sua busca automática de hoje. Ela volta amanhã; "
            + "enquanto isso, dá para preencher a ficha do celular à mão.";

    private static final Logger LOG = LoggerFactory.getLogger(LimiteBuscaEspecificacoes.class);

    private final UsoBuscaRepositorio uso;
    private final Configuracao config;
    private final Clock relogio;
    private final int porDia;
    /** Quem já tem uma busca em andamento: evita disparar várias em paralelo antes de a primeira ser contada. */
    private final Set<Long> emAndamento = ConcurrentHashMap.newKeySet();

    @Autowired
    public LimiteBuscaEspecificacoes(UsoBuscaRepositorio uso, Configuracao config,
                                     @Value("${app.specs.buscas-por-usuario-dia:1}") int porDia) {
        this(uso, config, porDia, Clock.system(FUSO));
    }

    /** Relógio injetável para os testes. */
    LimiteBuscaEspecificacoes(UsoBuscaRepositorio uso, Configuracao config, int porDia, Clock relogio) {
        this.uso = uso;
        this.config = config;
        this.porDia = porDia;
        this.relogio = relogio;
    }

    private LocalDate hoje() {
        return relogio.instant().atZone(FUSO).toLocalDate();
    }

    private static long id(Autenticacao.Usuario usuario) {
        if (usuario.id() == null) throw ErroApi.de(401, "Token inválido");
        return usuario.id();
    }

    private boolean semLimite(long id) {
        return porDia <= 0 || config.adminIds().contains(id);
    }

    /** Verdadeiro se o usuário ainda pode fazer a busca automática de hoje. */
    public boolean podeBuscarHoje(Autenticacao.Usuario usuario) {
        long id = id(usuario);
        return semLimite(id) || uso.buscasNoDia(id, hoje()) < porDia;
    }

    /**
     * Reserva a vez do usuário; lança 429 se ele já usou a busca de hoje ou tem outra em andamento.
     * Quem recebe {@code true} precisa chamar {@link #concluir} no fim (use try/finally).
     */
    public boolean iniciar(Autenticacao.Usuario usuario) {
        long id = id(usuario);
        if (semLimite(id)) return false;
        if (uso.buscasNoDia(id, hoje()) >= porDia || !emAndamento.add(id)) {
            throw ErroApi.de(429, MENSAGEM);
        }
        return true;
    }

    /** Libera a vez e, se a busca gastou crédito, conta no dia. */
    public void concluir(Autenticacao.Usuario usuario, boolean gastouCredito) {
        long id = id(usuario);
        try {
            if (gastouCredito) uso.registrar(id, hoje());
        } catch (RuntimeException e) {
            LOG.error("Não foi possível registrar o uso da busca de especificações: {}", e.toString());
        } finally {
            emAndamento.remove(id);
        }
    }
}
