package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class CotaMobileApiTest {

    /** Relógio que os testes avançam à mão. */
    private static final class RelogioManual extends Clock {
        private Instant agora;

        RelogioManual(String iso) {
            this.agora = Instant.parse(iso);
        }

        void avancarDias(long dias) {
            agora = agora.plusSeconds(dias * 86_400);
        }

        @Override public ZoneOffset getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return agora; }
    }

    @Test
    void saldoDescontaOQueFoiReservado() {
        CotaMobileApi cota = new CotaMobileApi(3, 10, new RelogioManual("2026-11-10T12:00:00Z"));
        assertEquals(new CotaMobileApi.Saldo(3, 10), cota.saldo());
        assertTrue(cota.reservar());
        assertTrue(cota.reservar());
        assertEquals(new CotaMobileApi.Saldo(1, 8), cota.saldo());
    }

    @Test
    void saldoNuncaFicaNegativoENaoGastaNada() {
        CotaMobileApi cota = new CotaMobileApi(1, 10, new RelogioManual("2026-11-10T12:00:00Z"));
        assertTrue(cota.reservar());
        assertFalse(cota.reservar());
        cota.saldo();
        assertEquals(0, cota.saldo().restantesHoje());
        assertEquals(9, cota.saldo().restantesMes());
    }

    @Test
    void viradaDoDiaRestauraSoOSaldoDoDia() {
        RelogioManual relogio = new RelogioManual("2026-11-10T12:00:00Z");
        CotaMobileApi cota = new CotaMobileApi(2, 10, relogio);
        cota.reservar();
        cota.reservar();
        relogio.avancarDias(1);
        assertEquals(new CotaMobileApi.Saldo(2, 8), cota.saldo());
    }

    @Test
    void tetoDesligadoVoltaNull() {
        CotaMobileApi.Saldo saldo = CotaMobileApi.semLimite().saldo();
        assertNull(saldo.restantesHoje());
        assertNull(saldo.restantesMes());
    }
}
