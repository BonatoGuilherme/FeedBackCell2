package br.com.feedbackcell.specs.busca;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;

/**
 * Orçamento de créditos da MobileAPI (plano Free: 50 por mês; cada busca completa gasta até 3).
 * Sem isso, qualquer conta podia cadastrar celulares em massa e esgotar a cota do mês, e todo
 * celular cadastrado depois ficava sem especificações.
 *
 * <p>Cada chamada à API reserva 1 crédito antes de sair. Também pausa as chamadas depois de um 429
 * pelo tempo que a API pediu. Os contadores ficam em memória e zeram quando o serviço reinicia,
 * o que basta para um projeto de demonstração. Limite {@code <= 0} desliga aquele teto.
 */
public final class CotaMobileApi {

    /** Pausa depois de um 429 que não disse quanto esperar. */
    static final Duration PAUSA_429_PADRAO = Duration.ofSeconds(60);

    private final int porDia;
    private final int porMes;
    private final Clock relogio;

    private LocalDate dia;
    private YearMonth mes;
    private int usadosDia;
    private int usadosMes;
    private Instant pausadoAte = Instant.EPOCH;

    CotaMobileApi(int porDia, int porMes, Clock relogio) {
        this.porDia = porDia;
        this.porMes = porMes;
        this.relogio = relogio;
    }

    static CotaMobileApi semLimite() {
        return new CotaMobileApi(0, 0, Clock.systemUTC());
    }

    /** Quanto ainda resta hoje e no mês; {@code null} no campo cujo teto está desligado. */
    public record Saldo(Integer restantesHoje, Integer restantesMes) {
    }

    /** Lê o saldo sem gastar nada (zera os contadores se o dia ou o mês virou). */
    synchronized Saldo saldo() {
        virarPeriodo(LocalDate.ofInstant(relogio.instant(), ZoneOffset.UTC));
        return new Saldo(porDia > 0 ? Math.max(0, porDia - usadosDia) : null,
                porMes > 0 ? Math.max(0, porMes - usadosMes) : null);
    }

    private void virarPeriodo(LocalDate hoje) {
        if (!hoje.equals(dia)) {
            dia = hoje;
            usadosDia = 0;
        }
        YearMonth esteMes = YearMonth.from(hoje);
        if (!esteMes.equals(mes)) {
            mes = esteMes;
            usadosMes = 0;
        }
    }

    /** Reserva 1 crédito; false quando a cota do dia/mês acabou ou a API mandou esperar. */
    synchronized boolean reservar() {
        Instant agora = relogio.instant();
        if (agora.isBefore(pausadoAte)) return false;
        LocalDate hoje = LocalDate.ofInstant(agora, ZoneOffset.UTC);
        virarPeriodo(hoje);
        if (porDia > 0 && usadosDia >= porDia) return false;
        if (porMes > 0 && usadosMes >= porMes) return false;
        usadosDia++;
        usadosMes++;
        return true;
    }

    /** A API respondeu 429: nenhuma chamada sai até passar {@code espera} (ou a pausa padrão). */
    synchronized void pausar(Duration espera) {
        Instant ate = relogio.instant().plus(espera == null ? PAUSA_429_PADRAO : espera);
        if (ate.isAfter(pausadoAte)) pausadoAte = ate;
    }
}
