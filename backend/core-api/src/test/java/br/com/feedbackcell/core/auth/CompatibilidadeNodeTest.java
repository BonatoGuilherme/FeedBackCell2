package br.com.feedbackcell.core.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.feedbackcell.core.config.Configuracao;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Tokens e hashes gerados pelo backend Node (jsonwebtoken + bcryptjs) com o segredo
 * "segredo-de-teste" — o Java precisa aceitar os mesmos e gerar equivalentes.
 */
class CompatibilidadeNodeTest {

    /** jwt.sign({idusuario: 7, email}, segredo, {expiresIn: "100y"}) */
    private static final String TOKEN_NODE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            + "eyJpZHVzdWFyaW8iOjcsImVtYWlsIjoibm9kZUB0ZXN0ZS5jb20iLCJpYXQiOjE3OTQxNzE2NjMsImV4cCI6NDk0OTkzMTY2M30."
            + "50wplss6iyYA7gRu8tdJIwYV0mT1kqgsYPMwjlQoE34";
    /** O mesmo payload com exp no passado (2001). */
    private static final String TOKEN_NODE_EXPIRADO = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            + "eyJpZHVzdWFyaW8iOjcsImVtYWlsIjoibm9kZUB0ZXN0ZS5jb20iLCJleHAiOjEwMDAwMDAwMDAsImlhdCI6MTc5NDE3MTY2M30."
            + "xrrUnv9DGKYUX8stwomgWMBaz1YXhWahbpWQDduEnYo";
    /** bcrypt.hashSync("senhaNode", 4) */
    private static final String HASH_BCRYPTJS = "$2b$04$1U9gx04rC9xF5aA1htUtHOy3LtBS9x9436nWu0fcq/dLjs2RZtqpy";

    private static Configuracao config(String segredo, String expiracao) {
        return new Configuracao("development", segredo, expiracao, "4", "", "", "1", "100", "60000", "http://x");
    }

    private final Jwt jwt = new Jwt(config("segredo-de-teste", "24h"), new ObjectMapper());

    @Test
    void aceitaTokenDoNode() throws Exception {
        JsonNode p = jwt.verificar(TOKEN_NODE);
        assertThat(p.get("idusuario").asLong()).isEqualTo(7);
        assertThat(p.get("email").stringValue()).isEqualTo("node@teste.com");
    }

    @Test
    void tokenExpiradoDoNode() {
        assertThatThrownBy(() -> jwt.verificar(TOKEN_NODE_EXPIRADO))
                .isInstanceOfSatisfying(Jwt.ErroToken.class, e -> assertThat(e.falha()).isEqualTo(Jwt.Falha.EXPIRADO));
    }

    @Test
    void recusaOutroSegredoETokenMalformado() {
        Jwt outro = new Jwt(config("outro-segredo", "24h"), new ObjectMapper());
        assertThatThrownBy(() -> outro.verificar(TOKEN_NODE))
                .isInstanceOfSatisfying(Jwt.ErroToken.class, e -> assertThat(e.falha()).isEqualTo(Jwt.Falha.INVALIDO));
        assertThatThrownBy(() -> jwt.verificar("abc.def"))
                .isInstanceOfSatisfying(Jwt.ErroToken.class, e -> assertThat(e.falha()).isEqualTo(Jwt.Falha.INVALIDO));
        Jwt semSegredo = new Jwt(config("", "24h"), new ObjectMapper());
        assertThatThrownBy(() -> semSegredo.verificar(TOKEN_NODE))
                .isInstanceOfSatisfying(Jwt.ErroToken.class, e -> assertThat(e.falha()).isEqualTo(Jwt.Falha.INVALIDO));
    }

    @Test
    void tokenJavaTemOPayloadDoNode() throws Exception {
        JsonNode p = jwt.verificar(jwt.assinar(3, "a@b.com"));
        assertThat(p.properties().stream().map(java.util.Map.Entry::getKey))
                .containsExactly("idusuario", "email", "iat", "exp");
        assertThat(p.get("exp").asLong() - p.get("iat").asLong()).isEqualTo(86_400);
    }

    @Test
    void expiracaoNoFormatoMs() {
        assertThat(DuracaoMs.parse("24h")).isEqualTo(86_400_000d);
        assertThat(DuracaoMs.parse("30m")).isEqualTo(1_800_000d);
        assertThat(DuracaoMs.parse("7d")).isEqualTo(604_800_000d);
        assertThat(DuracaoMs.parse("1.5 hours")).isEqualTo(5_400_000d);
        // sem unidade = milissegundos, como expiresIn: "3600" no jsonwebtoken
        assertThat(DuracaoMs.parse("3600")).isEqualTo(3600d);
        assertThat(DuracaoMs.parse("1 dia")).isNull();
    }

    @Test
    void bcryptCompativelComBcryptjs() {
        Senhas senhas = new Senhas(config("x", "24h"));
        assertThat(senhas.confere("senhaNode", HASH_BCRYPTJS)).isTrue();
        assertThat(senhas.confere("outra", HASH_BCRYPTJS)).isFalse();
        String hash = senhas.hash("minhaSenha");
        assertThat(hash).startsWith("$2b$04$");
        assertThat(senhas.confere("minhaSenha", hash)).isTrue();
        // como o bcryptjs, só os primeiros 72 bytes contam (e não lança exceção)
        String longa = "a".repeat(72);
        assertThat(senhas.confere(longa + "diferente", senhas.hash(longa + "xyz"))).isTrue();
        assertThat(senhas.confere("x", "hash-invalido")).isFalse();
    }
}
