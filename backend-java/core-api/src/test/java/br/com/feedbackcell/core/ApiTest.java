package br.com.feedbackcell.core;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.feedbackcell.core.auth.Jwt;
import br.com.feedbackcell.core.auth.Senhas;
import br.com.feedbackcell.core.celulares.ImagensController;
import br.com.feedbackcell.core.dados.CelularRepositorio;
import br.com.feedbackcell.core.dados.ComentarioRepositorio;
import br.com.feedbackcell.core.dados.ImagemRepositorio;
import br.com.feedbackcell.core.dados.UsuarioRepositorio;
import br.com.feedbackcell.core.eventos.EventosCelular;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Rotas HTTP com o banco simulado; portado dos testes de backend/test/*Routes e *Controller. */
@SpringBootTest(properties = {
        "app.jwt.secret=segredo-de-teste",
        "app.specs-service-url=http://127.0.0.1:1",
        "app.admin-user-ids=1"})
@AutoConfigureMockMvc
class ApiTest {

    @Autowired MockMvc mvc;
    @Autowired Jwt jwt;
    @Autowired Senhas senhas;
    @Autowired ApplicationContext contexto;

    @MockitoBean CelularRepositorio celulares;
    @MockitoBean ImagemRepositorio imagens;
    @MockitoBean ComentarioRepositorio comentarios;
    @MockitoBean UsuarioRepositorio usuarios;
    @MockitoBean EventosCelular eventos;

    private String bearer(long id) {
        return "Bearer " + jwt.assinar(id, "u" + id + "@teste.com");
    }

