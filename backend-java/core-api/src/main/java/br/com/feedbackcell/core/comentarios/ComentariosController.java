package br.com.feedbackcell.core.comentarios;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.dados.CelularRepositorio;
import br.com.feedbackcell.core.dados.ComentarioRepositorio;
import br.com.feedbackcell.core.usuarios.UsuariosController;
import br.com.feedbackcell.core.validacao.Esquemas;
import br.com.feedbackcell.core.web.Acao;
import br.com.feedbackcell.core.web.CorpoJson;
import br.com.feedbackcell.core.web.ErroApi;
import br.com.feedbackcell.core.web.Parametros;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.node.ObjectNode;

/** Rotas /comentarios (controllers/comentariosController.js). */
@RestController
@RequestMapping("/comentarios")
public class ComentariosController {

    private final ComentarioRepositorio comentarios;
    private final CelularRepositorio celulares;
    private final Autenticacao auth;
    private final CorpoJson corpo;

    public ComentariosController(ComentarioRepositorio comentarios, CelularRepositorio celulares,
                                 Autenticacao auth, CorpoJson corpo) {
        this.comentarios = comentarios;
        this.celulares = celulares;
        this.auth = auth;
        this.corpo = corpo;
    }

    @GetMapping("/meus-comentarios")
    public Map<String, Object> meusComentarios(HttpServletRequest req) {
        Long id = auth.exigir(req).id();
        return Acao.executar("Erro ao buscar seus comentários", () -> {
            List<Map<String, Object>> lista = id == null ? List.of() : comentarios.doUsuario(id);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("total", lista.size());
            r.put("comentarios", lista);
            return r;
        });
    }

    @GetMapping("/{idcelular}")
    public Map<String, Object> doCelular(@PathVariable String idcelular, HttpServletRequest req) {
        Long celularId = Parametros.idJs(idcelular);
        if (celularId == null) throw ErroApi.de(400, "ID do celular inválido");
        Parametros.Paginacao p = Parametros.paginacao(req);
        if (p == null) throw ErroApi.de(400, Parametros.ERRO_PAGINACAO);
        return Acao.executar("Erro ao buscar comentários", () -> {
            if (!existeCelular(celularId)) throw ErroApi.de(404, "Celular não encontrado");
            List<Map<String, Object>> lista = comentarios.doCelular(celularId, p.limit(), p.offset());
            long total = comentarios.contarDoCelular(celularId);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("comentarios", lista);
            r.put("paginacao", UsuariosController.paginacao(p, total));
            return r;
        });
    }

    @PostMapping("/{idcelular}")
    public ResponseEntity<Map<String, Object>> criar(@PathVariable String idcelular, HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        ObjectNode b = Esquemas.validar(Esquemas.COMENTARIO, corpo.ler(req));
        Long celularId = Parametros.idJs(idcelular);
        if (celularId == null) throw ErroApi.de(400, "ID do celular inválido");
        String texto = b.get("texto").stringValue().strip();
        if (texto.isEmpty()) throw ErroApi.de(400, "Texto do comentário é obrigatório");
        if (texto.length() < 3) throw ErroApi.de(400, "Comentário deve ter pelo menos 3 caracteres");
        if (texto.length() > 500) throw ErroApi.de(400, "Comentário não pode ter mais de 500 caracteres");
        return Acao.executar("Erro ao criar comentário", () -> {
            if (!existeCelular(celularId)) throw ErroApi.de(404, "Celular não encontrado");
            if (idusuario == null) throw new IllegalStateException("Token sem idusuario numérico");
            long id = comentarios.criar(celularId, idusuario, texto);
            Map<String, Object> comentario = new LinkedHashMap<>();
            comentario.put("idcomentario", id);
            comentario.put("idcelular", celularId);
            comentario.put("idusuario", idusuario);
            comentario.put("texto", texto);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Comentário criado com sucesso");
            r.put("comentario", comentario);
            return ResponseEntity.status(201).body(r);
        });
    }

    @DeleteMapping("/{idcelular}/{idcomentario}")
    public Map<String, Object> excluir(@PathVariable String idcelular, @PathVariable String idcomentario,
                                       HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        Long celularId = Parametros.idJs(idcelular);
        Long comentarioId = Parametros.idJs(idcomentario);
        if (celularId == null) throw ErroApi.de(400, "ID do celular inválido");
        if (comentarioId == null) throw ErroApi.de(400, "ID do comentário inválido");
        return Acao.executar("Erro ao deletar comentário", () -> {
            ComentarioRepositorio.Dono c = comentarioId <= Integer.MAX_VALUE ? comentarios.porId(comentarioId) : null;
            if (c == null || c.idcelular() != celularId) throw ErroApi.de(404, "Comentário não encontrado");
            if (idusuario == null || c.idusuario() != idusuario) {
                throw ErroApi.de(403, "Você não tem permissão para deletar este comentário");
            }
            comentarios.excluir(comentarioId);
            return Map.of("mensagem", "Comentário deletado com sucesso");
        });
    }

    private boolean existeCelular(long id) {
        return id <= Integer.MAX_VALUE && celulares.porId(id) != null;
    }
}
