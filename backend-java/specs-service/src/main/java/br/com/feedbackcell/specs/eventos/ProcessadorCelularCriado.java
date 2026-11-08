package br.com.feedbackcell.specs.eventos;

import br.com.feedbackcell.specs.api.EspecificacoesResource;
import br.com.feedbackcell.specs.busca.EspecificacoesService;
import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.Resultado;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.jboss.logging.Logger;

/**
 * Regra de negócio do evento feedbackcell.celular.criado: busca o que o celular precisa e monta
 * a resposta de feedbackcell.celular.especificacoes (com nulls quando nada é encontrado).
 */
@ApplicationScoped
public class ProcessadorCelularCriado {

    private static final Logger LOG = Logger.getLogger(ProcessadorCelularCriado.class);
    private static final int MAX_TEXTO = 300;

    /** Mensagem a publicar: chave = idcelular, valor = JSON. */
    public record Resposta(String chave, String valor) {
    }

    private final EspecificacoesService service;
    private final ObjectMapper json;

    public ProcessadorCelularCriado(EspecificacoesService service, ObjectMapper json) {
        this.service = service;
        this.json = json;
    }

    /** Vazio quando o evento é inválido (sem idcelular): não há a quem responder. */
    public Optional<Resposta> processar(String mensagem) {
        JsonNode evento;
        try {
            evento = json.readTree(mensagem);
        } catch (JsonProcessingException e) {
            LOG.warn("Evento celular.criado com JSON inválido descartado");
            return Optional.empty();
        }
        JsonNode id = evento == null ? null : evento.get("idcelular");
        if (id == null || !id.canConvertToInt() || !id.isIntegralNumber() || id.asInt() < 1) {
            LOG.warn("Evento celular.criado sem idcelular válido descartado");
            return Optional.empty();
        }
        long idcelular = id.asLong();
        boolean precisaSpec = evento.path("precisaEspecificacoes").asBoolean(false);
        boolean precisa3d = evento.path("precisaModelo3d").asBoolean(false);
        String marca = limpar(evento.get("marca"));
        String modelo = limpar(evento.get("modelo"));

        Map<String, Object> especificacoes = null;
        String modelo3d = null;
        if ((precisaSpec || precisa3d) && EspecificacoesResource.validar(marca, modelo) == null) {
            Resultado r = service.buscar(marca, modelo, !precisaSpec);
            if (precisaSpec && r.aparelho() != null && r.aparelho().temEspecificacoes()) {
                especificacoes = especificacoes(r.aparelho());
            }
            if (precisa3d && r.modelo3d() != null) modelo3d = r.modelo3d().uid();
        }

        Map<String, Object> saida = new LinkedHashMap<>();
        saida.put("idcelular", idcelular);
        saida.put("especificacoes", especificacoes);
        saida.put("modelo3d", modelo3d);
        saida.put("ocorridoEm", Instant.now().truncatedTo(ChronoUnit.SECONDS).toString());
        try {
            return Optional.of(new Resposta(String.valueOf(idcelular), json.writeValueAsString(saida)));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String limpar(JsonNode n) {
        return n != null && n.isTextual() ? n.textValue().replaceAll("(?U)\\s+", " ").strip() : "";
    }

    /**
     * Campos do especificacoesSchema do core-api (textos até 300). O crédito só acompanha
     * a foto HD, que não é gravada pelo fluxo assíncrono, então fica de fora.
     */
    static Map<String, Object> especificacoes(Aparelho a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nome", corta(a.nome()));
        m.put("fabricante", corta(a.fabricante()));
        m.put("lancamento", corta(a.lancamento()));
        m.put("tela", corta(a.tela()));
        m.put("hardware", corta(a.hardware()));
        m.put("armazenamento", corta(a.armazenamento()));
        m.put("camera", corta(a.camera()));
        m.put("bateria", corta(a.bateria()));
        m.put("peso", corta(a.peso()));
        m.put("espessura", corta(a.espessura()));
        m.put("cores", corta(a.cores()));
        m.put("creditoImagem", null);
        m.put("creditoImagemUrl", null);
        return m;
    }

    private static String corta(String s) {
        return s == null || s.length() <= MAX_TEXTO ? s : s.substring(0, MAX_TEXTO);
    }
}
