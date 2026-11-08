package br.com.feedbackcell.core.celulares;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.dados.CelularRepositorio;
import br.com.feedbackcell.core.dados.ImagemRepositorio;
import br.com.feedbackcell.core.eventos.EventosCelular;
import br.com.feedbackcell.core.usuarios.UsuariosController;
import br.com.feedbackcell.core.validacao.Esquemas;
import br.com.feedbackcell.core.web.Acao;
import br.com.feedbackcell.core.web.CorpoJson;
import br.com.feedbackcell.core.web.ErroApi;
import br.com.feedbackcell.core.web.Parametros;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Rotas /celulares (controllers/celularesController.js). */
@RestController
@RequestMapping("/celulares")
public class CelularesController {

    private static final Logger LOG = LoggerFactory.getLogger(CelularesController.class);
    private static final String ERRO_CAMPOS =
            "Marca deve ter entre 2 e 100 caracteres e modelo entre 2 e 100 caracteres";

    private final CelularRepositorio celulares;
    private final ImagemRepositorio imagens;
    private final Autenticacao auth;
    private final CorpoJson corpo;
    private final EventosCelular eventos;

    public CelularesController(CelularRepositorio celulares, ImagemRepositorio imagens, Autenticacao auth,
                               CorpoJson corpo, EventosCelular eventos) {
        this.celulares = celulares;
        this.imagens = imagens;
        this.auth = auth;
        this.corpo = corpo;
        this.eventos = eventos;
    }

    @GetMapping({"", "/"})
    public Map<String, Object> listar(HttpServletRequest req) {
        Parametros.Paginacao p = Parametros.paginacao(req);
        if (p == null) throw ErroApi.de(400, Parametros.ERRO_PAGINACAO);
        return Acao.executar("Erro ao buscar celulares", () -> {
            List<Map<String, Object>> lista = celulares.listar(p.limit(), p.offset());
            long total = celulares.contar();
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("celulares", anexarImagens(lista));
            r.put("paginacao", UsuariosController.paginacao(p, total));
            return r;
        });
    }

    @GetMapping("/meus-itens")
    public Map<String, Object> meusItens(HttpServletRequest req) {
        Long id = auth.exigir(req).id();
        return Acao.executar("Erro ao buscar seus celulares", () -> {
            List<Map<String, Object>> lista = id == null ? List.of() : celulares.doUsuario(id);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("total", lista.size());
            r.put("celulares", anexarImagens(lista));
            return r;
        });
    }

    @GetMapping("/{id}")
    public Map<String, Object> porId(@PathVariable String id) {
        long idcelular = Parametros.idCelular(id);
        return Acao.executar("Erro ao buscar celular", () -> {
            Map<String, Object> c = idcelular > 0 ? celulares.porId(idcelular) : null;
            if (c == null) throw ErroApi.de(404, "Celular não encontrado");
            return anexarImagens(List.of(c)).get(0);
        });
    }

    @PostMapping({"", "/"})
    public ResponseEntity<Map<String, Object>> criar(HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        ObjectNode b = Esquemas.validar(Esquemas.CELULAR, corpo.ler(req));
        Campos c = campos(b);
        return Acao.executar("Erro ao criar celular", () -> {
            if (idusuario == null) throw new IllegalStateException("Token sem idusuario numérico");
            JsonNode spec = nuloSeAusente(b.get("especificacoes"));
            String modelo3d = texto(b.get("modelo3d"));
            long id = celulares.criar(c.marca, c.modelo, b.get("preco").numberValue(), c.descricao,
                    idusuario, spec, modelo3d);
            // Busca assíncrona (specs-service via Kafka) do que veio faltando; nunca quebra a resposta.
            if (spec == null || modelo3d == null) {
                eventos.celularCriado(id, c.marca, c.modelo, spec == null, modelo3d == null);
            }
            Map<String, Object> celular = new LinkedHashMap<>();
            celular.put("idcelular", id);
            celular.put("marca", c.marca);
            celular.put("modelo", c.modelo);
            celular.put("preco", b.get("preco"));
            celular.put("descricao", c.descricao);
            celular.put("especificacoes", b.has("especificacoes") ? b.get("especificacoes") : null);
            celular.put("modelo3d", modelo3d);
            celular.put("idusuario", idusuario);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Celular criado com sucesso");
            r.put("celular", celular);
            return ResponseEntity.status(201).body(r);
        });
    }

