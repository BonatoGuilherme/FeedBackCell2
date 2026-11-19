package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** Leitor de preço do /misc (formatos estilo GSMArena) com as cotações padrão: USD 5,40, EUR 6,20, GBP 7,20, INR 0,065. */
class PrecosTest {

    private static final Precos PRECOS = Precos.comCotacoesPadrao();
    private static final ObjectMapper JSON = new ObjectMapper();

    private static void assertPreco(String texto, String lancamento, String estimado) {
        Precos.Preco p = PRECOS.converter(texto);
        assertEquals(lancamento, p == null ? null : p.lancamento(), texto);
        assertEquals(estimado, p == null ? null : p.estimado(), texto);
    }

    @Test
    void formatosEstiloGsmArena() {
        assertPreco("About 800 EUR", "800 EUR", "R$ 4.960");
        assertPreco("About 150 USD", "150 USD", "R$ 810");
        assertPreco("$ 799.99 / € 899.99 / £ 799.00 / ₹ 79,900", "799,99 USD", "R$ 4.320");
        assertPreco("$999.00 / €1,099.00", "999 USD", "R$ 5.395");
        assertPreco("Rs. 21,999", "21999 INR", "R$ 1.430");
        assertPreco("€ 1.099,00", "1099 EUR", "R$ 6.814");
        assertPreco("£ 799.00", "799 GBP", "R$ 5.753");
        assertPreco("₹ 79,900", "79900 INR", "R$ 5.194");
        assertPreco("US$ 1,299.50", "1299,5 USD", "R$ 7.017");
        assertPreco("About 650 EUR (Base) / 700 EUR (Pro)", "650 EUR", "R$ 4.030");
    }

    @Test
    void moedaPorOrdemDePreferencia() {
        // USD > EUR > GBP > INR, mesmo que a moeda preferida venha por último no texto
        assertPreco("₹ 79,900 / £ 799 / € 899 / $ 999", "999 USD", "R$ 5.395");
        assertPreco("₹ 79,900 / £ 799 / € 899", "899 EUR", "R$ 5.574");
        assertPreco("Rs. 21,999 / £ 799", "799 GBP", "R$ 5.753");
    }

    @Test
    void separadoresDeMilharEDecimal() {
        assertEquals(0, new BigDecimal("79900").compareTo(Precos.valor("79,900")));
        assertEquals(0, new BigDecimal("1099").compareTo(Precos.valor("1.099,00")));
        assertEquals(0, new BigDecimal("1099").compareTo(Precos.valor("1,099.00")));
        assertEquals(0, new BigDecimal("799.99").compareTo(Precos.valor("799.99")));
        assertEquals(0, new BigDecimal("799.99").compareTo(Precos.valor("799,99")));
        assertEquals(0, new BigDecimal("1099").compareTo(Precos.valor("1.099")));
        assertEquals(0, new BigDecimal("1234567").compareTo(Precos.valor("1.234.567")));
        assertNull(Precos.valor("0"));
        assertNull(Precos.valor("99999999999"));
    }

    @Test
    void textoSemPrecoReconhecivelViraNull() {
        assertNull(PRECOS.converter(null));
        assertNull(PRECOS.converter(""));
        assertNull(PRECOS.converter("Not announced"));
        assertNull(PRECOS.converter("TBA"));
        assertNull(PRECOS.converter("800"));
        assertNull(PRECOS.converter("$ abc"));
        assertNull(PRECOS.converter("About 800 gg"));
        assertNull(PRECOS.converter("$0"));
        assertNull(PRECOS.converter("$ 99999999999"));
    }

    @Test
    void leAPrimeiraChaveComPriceEmQualquerNivel() throws Exception {
        JsonNode aninhado = JSON.readTree("""
                {"id":1,"specs":{"Misc":{"Price":"About 800 EUR"}}}""");
        assertEquals("About 800 EUR", Precos.textoDePreco(aninhado, 0));
        assertEquals("800 EUR", PRECOS.deMisc(aninhado).lancamento());

        JsonNode emLista = JSON.readTree("""
                {"models":["Galaxy S23"],"sar":[{"price":"$ 799.99"}]}""");
        assertEquals("$ 799.99", Precos.textoDePreco(emLista, 0));
    }

    @Test
    void chaveSemTextoOuSemPrecoNaoQuebra() throws Exception {
        assertNull(PRECOS.deMisc(JSON.readTree("{\"price\":800}")));
        assertNull(PRECOS.deMisc(JSON.readTree("{\"price\":null,\"name\":\"x\"}")));
        assertNull(PRECOS.deMisc(JSON.readTree("{\"name\":\"Galaxy S23\",\"models\":[\"a\",\"b\"]}")));
        assertNull(PRECOS.deMisc(JSON.readTree("[]")));
        assertNull(PRECOS.deMisc(null));
        // a primeira chave "price" manda: se o texto não for reconhecido, não procura a próxima
        assertNull(PRECOS.deMisc(JSON.readTree("{\"price\":\"Not announced\",\"x\":{\"price\":\"About 150 USD\"}}")));
    }
}
