package br.com.feedbackcell.core.auth;

import br.com.feedbackcell.core.dados.UsuarioRepositorio;
import br.com.feedbackcell.core.validacao.Esquemas;
import br.com.feedbackcell.core.web.Acao;
import br.com.feedbackcell.core.web.CorpoJson;
import br.com.feedbackcell.core.web.ErroApi;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** Rotas /auth (controllers/authController.js). */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger LOG = LoggerFactory.getLogger(AuthController.class);

    private final UsuarioRepositorio usuarios;
    private final Senhas senhas;
    private final Jwt jwt;
    private final CorpoJson corpo;

    public AuthController(UsuarioRepositorio usuarios, Senhas senhas, Jwt jwt, CorpoJson corpo) {
        this.usuarios = usuarios;
        this.senhas = senhas;
        this.jwt = jwt;
        this.corpo = corpo;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registrar(HttpServletRequest req) {
        ObjectNode b = Esquemas.validar(Esquemas.REGISTRO, corpo.ler(req));
        return Acao.executar("Erro ao registrar usuário", () -> {
            String nome = b.get("nome").stringValue();
            String email = b.get("email").stringValue();
            if (usuarios.emailExiste(email)) throw ErroApi.de(409, "Email já cadastrado");
            long id = usuarios.criar(nome, email, senhas.hash(b.get("senha").stringValue()));
            Map<String, Object> usuario = new LinkedHashMap<>();
            usuario.put("idusuario", id);
            usuario.put("nome", nome);
            usuario.put("email", email);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Usuário registrado com sucesso");
            r.put("usuario", usuario);
            return ResponseEntity.status(201).body(r);
        });
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(HttpServletRequest req) {
        ObjectNode b = Esquemas.validar(Esquemas.LOGIN, corpo.ler(req));
        return Acao.executar("Erro ao fazer login", () -> {
            UsuarioRepositorio.Credenciais u = usuarios.porEmail(b.get("email").stringValue());
            if (u == null || !senhas.confere(b.get("senha").stringValue(), u.senha())) {
                throw ErroApi.de(401, "Email ou senha inválidos");
            }
            Map<String, Object> usuario = new LinkedHashMap<>();
            usuario.put("idusuario", u.idusuario());
            usuario.put("nome", u.nome());
            usuario.put("email", u.email());
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Login realizado com sucesso");
            r.put("token", jwt.assinar(u.idusuario(), u.email()));
            r.put("usuario", usuario);
            return ResponseEntity.ok(r);
        });
    }

    /** Com JWT o logout é feito no cliente, removendo o token. */
    @PostMapping("/logout")
    public Map<String, Object> logout() {
        return Map.of("mensagem", "Logout realizado com sucesso no cliente");
    }

    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verificar(HttpServletRequest req) {
        String token = Autenticacao.token(req);
        if (token == null) throw ErroApi.de(401, "Token não fornecido");
        JsonNode payload;
        try {
            payload = jwt.verificar(token);
        } catch (Jwt.ErroToken e) {
            if (e.falha() == Jwt.Falha.EXPIRADO) throw ErroApi.de(401, "Token expirado");
            if (e.falha() == Jwt.Falha.INVALIDO) throw ErroApi.de(401, "Token inválido");
            LOG.error("Erro na verificação: {}", e.getMessage());
            throw ErroApi.de(500, "Erro ao verificar token");
        }
        return Acao.executar("Erro ao verificar token", () -> {
            JsonNode id = payload.get("idusuario");
            Map<String, Object> usuario = id != null && id.isIntegralNumber() && id.canConvertToLong()
                    ? usuarios.resumo(id.asLong()) : null;
            if (usuario == null) throw ErroApi.de(404, "Usuário não encontrado");
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Token válido");
            r.put("usuario", usuario);
            return ResponseEntity.ok(r);
        });
    }
}
