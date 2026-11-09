package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class NormalizacaoSpecsTest {

    @Test
    void lancamentoComDataCompleta() {
        assertEquals("17/02/2023", NormalizacaoSpecs.lancamento("Released 2023, February 17"));
        assertEquals("17/01/2024", NormalizacaoSpecs.lancamento("2024, January 17"));
        assertEquals("05/09/2025", NormalizacaoSpecs.lancamento("Available. Released 2025, Sep 5"));
        assertEquals("19/09/2025", NormalizacaoSpecs.lancamento("Released September 19, 2025"));
        assertEquals("17/02/2023",
                NormalizacaoSpecs.lancamento("Announced 2023, February 01. Released 2023, February 17"));
    }

    @Test
    void lancamentoSoComMesEAno() {
        assertEquals("02/2023", NormalizacaoSpecs.lancamento("2023, February"));
        assertEquals("02/2023", NormalizacaoSpecs.lancamento("Released 2023, February"));
        assertEquals("2023", NormalizacaoSpecs.lancamento("Released 2023"));
        assertEquals("3º trimestre de 2024", NormalizacaoSpecs.lancamento("Released 2024, Q3"));
    }

    @Test
    void lancamentoPrevistoEAnunciado() {
        assertEquals("Previsto para 03/2025", NormalizacaoSpecs.lancamento("Exp. release 2025, March"));
        assertEquals("Previsto para 03/2025", NormalizacaoSpecs.lancamento("Coming soon. Exp. release 2025, March"));
        assertEquals("Previsto para 1º trimestre de 2026", NormalizacaoSpecs.lancamento("Exp. release 2026, Q1"));
        assertEquals("Anunciado em 01/02/2023", NormalizacaoSpecs.lancamento("Announced 2023, February 01"));
    }

    @Test
    void lancamentoQueNaoDaParaInterpretarSaiLimpo() {
        assertEquals("Cancelado", NormalizacaoSpecs.lancamento("Cancelled"));
        assertEquals("Em breve", NormalizacaoSpecs.lancamento("Coming soon"));
        assertEquals("TBD", NormalizacaoSpecs.lancamento("Released TBD"));
        assertEquals("2023, Febtember 40", NormalizacaoSpecs.lancamento("Released 2023, Febtember 40"));
        assertNull(NormalizacaoSpecs.lancamento("Released"));
        assertNull(NormalizacaoSpecs.lancamento(null));
    }

    @Test
    void lancamentoComDiaInvalidoCaiParaMesEAno() {
        assertEquals("02/2023", NormalizacaoSpecs.lancamento("Released 2023, February 30"));
    }

    @Test
    void telaEmPortugues() {
        assertEquals("6,1 polegadas, 1080 x 2340 px", NormalizacaoSpecs.tela("6.1\", 1080x2340 pixels"));
        assertEquals("1080 x 2340 px", NormalizacaoSpecs.tela("1080 x 2340"));
        assertEquals("6,3 polegadas, 1206 x 2622 px", NormalizacaoSpecs.tela("6.3\", 1206x2622 pixels"));
        assertEquals("1080 x 2340 px, proporção 19,5:9 (~425 ppi)",
                NormalizacaoSpecs.tela("1080 x 2340 pixels, 19.5:9 ratio (~425 ppi density)"));
        assertEquals("6,1 polegadas, 90,1 cm² (~86,5% de aproveitamento da frente)",
                NormalizacaoSpecs.tela("6.1 inches, 90.1 cm2 (~86.5% screen-to-body ratio)"));
    }

    @Test
    void hardwareEArmazenamento() {
        assertEquals("8 GB de RAM, Snapdragon 8 Gen 2", NormalizacaoSpecs.hardware("8GB RAM, Snapdragon 8 Gen 2"));
        assertEquals("Exynos 2400", NormalizacaoSpecs.hardware("Exynos 2400"));
        assertEquals("128 GB (8 GB de RAM), 256 GB (8 GB de RAM)",
                NormalizacaoSpecs.armazenamento("128GB 8GB RAM, 256GB 8GB RAM"));
        assertEquals("128 GB, 256 GB", NormalizacaoSpecs.armazenamento("128 GB, 256 GB"));
        assertEquals("sem entrada para cartão", NormalizacaoSpecs.armazenamento("No card slot"));
    }

    @Test
    void formatosBaguncadosDaMobileApi() {
        // Galaxy S22 Ultra, como a MobileAPI devolve
        assertEquals("8 GB / 12 GB de RAM, Samsung Exynos 2200",
                NormalizacaoSpecs.hardware("12 GB8 GB RAM, Samsung Exynos 2200"));
        assertEquals("128 GB, 256 GB, 512 GB, 1 TB", NormalizacaoSpecs.armazenamento("1000 GB, 128 GB, 256 GB, 512 GB"));
        assertEquals("128 GB, 1 TB", NormalizacaoSpecs.armazenamento("1TB, 128GB"));
    }

    @Test
    void bateriaPesoEEspessura() {
        assertEquals("3900 mAh", NormalizacaoSpecs.bateria("3900"));
        assertEquals("3900 mAh", NormalizacaoSpecs.bateria("3900mAh"));
        assertEquals("Li-Ion 3900 mAh, não removível", NormalizacaoSpecs.bateria("Li-Ion 3900 mAh, non-removable"));
        assertEquals("168 g", NormalizacaoSpecs.peso("168.00"));
        assertEquals("168 g", NormalizacaoSpecs.peso("168g"));
        assertEquals("168 g", NormalizacaoSpecs.peso("168 g (5.93 oz)"));
        assertEquals("167,5 g", NormalizacaoSpecs.peso("167.5"));
        assertEquals("7,6 mm", NormalizacaoSpecs.espessura("7.6mm"));
        assertEquals("7,6 mm", NormalizacaoSpecs.espessura("7.6 mm (0.30 in)"));
        assertEquals("7,6 mm", NormalizacaoSpecs.espessura("7.6"));
        assertEquals("146,3 x 70,9 x 7,6 mm", NormalizacaoSpecs.espessura("146.3 x 70.9 x 7.6 mm"));
        assertNull(NormalizacaoSpecs.peso(null));
    }
}
