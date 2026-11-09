package br.com.feedbackcell.core.validacao;

import static br.com.feedbackcell.core.validacao.Esquema.numero;
import static br.com.feedbackcell.core.validacao.Esquema.objeto;
import static br.com.feedbackcell.core.validacao.Esquema.texto;

import br.com.feedbackcell.core.web.ErroApi;
import java.util.LinkedHashMap;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Os schemas de {@code backend/middlewares/schemas.js}. */
public final class Esquemas {

    /** Especificações vindas da busca (MobileAPI): só campos conhecidos e textos curtos. */
    public static final Esquema ESPECIFICACOES = Esquema.de(
            texto300("nome"), texto300("fabricante"), texto300("lancamento"), texto300("tela"),
            texto300("hardware"), texto300("armazenamento"), texto300("camera"), texto300("bateria"),
            texto300("peso"), texto300("espessura"), texto300("cores"),
            // crédito da foto em alta resolução (licença do Wikimedia Commons exige atribuição)
            texto300("creditoImagem"),
            texto("creditoImagemUrl").max(500)
                    .padrao("^https://commons\\.wikimedia\\.org/wiki/", "/^https:\\/\\/commons\\.wikimedia\\.org\\/wiki\\//")
                    .permiteNull().permiteVazio());

    public static final Esquema CELULAR = Esquema.de(
            texto("marca").min(2).max(100).obrigatorio(),
            texto("modelo").min(2).max(100).obrigatorio(),
            numero("preco").min("0").max("99999999.99").obrigatorio(),
            texto("descricao").max(500).permiteVazio(),
            objeto("especificacoes", ESPECIFICACOES).permiteNull(),
            texto("modelo3d").padrao("^[0-9a-f]{32}$", "/^[0-9a-f]{32}$/").permiteNull());

    public static final Esquema COMENTARIO = Esquema.de(texto("texto").min(3).max(500).obrigatorio());

    public static final Esquema REGISTRO = Esquema.de(
            texto("nome").min(3).max(100).obrigatorio(),
            texto("email").email().obrigatorio(),
            texto("senha").min(6).max(100).obrigatorio());

    public static final Esquema LOGIN = Esquema.de(
            texto("email").email().obrigatorio(),
            texto("senha").obrigatorio());

    public static final Esquema PERFIL = Esquema.de(
            texto("nome").min(3).max(100).obrigatorio(),
            texto("email").email().obrigatorio());

    public static final Esquema SENHA = Esquema.de(
            texto("senhaAtual").obrigatorio(),
            texto("novaSenha").min(6).max(100).obrigatorio(),
            texto("confirmaSenha").obrigatorio().igualA("novaSenha", "Senhas não conferem"));

    public static final Esquema EXCLUIR_CONTA = Esquema.de(texto("senha").obrigatorio());

    private Esquemas() {
    }

    private static Esquema.Campo texto300(String nome) {
        return texto(nome).max(300).permiteNull().permiteVazio();
    }

    /** O middleware validateInput: 400 {erro: "Validação falhou", detalhes} ou o corpo limpo. */
    public static ObjectNode validar(Esquema esquema, JsonNode corpo) {
        Esquema.Resultado r = esquema.validar(corpo);
        if (!r.valido()) {
            Map<String, Object> erro = new LinkedHashMap<>();
            erro.put("erro", "Validação falhou");
            erro.put("detalhes", r.erros());
            throw new ErroApi(400, erro);
        }
        return r.valor();
    }
}
