package br.com.feedbackcell.core.usuarios;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.auth.Senhas;
import br.com.feedbackcell.core.dados.UsuarioRepositorio;
import br.com.feedbackcell.core.validacao.Esquemas;
import br.com.feedbackcell.core.web.Acao;
import br.com.feedbackcell.core.web.CorpoJson;
import br.com.feedbackcell.core.web.ErroApi;
import br.com.feedbackcell.core.web.Parametros;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.node.ObjectNode;

/** Rotas /usuarios (controllers/usuariosController.js). */
@RestController
@RequestMapping("/usuarios")
public class UsuariosController {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final UsuarioRepositorio usuarios;
    private final Autenticacao auth;
    private final Senhas senhas;
    private final CorpoJson corpo;

    public UsuariosController(UsuarioRepositorio usuarios, Autenticacao auth, Senhas senhas, CorpoJson corpo) {
        this.usuarios = usuarios;
        this.auth = auth;
        this.senhas = senhas;
        this.corpo = corpo;
    }

    @GetMapping("/perfil")
    public Map<String, Object> perfil(HttpServletRequest req) {
        Long id = auth.exigir(req).id();
        return Acao.executar("Erro ao buscar perfil", () -> {
            Map<String, Object> u = id == null ? null : usuarios.perfil(id);
            if (u == null) throw ErroApi.de(404, "Usuário não encontrado");
            return u;
        });
    }

    @PutMapping("/perfil")
    public Map<String, Object> atualizarPerfil(HttpServletRequest req) {
        Long id = auth.exigir(req).id();
        ObjectNode b = Esquemas.validar(Esquemas.PERFIL, corpo.ler(req));
        String nome = b.get("nome").stringValue().strip();
        String email = b.get("email").stringValue().strip();
        if (nome.length() < 3) throw ErroApi.de(400, "Nome deve ter pelo menos 3 caracteres");
        if (!EMAIL.matcher(b.get("email").stringValue()).matches()) throw ErroApi.de(400, "Email inválido");
        return Acao.executar("Erro ao atualizar perfil", () -> {
            if (id != null) usuarios.atualizarPerfil(id, nome, email);
            Map<String, Object> u = new LinkedHashMap<>();
            u.put("idusuario", id);
            u.put("Nome", nome);
            u.put("Email", email);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Perfil atualizado com sucesso");
            r.put("usuario", u);
            return r;
        });
    }

    @PutMapping("/senha")
    public Map<String, Object> atualizarSenha(HttpServletRequest req) {
        Long id = auth.exigir(req).id();
        ObjectNode b = Esquemas.validar(Esquemas.SENHA, corpo.ler(req));
        String novaSenha = b.get("novaSenha").stringValue();
        if (novaSenha.length() < 6) throw ErroApi.de(400, "Nova senha deve ter pelo menos 6 caracteres");
        return Acao.executar("Erro ao atualizar senha", () -> {
            String hash = id == null ? null : usuarios.hashSenha(id);
            if (hash == null) throw ErroApi.de(404, "Usuário não encontrado");
            if (!senhas.confere(b.get("senhaAtual").stringValue(), hash)) {
                throw ErroApi.de(401, "Senha atual incorreta");
            }
            usuarios.atualizarSenha(id, senhas.hash(novaSenha));
            return Map.of("mensagem", "Senha atualizada com sucesso");
        });
    }

    @DeleteMapping("/conta")
    public Map<String, Object> excluirConta(HttpServletRequest req) {
        Long id = auth.exigir(req).id();
        ObjectNode b = Esquemas.validar(Esquemas.EXCLUIR_CONTA, corpo.ler(req));
        return Acao.executar("Erro ao deletar conta", () -> {
            String hash = id == null ? null : usuarios.hashSenha(id);
            if (hash == null) throw ErroApi.de(404, "Usuário não encontrado");
            if (!senhas.confere(b.get("senha").stringValue(), hash)) throw ErroApi.de(401, "Senha incorreta");
            usuarios.excluir(id);
            return Map.of("mensagem", "Conta deletada com sucesso");
        });
    }

    /** Lista paginada de usuários (apenas ADMIN_USER_IDS). */
    @GetMapping({"", "/"})
    public Map<String, Object> listar(HttpServletRequest req) {
        auth.exigirAdmin(auth.exigir(req));
        Parametros.Paginacao p = Parametros.paginacao(req);
        if (p == null) throw ErroApi.de(400, Parametros.ERRO_PAGINACAO);
        return Acao.executar("Erro ao listar usuários", () -> {
            List<Map<String, Object>> lista = usuarios.listar(p.limit(), p.offset());
            long total = usuarios.contar();
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("usuarios", lista);
            r.put("paginacao", paginacao(p, total));
            return r;
        });
    }

    public static Map<String, Object> paginacao(Parametros.Paginacao p, long total) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("paginaAtual", p.page());
        m.put("totalPaginas", (total + p.limit() - 1) / p.limit());
        m.put("totalItems", total);
        m.put("itemsPorPagina", p.limit());
        return m;
    }
}