    private static Map<String, Object> celular(long id, long dono) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("idcelular", id);
        c.put("idusuario", dono);
        c.put("especificacoes", null);
        c.put("modelo3d", null);
        return c;
    }

    @Test
    void meusItensExigeAutenticacaoAntesDaRotaPorId() throws Exception {
        mvc.perform(get("/celulares/meus-itens"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"erro\":\"Token não fornecido\"}", true));
    }

    @Test
    void tokenInvalidoOuSemBearer() throws Exception {
        mvc.perform(get("/celulares/meus-itens").header("Authorization", "Bearer x.y.z"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().json("{\"erro\":\"Token inválido\"}", true));
        mvc.perform(get("/celulares/meus-itens").header("Authorization", "Bearer"))
                .andExpect(content().json("{\"erro\":\"Token não fornecido\"}", true));
    }

    @Test
    void listaComPaginacaoPadraoEFotos() throws Exception {
        when(celulares.listar(10, 0)).thenReturn(List.of(new LinkedHashMap<>(Map.of("idcelular", 1L))));
        when(celulares.contar()).thenReturn(1L);
        when(imagens.idsPorCelulares(List.of(1L))).thenReturn(Map.of(1L, List.of(5L)));
        mvc.perform(get("/celulares"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"celulares":[{"idcelular":1,"imagens":[{"idimagem":5,"url":"/celulares/imagens/5"}]}],
                         "paginacao":{"paginaAtual":1,"totalPaginas":1,"totalItems":1,"itemsPorPagina":10}}""", true));
    }

    @Test
    void paginacaoInvalidaNaoConsultaOBanco() throws Exception {
        mvc.perform(get("/celulares").param("limit", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json(
                        "{\"erro\":\"Página e limite devem ser inteiros positivos; limite máximo: 100\"}", true));
        verifyNoInteractions(celulares);
    }

    @Test
    void comentarioComIdInvalido() throws Exception {
        mvc.perform(get("/comentarios/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"erro\":\"ID do celular inválido\"}", true));
    }

    @Test
    void naoApagaComentarioPelaUrlDeOutroCelular() throws Exception {
        when(comentarios.porId(4)).thenReturn(new ComentarioRepositorio.Dono(4, 7, 2));
        mvc.perform(delete("/comentarios/1/4").header("Authorization", bearer(7)))
                .andExpect(status().isNotFound())
                .andExpect(content().json("{\"erro\":\"Comentário não encontrado\"}", true));
        verify(comentarios, never()).excluir(anyLong());
    }

    @Test
    void loginDaMesmaFalhaParaEmailDesconhecidoESenhaErrada() throws Exception {
        when(usuarios.porEmail("known@example.com")).thenReturn(
                new UsuarioRepositorio.Credenciais(1, "Known", "known@example.com", senhas.hash("correct-password")));
        String esperado = "{\"erro\":\"Email ou senha inválidos\"}";
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"missing@example.com\",\"senha\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(content().json(esperado, true));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"known@example.com\",\"senha\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized()).andExpect(content().json(esperado, true));
    }

    @Test
    void criarCelularSemEspecificacoesPublicaEvento() throws Exception {
        when(celulares.criar(eq("Samsung"), eq("Galaxy S24"), any(), eq(""), eq(3L), isNull(), isNull()))
                .thenReturn(42L);
        mvc.perform(post("/celulares").header("Authorization", bearer(3)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"marca\":\" Samsung \",\"modelo\":\"Galaxy S24\",\"preco\":\"10\"}"))
                .andExpect(status().isCreated())
                .andExpect(content().json("""
                        {"mensagem":"Celular criado com sucesso","celular":{"idcelular":42,"marca":"Samsung",
                         "modelo":"Galaxy S24","preco":10,"descricao":"","especificacoes":null,"modelo3d":null,
                         "idusuario":3}}""", true));
        verify(eventos).celularCriado(42L, "Samsung", "Galaxy S24", true, true);
    }

    @Test
    void criarCelularCompletoNaoPublicaEvento() throws Exception {
        when(celulares.criar(anyString(), anyString(), any(), anyString(), anyLong(), any(), anyString())).thenReturn(1L);
        mvc.perform(post("/celulares").header("Authorization", bearer(3)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"marca\":\"Apple\",\"modelo\":\"iPhone 15\",\"preco\":1,"
                                + "\"especificacoes\":{\"nome\":\"iPhone 15\"},\"modelo3d\":\"0123456789abcdef0123456789abcdef\"}"))
                .andExpect(status().isCreated());
        verifyNoInteractions(eventos);
    }

    @Test
    void validacaoDoCorpoListaTodosOsErros() throws Exception {
        mvc.perform(post("/celulares").header("Authorization", bearer(3)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"marca\":\"S\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("""
                        {"erro":"Validação falhou","detalhes":["\\"marca\\" length must be at least 2 characters long",
                         "\\"modelo\\" is required","\\"preco\\" is required"]}""", true));
    }

    @Test
    void jsonInvalidoDa400() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{nao é json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void atualizarCelularDeOutroDono() throws Exception {
        when(celulares.porId(2)).thenReturn(celular(2, 9));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/celulares/2")
                        .header("Authorization", bearer(3)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"marca\":\"Apple\",\"modelo\":\"iPhone\",\"preco\":1}"))
                .andExpect(status().isForbidden())
                .andExpect(content().json("{\"erro\":\"Você não tem permissão para atualizar este celular\"}", true));
    }

    /** Contrato do front: idcelular sempre número, mesmo com id de rota "007" (o Node ecoava a string). */
    @Test
    void atualizarCelularDevolveIdcelularNumerico() throws Exception {
        when(celulares.porId(7)).thenReturn(celular(7, 3));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/celulares/007")
                        .header("Authorization", bearer(3)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"marca\":\"Apple\",\"modelo\":\"iPhone 15\",\"preco\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.celular.idcelular").value(7))
                .andExpect(jsonPath("$.celular.idcelular").isNumber());
        verify(celulares).atualizar(eq(7L), eq("Apple"), eq("iPhone 15"), any(), eq(""), isNull(), isNull());
    }

    @Test
    void criarComentarioDevolveIdcelularNumerico() throws Exception {
        when(celulares.porId(5)).thenReturn(celular(5, 9));
        when(comentarios.criar(5L, 3L, "Muito bom")).thenReturn(11L);
        mvc.perform(post("/comentarios/5").header("Authorization", bearer(3)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texto\":\" Muito bom \"}"))
                .andExpect(status().isCreated())
                .andExpect(content().json("""
                        {"mensagem":"Comentário criado com sucesso",
                         "comentario":{"idcomentario":11,"idcelular":5,"idusuario":3,"texto":"Muito bom"}}""", true))
                .andExpect(jsonPath("$.comentario.idcelular").isNumber());
    }

    @Test
    void fotoAcimaDe5MbDa413() throws Exception {
        byte[] grande = new byte[ImagensController.MAX_IMAGEM_BYTES + 1];
        grande[0] = (byte) 0xff;
        grande[1] = (byte) 0xd8;
        grande[2] = (byte) 0xff;
        mvc.perform(post("/celulares/1/imagens").header("Authorization", bearer(3))
                        .contentType(MediaType.IMAGE_JPEG).content(grande))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(content().json("{\"erro\":\"Cada foto pode ter no máximo 5 MB\"}", true));
        verifyNoInteractions(imagens);
    }

    @Test
    void flywayDesligadoNosTestes() {
        assertThat(contexto.getBeanNamesForType(org.flywaydb.core.Flyway.class)).isEmpty();
    }

    @Test
    void fotoComTipoErradoOuConteudoInvalido() throws Exception {
        mvc.perform(post("/celulares/1/imagens").header("Authorization", bearer(3))
                        .contentType(MediaType.TEXT_PLAIN).content("abc"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(content().json(
                        "{\"erro\":\"Envie a foto como JPEG, PNG ou WebP no corpo da requisição\"}", true));
        mvc.perform(post("/celulares/1/imagens").header("Authorization", bearer(3))
                        .contentType(MediaType.IMAGE_PNG).content("0123456789abcdef"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(content().json("{\"erro\":\"Formato de imagem não suportado (use JPEG, PNG ou WebP)\"}", true));
        verifyNoInteractions(imagens);
    }

    @Test
    void limiteDeFotosPorCelular() throws Exception {
        when(celulares.porId(1)).thenReturn(celular(1, 3));
        when(imagens.contar(1)).thenReturn(10);
        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        mvc.perform(post("/celulares/1/imagens").header("Authorization", bearer(3))
                        .contentType(MediaType.IMAGE_JPEG).content(jpeg))
                .andExpect(status().isConflict())
                .andExpect(content().json("{\"erro\":\"Cada celular pode ter no máximo 10 fotos\"}", true));
        verify(imagens, never()).criar(anyLong(), anyString(), any(), anyInt());
    }

    @Test
    void servirFotoComCacheImutavel() throws Exception {
        when(imagens.porId(5)).thenReturn(new ImagemRepositorio.Foto(5, 1, "image/webp", new byte[]{1, 2, 3}));
        mvc.perform(get("/celulares/imagens/5"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/webp"))
                .andExpect(header().string("Cache-Control", "public, max-age=31536000, immutable"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(new byte[]{1, 2, 3}));
    }

    @Test
    void especificacoesValidaEDevolve503SemOSpecsService() throws Exception {
        mvc.perform(get("/celulares/especificacoes").param("modelo", "S24<script>").header("Authorization", bearer(3)))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"erro\":\"O nome do celular contém caracteres inválidos.\"}", true));
        mvc.perform(get("/celulares/especificacoes").param("modelo", "x").header("Authorization", bearer(3)))
                .andExpect(content().json("{\"erro\":\"Informe marca e modelo do celular.\"}", true));
        mvc.perform(get("/celulares/especificacoes").param("q", "Galaxy S24").header("Authorization", bearer(3)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().json("{\"erro\":\"Serviço de especificações indisponível\"}", true));
    }

    @Test
    void listaDeUsuariosSoParaAdmin() throws Exception {
        mvc.perform(get("/usuarios").header("Authorization", bearer(2)))
                .andExpect(status().isForbidden())
                .andExpect(content().json("{\"erro\":\"Acesso restrito a administradores\"}", true));
        when(usuarios.listar(10, 0)).thenReturn(List.of());
        when(usuarios.contar()).thenReturn(0L);
        mvc.perform(get("/usuarios").header("Authorization", bearer(1)))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"usuarios":[],"paginacao":{"paginaAtual":1,"totalPaginas":0,"totalItems":0,"itemsPorPagina":10}}""", true));
    }

    @Test
    void healthCorsERotaInexistente() throws Exception {
        mvc.perform(get("/health")).andExpect(content().json("{\"status\":\"ok\"}", true))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/celulares"))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE"));
        mvc.perform(get("/nao-existe")).andExpect(status().isNotFound());
    }
}
