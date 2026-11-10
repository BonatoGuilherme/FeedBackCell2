package br.com.feedbackcell.core.eventos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.feedbackcell.core.dados.CelularRepositorio;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Resposta do specs-service (POST /eventos/celular-criado). */
class AplicadorEspecificacoesTest {

    private final CelularRepositorio repo = mock(CelularRepositorio.class);
    private final AplicadorEspecificacoes aplicador = new AplicadorEspecificacoes(repo, new ObjectMapper());

    @Test
    void gravaCamposValidosSemOsDesconhecidos() {
        when(repo.preencherSeVazio(eq(12L), any(), any())).thenReturn(true);
        boolean gravou = aplicador.aplicar("""
                {"idcelular":12,"especificacoes":{"nome":"Galaxy S24","tela":"6.2","imagemHd":"https://x"},
                 "modelo3d":"0123456789abcdef0123456789abcdef","ocorridoEm":"2026-11-08T19:00:05Z"}""");
        assertThat(gravou).isTrue();
        ArgumentCaptor<JsonNode> spec = ArgumentCaptor.forClass(JsonNode.class);
        verify(repo).preencherSeVazio(eq(12L), spec.capture(), eq("0123456789abcdef0123456789abcdef"));
        assertThat(spec.getValue().properties()).hasSize(2);
        assertThat(spec.getValue().get("nome").stringValue()).isEqualTo("Galaxy S24");
    }

    @Test
    void ignoraEspecificacoesInvalidasMasAproveitaO3d() {
        aplicador.aplicar("""
                {"idcelular":3,"especificacoes":{"nome":7},"modelo3d":"0123456789abcdef0123456789abcdef"}""");
        verify(repo).preencherSeVazio(eq(3L), isNull(), eq("0123456789abcdef0123456789abcdef"));
    }

    @Test
    void descartaMensagensSemNadaUtilOuMalformadas() {
        assertThat(aplicador.aplicar("{\"idcelular\":5,\"especificacoes\":null,\"modelo3d\":null}")).isFalse();
        assertThat(aplicador.aplicar("{\"idcelular\":5,\"modelo3d\":\"nao-hex\"}")).isFalse();
        assertThat(aplicador.aplicar("{\"idcelular\":\"5\",\"modelo3d\":\"0123456789abcdef0123456789abcdef\"}")).isFalse();
        assertThat(aplicador.aplicar("{\"idcelular\":0}")).isFalse();
        assertThat(aplicador.aplicar("nao é json")).isFalse();
        verify(repo, never()).preencherSeVazio(anyLong(), any(), any());
    }

    @Test
    void celularApagadoNaoEhErro() {
        when(repo.preencherSeVazio(anyLong(), any(), any())).thenReturn(false);
        assertThat(aplicador.aplicar("{\"idcelular\":99,\"modelo3d\":\"0123456789abcdef0123456789abcdef\"}")).isFalse();
    }
}
