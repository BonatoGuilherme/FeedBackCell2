package br.com.feedbackcell.core.validacao;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Portado de backend/test/validateInput.test.js, mais as mensagens do Joi conferidas contra o Node. */
class EsquemaTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static JsonNode json(String s) {
        return JSON.readTree(s);
    }

    @Test
    void celularAceitaPrecoZeroEModeloCom100Caracteres() {
        Esquema.Resultado r = Esquemas.CELULAR.validar(json(
                "{\"marca\":\"Marca\",\"modelo\":\"" + "M".repeat(100) + "\",\"preco\":0,\"descricao\":\"\"}"));
        assertThat(r.erros()).isEmpty();
        assertThat(r.valor().get("preco").asInt()).isZero();
        assertThat(r.valor().get("modelo").stringValue()).hasSize(100);
    }

    @Test
    void comentarioInvalidoListaOErro() {
        Esquema.Resultado r = Esquemas.COMENTARIO.validar(json("{\"texto\":\"x\",\"extra\":true}"));
        assertThat(r.erros()).containsExactly("\"texto\" length must be at least 3 characters long");
    }

    @Test
    void removeCamposDesconhecidos() {
        Esquema.Resultado r = Esquemas.COMENTARIO.validar(json("{\"texto\":\"Comentário válido\",\"extra\":true}"));
        assertThat(r.valido()).isTrue();
        assertThat(r.valor()).isEqualTo(json("{\"texto\":\"Comentário válido\"}"));
    }

    @Test
    void mensagensIguaisAoJoi() {
        Esquema.Resultado r = Esquemas.CELULAR.validar(json(
                "{\"marca\":\"S\",\"modelo\":5,\"preco\":\"abc\",\"modelo3d\":\"xyz\",\"especificacoes\":[1]}"));
        assertThat(r.erros()).isEqualTo(List.of(
                "\"marca\" length must be at least 2 characters long",
                "\"modelo\" must be a string",
                "\"preco\" must be a number",
                "\"especificacoes\" must be of type object",
                "\"modelo3d\" with value \"xyz\" fails to match the required pattern: /^[0-9a-f]{32}$/"));
    }

    @Test
    void registroComVazioNullETamanhoMaximo() {
        assertThat(Esquemas.REGISTRO.validar(json("{\"nome\":\"\",\"email\":\"a@b.com\",\"senha\":\"" + "x".repeat(101) + "\"}")).erros())
                .containsExactly("\"nome\" is not allowed to be empty",
                        "\"senha\" length must be less than or equal to 100 characters long");
        assertThat(Esquemas.REGISTRO.validar(json("{\"nome\":null,\"email\":\"semarroba\"}")).erros())
                .containsExactly("\"nome\" must be a string", "\"email\" must be a valid email", "\"senha\" is required");
        assertThat(Esquemas.REGISTRO.validar(json("[1,2]")).erros()).containsExactly("\"value\" must be of type object");
    }

    @Test
    void precoEmTextoViraNumeroELimitesUsamOValorDoSchema() {
        Esquema.Resultado ok = Esquemas.CELULAR.validar(json("{\"marca\":\"Sa\",\"modelo\":\"S24\",\"preco\":\" 4999.90 \"}"));
        assertThat(ok.valido()).isTrue();
        assertThat(ok.valor().get("preco").isNumber()).isTrue();
        assertThat(ok.valor().get("preco").asDouble()).isEqualTo(4999.9);
        assertThat(Esquemas.CELULAR.validar(json("{\"marca\":\"Sa\",\"modelo\":\"S24\",\"preco\":100000000}")).erros())
                .containsExactly("\"preco\" must be less than or equal to 99999999.99");
        assertThat(Esquemas.CELULAR.validar(json("{\"marca\":\"Sa\",\"modelo\":\"S24\",\"preco\":-1}")).erros())
                .containsExactly("\"preco\" must be greater than or equal to 0");
    }

    @Test
    void especificacoesAninhadasUsamCaminhoNoRotulo() {
        Esquema.Resultado r = Esquemas.CELULAR.validar(json(
                "{\"marca\":\"Sa\",\"modelo\":\"S24\",\"preco\":1,\"especificacoes\":{\"nome\":3,\"creditoImagemUrl\":\"http://x\",\"x\":1}}"));
        assertThat(r.erros()).containsExactly(
                "\"especificacoes.nome\" must be a string",
                "\"especificacoes.creditoImagemUrl\" with value \"http://x\" fails to match the required pattern: "
                        + "/^https:\\/\\/commons\\.wikimedia\\.org\\/wiki\\//");
    }

    @Test
    void confirmacaoDeSenhaUsaMensagemPropria() {
        assertThat(Esquemas.SENHA.validar(json("{\"senhaAtual\":\"a\",\"novaSenha\":\"nova1234\",\"confirmaSenha\":\"outra\"}")).erros())
                .containsExactly("Senhas não conferem");
        assertThat(Esquemas.SENHA.validar(json("{\"senhaAtual\":\"a\",\"novaSenha\":\"nova1234\",\"confirmaSenha\":\"nova1234\"}")).valido())
                .isTrue();
    }

    @Test
    void emails() {
        assertThat(EmailJoi.valido("pessoa@exemplo.com.br")).isTrue();
        assertThat(EmailJoi.valido("a+b.c@sub.dominio.io")).isTrue();
        assertThat(EmailJoi.valido("semarroba")).isFalse();
        assertThat(EmailJoi.valido("a@localhost")).isFalse();
        assertThat(EmailJoi.valido("a@@b.com")).isFalse();
        assertThat(EmailJoi.valido("a b@c.com")).isFalse();
        assertThat(EmailJoi.valido("a@b.c")).isFalse();
    }
}