    @PutMapping("/{id}")
    public Map<String, Object> atualizar(@PathVariable String id, HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        ObjectNode b = Esquemas.validar(Esquemas.CELULAR, corpo.ler(req));
        long idcelular = Parametros.idCelular(id);
        return Acao.executar("Erro ao atualizar celular", () -> {
            Map<String, Object> atual = idcelular > 0 ? celulares.porId(idcelular) : null;
            if (atual == null) throw ErroApi.de(404, "Celular não encontrado");
            if (!Objects.equals(atual.get("idusuario"), idusuario)) {
                throw ErroApi.de(403, "Você não tem permissão para atualizar este celular");
            }
            Campos c = campos(b);
            // sem os campos no corpo, mantém o que já estava salvo
            JsonNode spec = b.has("especificacoes")
                    ? nuloSeAusente(b.get("especificacoes")) : (JsonNode) atual.get("especificacoes");
            String modelo3d = b.has("modelo3d") ? texto(b.get("modelo3d")) : (String) atual.get("modelo3d");
            celulares.atualizar(idcelular, c.marca, c.modelo, b.get("preco").numberValue(), c.descricao, spec, modelo3d);
            Map<String, Object> celular = new LinkedHashMap<>();
            celular.put("idcelular", idcelular);
            celular.put("marca", c.marca);
            celular.put("modelo", c.modelo);
            celular.put("preco", b.get("preco"));
            celular.put("descricao", c.descricao);
            celular.put("especificacoes", spec);
            celular.put("modelo3d", modelo3d);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Celular atualizado com sucesso");
            r.put("celular", celular);
            return r;
        });
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> excluir(@PathVariable String id, HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        long idcelular = Parametros.idCelular(id);
        return Acao.executar("Erro ao deletar celular", () -> {
            Map<String, Object> atual = idcelular > 0 ? celulares.porId(idcelular) : null;
            if (atual == null) throw ErroApi.de(404, "Celular não encontrado");
            if (!Objects.equals(atual.get("idusuario"), idusuario)) {
                throw ErroApi.de(403, "Você não tem permissão para deletar este celular");
            }
            celulares.excluir(idcelular);
            return Map.of("mensagem", "Celular deletado com sucesso");
        });
    }

    private record Campos(String marca, String modelo, String descricao) {
    }

    /** Validações extras do controller Node depois do Joi (tamanho sem espaços nas pontas). */
    private static Campos campos(ObjectNode b) {
        String marca = b.get("marca").stringValue().strip();
        String modelo = b.get("modelo").stringValue().strip();
        if (marca.length() < 2 || marca.length() > 100 || modelo.length() < 2 || modelo.length() > 100) {
            throw ErroApi.de(400, ERRO_CAMPOS);
        }
        JsonNode d = b.get("descricao");
        String descricao = d != null && d.isString() && !d.stringValue().isEmpty() ? d.stringValue().strip() : "";
        return new Campos(marca, modelo, descricao);
    }

    private static JsonNode nuloSeAusente(JsonNode n) {
        return n == null || n.isNull() ? null : n;
    }

    private static String texto(JsonNode n) {
        return n == null || n.isNull() ? null : n.stringValue();
    }

    /** Acrescenta {@code imagens: [{idimagem, url}]} a cada celular. */
    List<Map<String, Object>> anexarImagens(List<Map<String, Object>> lista) {
        Map<Long, List<Long>> mapa;
        try {
            mapa = imagens.idsPorCelulares(lista.stream().map(c -> (Long) c.get("idcelular")).toList());
        } catch (DataAccessException e) {
            // banco ainda sem a tabela de fotos (migração não aplicada): segue sem fotos
            if (!semTabela(e)) throw e;
            LOG.warn("Tabela CelularImagens ausente; listando celulares sem fotos");
            mapa = Map.of();
        }
        List<Map<String, Object>> saida = new ArrayList<>(lista.size());
        for (Map<String, Object> c : lista) {
            Map<String, Object> copia = new LinkedHashMap<>(c);
            List<Map<String, Object>> fotos = new ArrayList<>();
            for (Long idimagem : mapa.getOrDefault((Long) c.get("idcelular"), List.of())) {
                Map<String, Object> f = new LinkedHashMap<>();
                f.put("idimagem", idimagem);
                f.put("url", ImagensController.url(idimagem));
                fotos.add(f);
            }
            copia.put("imagens", fotos);
            saida.add(copia);
        }
        return saida;
    }

    private static boolean semTabela(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof java.sql.SQLException s && (s.getErrorCode() == 1146 || "42S02".equals(s.getSQLState()))) {
                return true;
            }
        }
        return false;
    }
}
