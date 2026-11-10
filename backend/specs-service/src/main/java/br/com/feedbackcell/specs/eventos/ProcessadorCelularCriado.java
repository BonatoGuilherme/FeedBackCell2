package br.com.feedbackcell.specs.eventos;

import br.com.feedbackcell.specs.api.EspecificacoesResource;
import br.com.feedbackcell.specs.busca.EspecificacoesService;
import br.com.feedbackcell.specs.busca.Modelos.Aparelho;
import br.com.feedbackcell.specs.busca.Modelos.Resultado;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Regra de negócio do POST /eventos/celular-criado: busca o que o celular precisa e monta a
 * resposta {idcelular, especificacoes, modelo3d} (com nulls quando nada é encontrado).
 *
 * <p>O core-api só recebe uma resposta por celular, então uma falha temporária (rede, timeout, 5xx)
 * viraria especificações NULL para sempre: por isso repete a busca uma vez, só do que ainda falta,
 * depois de {@code eventos.espera-repeticao}.
 */
@ApplicationScoped
public class ProcessadorCelularCriado {

    private static final Logger LOG = Logger.getLogger(ProcessadorCelularCriado.class);

    /** Resposta: chave = idcelular, valor = JSON. */
    public record Resposta(String chave, String valor) {
    }

    private final EspecificacoesService service;
    private final ObjectMapper json;
    private final Duration espera;

    public ProcessadorCelularCriado(EspecificacoesService service, ObjectMapper json,
                                    @ConfigProperty(name = "eventos.espera-repeticao", defaultValue = "2s") Duration espera) {
        this.service = service;
        this.json = json;
        this.espera = espera;
    }

    /** Vazio quando o evento é inválido (sem idcelular): não há a quem responder. */
    public Optional<Resposta> processar(String mensagem) {
        JsonNode evento;
        try {
            evento = json.readTree(mensagem);
        } catch (JsonProcessingException e) {
            LOG.warn("Evento celular-criado com JSON inválido descartado");
            return Optional.empty();
        }
        JsonNode id = evento == null ? null : evento.get("idcelular");
        if (id == null || !id.canConvertToInt() || !id.isIntegralNumber() || id.asInt() < 1) {
            LOG.warn("Evento celular-criado sem idcelular válido descartado");
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
            // sem precisar de especificações a busca é só do 3D (não gasta cota da MobileAPI)
            Resultado r = service.buscar(marca, modelo, !precisaSpec);
            if (precisaSpec) especificacoes = especificacoes(r);
            if (precisa3d) modelo3d = uid(r);
            // repete uma vez só a fonte que falhou de forma temporária: cada consulta à MobileAPI gasta cota
            boolean repetirSpec = especificacoes == null && precisaSpec && r.falhaTemporariaSpec();
            boolean repetir3d = modelo3d == null && precisa3d && r.falhaTemporaria3d();
            if ((repetirSpec || repetir3d) && dormir(idcelular, r)) {
                r = service.buscar(marca, modelo, !repetirSpec);
                if (repetirSpec) especificacoes = especificacoes(r);
                if (modelo3d == null && precisa3d) modelo3d = uid(r);
            }
            if (precisaSpec && especificacoes == null) {
                LOG.infof("Celular %d sem especificações: %s", idcelular,
                        r.avisos().isEmpty() ? "nenhum aparelho com esse nome" : String.join(" ", r.avisos()));
            }
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

    private static Map<String, Object> especificacoes(Resultado r) {
        return r.aparelho() != null && r.aparelho().temEspecificacoes() ? especificacoes(r.aparelho()) : null;
    }

    private static String uid(Resultado r) {
        return r.modelo3d() == null ? null : r.modelo3d().uid();
    }

    private boolean dormir(long idcelular, Resultado r) {
        LOG.warnf("Celular %d: falha temporária na busca (%s); tentando de novo", idcelular, String.join(" ", r.avisos()));
        try {
            Thread.sleep(espera);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static String limpar(JsonNode n) {
        return n != null && n.isTextual() ? n.textValue().replaceAll("(?U)\\s+", " ").strip() : "";
    }

    /**
     * Campos do Esquemas.ESPECIFICACOES do core-api (textos até 300; o Textos já corta cada campo
     * em no máximo 300). O crédito só acompanha a foto HD, que não é gravada pelo fluxo assíncrono.
     */
    static Map<String, Object> especificacoes(Aparelho a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("nome", a.nome());
        m.put("fabricante", a.fabricante());
        m.put("lancamento", a.lancamento());
        m.put("tela", a.tela());
        m.put("hardware", a.hardware());
        m.put("armazenamento", a.armazenamento());
        m.put("camera", a.camera());
        m.put("bateria", a.bateria());
        m.put("peso", a.peso());
        m.put("espessura", a.espessura());
        m.put("cores", a.cores());
        m.put("creditoImagem", null);
        m.put("creditoImagemUrl", null);
        return m;
    }
}
