package br.com.feedbackcell.specs.busca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class CamerasTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String S23_PRINCIPAL = "50 MP, f/1.8, 24mm (wide), 1/1.56\", 1.0µm, dual pixel PDAF, OIS\n"
            + "10 MP, f/2.4, 70mm (telephoto), 1/3.94\", 1.0µm, PDAF, OIS, 3x optical zoom\n"
            + "12 MP, f/2.2, 13mm, 120˚ (ultrawide), 1/2.55\" 1.4µm, Super Steady video";
    private static final String S23_FRONTAL = "12 MP, f/2.2, 25mm (wide), dual pixel PDAF";

    private static JsonNode json(String s) throws Exception {
        return JSON.readTree(s);
    }

    private static JsonNode comModulos(String modulos) {
        return JSON.createObjectNode().put("id", 1).put("modules", modulos).put("features", "LED flash, HDR")
                .put("video", "8K@24/30fps");
    }

    @Test
    void montaOConjuntoDoGalaxyS23() {
        assertEquals("50 MP (principal) + 10 MP (tele) + 12 MP (ultrawide) · frontal 12 MP",
                Cameras.montar("50MP", comModulos(S23_PRINCIPAL), comModulos(S23_FRONTAL)));
    }

    @Test
    void aceitaModulosEmListaObjetoEHtml() throws Exception {
        assertEquals("48 MP (principal) + 12 MP (ultrawide)",
                Cameras.montar(null, json("{\"modules\":[\"48 MP, f/1.8 (wide)\",\"12 MP, f/2.2 (ultrawide)\"]}"), null));
        assertEquals("48 MP (principal) + 12 MP (tele periscópio)",
                Cameras.montar(null, json("{\"modules\":{\"Dual\":\"48 MP (wide)<br>12 MP (periscope telephoto)\"}}"), null));
        assertEquals("200 MP (principal) + 2 MP (macro) + 2 MP (profundidade)",
                Cameras.montar(null, json("{\"modules\":[{\"resolution\":\"200 MP\",\"type\":\"(wide)\"},"
                        + "{\"resolution\":\"2 MP\",\"type\":\"(macro)\"},{\"resolution\":\"2MP\",\"type\":\"(depth)\"}]}"), null));
    }

    @Test
    void semEndpointsUsaACameraDaBusca() {
        assertEquals("50 MP", Cameras.montar("50MP", null, null));
        assertEquals("48 MP + 12 MP + 12 MP", Cameras.montar("48 MP + 12 MP + 12 MP", null, null));
        assertEquals("12,5 MP", Cameras.montar("12.5MP", null, null));
        assertNull(Cameras.montar(null, null, null));
    }

    @Test
    void soAFrontalVemDoEndpointETraseiraDaBusca() {
        assertEquals("50 MP · frontal 12 MP", Cameras.montar("50MP", null, comModulos(S23_FRONTAL)));
        assertEquals("frontal 12 MP + 12 MP (ultrawide)",
                Cameras.montar(null, null, comModulos("12 MP (wide)\n12 MP (ultrawide)")));
    }

    @Test
    void ignoraFeaturesEVideoQuandoNaoHaModules() throws Exception {
        assertEquals("64 MP (principal)",
                Cameras.montar(null, json("{\"id\":3,\"Single\":\"64 MP (wide)\",\"features\":\"5 MP\",\"video\":\"4K\"}"), null));
    }

    @Test
    void textoMuitoLongoEhCortadoEm300() {
        String muitos = "12 MP (wide)\n".repeat(60);
        assertEquals(300, Cameras.montar(null, comModulos(muitos), null).length());
    }
}
