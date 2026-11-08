package br.com.feedbackcell.core.eventos;

import br.com.feedbackcell.core.dados.CelularRepositorio;
import br.com.feedbackcell.core.validacao.Esquema;
import br.com.feedbackcell.core.validacao.Esquemas;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Aplica um evento feedbackcell.celular.especificacoes: valida como o Joi do POST /celulares
 * e grava só nas colunas ainda NULL. Mensagens inválidas são descartadas (com log), nunca reprocessadas.
 */
@Component
public class AplicadorEspecificacoes {

    private static final Logger LOG = LoggerFactory.getLogger(AplicadorEspecificacoes.class);
    private static final Pattern MODELO3D = Pattern.compile("^[0-9a-f]{32}$");

    private final CelularRepositorio celulares;
    private final ObjectMapper json;

    public AplicadorEspecificacoes(CelularRepositorio celulares, ObjectMapper json) {
        this.celulares = celulares;
        this.json = json;
    }

    /** Devolve true se algo foi gravado. */
    public boolean aplicar(String mensagem) {
        JsonNode evento;
        try {
            evento = json.readTree(mensagem);
        } catch (JacksonException e) {
            LOG.warn("Evento de especificações com JSON inválido descartado");
            return false;
        }
        JsonNode id = evento == null ? null : evento.get("idcelular");
        if (id == null || !id.isIntegralNumber() || !id.canConvertToInt() || id.asInt() < 1) {
            LOG.warn("Evento de especificações sem idcelular válido descartado");
            return false;
        }
        long idcelular = id.asLong();

        JsonNode especificacoes = null;
        JsonNode spec = evento.get("especificacoes");
        if (spec != null && spec.isObject()) {
            Esquema.Resultado r = Esquemas.ESPECIFICACOES.validar(spec);
            if (r.valido() && !r.valor().isEmpty()) especificacoes = r.valor();
            else if (!r.valido()) LOG.warn("Especificações do celular {} inválidas: {}", idcelular, r.erros());
        }
        String modelo3d = null;
        JsonNode m3d = evento.get("modelo3d");
        if (m3d != null && m3d.isString() && MODELO3D.matcher(m3d.stringValue()).matches()) {
            modelo3d = m3d.stringValue();
        }
        if (especificacoes == null && modelo3d == null) return false;

        boolean existe = celulares.preencherSeVazio(idcelular, especificacoes, modelo3d);
        if (!existe) LOG.info("Celular {} não existe mais; especificações ignoradas", idcelular);
        return existe;
    }
}
