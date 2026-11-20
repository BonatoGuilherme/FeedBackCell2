package br.com.feedbackcell.core.usuarios;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.feedbackcell.core.auth.Jwt;
import br.com.feedbackcell.core.dados.CelularRepositorio;
import br.com.feedbackcell.core.dados.ComentarioRepositorio;
import br.com.feedbackcell.core.dados.ImagemRepositorio;
import br.com.feedbackcell.core.dados.UsuarioRepositorio;
import br.com.feedbackcell.core.eventos.EventosCelular;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** E-mail longo demais ou já em uso deve dar 400/409, nunca 500. */
@SpringBootTest(properties = {
        "app.jwt.secret=segredo-de-teste",
        "app.specs-service-url=http://127.0.0.1:1"})
@AutoConfigureMockMvc
class EmailUsuarioTest {

    @Autowired MockMvc mvc;
    @Autowired Jwt jwt;

    @MockitoBean CelularRepositorio celulares;
    @MockitoBean ImagemRepositorio imagens;
    @MockitoBean ComentarioRepositorio comentarios;
    @MockitoBean UsuarioRepositorio usuarios;
    @MockitoBean EventosCelular eventos;

    /** E-mail válido pelo formato (local com 60, domínio com 93), mas com 154 caracteres. */
    private static final String EMAIL_LONGO = "a".repeat(60) + "@" + "b".repeat(60) + "." + "c".repeat(28) + ".dev";

    private static String registro(String email) {
        return "{\"nome\":\"Teste QA\",\"email\":\"" + email + "\",\"senha\":\"SenhaQa123\"}";
    }

    private static String perfil(String email) {
        return "{\"nome\":\"Teste QA\",\"email\":\"" + email + "\"}";
    }

    @Test
    void cadastroComEmailMaiorQueAColunaDa400() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(registro(EMAIL_LONGO)))
                .andExpect(status().isBadRequest());
        verify(usuarios, never()).criar(anyString(), anyString(), anyString());
    }

    @Test
    void cadastroSimultaneoComMesmoEmailDa409() throws Exception {
        when(usuarios.emailExiste("dup@teste.com")).thenReturn(false);
        when(usuarios.criar(anyString(), eq("dup@teste.com"), anyString()))
                .thenThrow(new DuplicateKeyException("Duplicate entry"));
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(registro("dup@teste.com")))
                .andExpect(status().isConflict())
                .andExpect(content().json("{\"erro\":\"Email já cadastrado\"}", true));
    }

    @Test
    void perfilComEmailDeOutraContaDa409() throws Exception {
        when(usuarios.emailDeOutroUsuario("outro@teste.com", 7L)).thenReturn(true);
        mvc.perform(put("/usuarios/perfil").header("Authorization", "Bearer " + jwt.assinar(7L, "u7@teste.com"))
                        .contentType(MediaType.APPLICATION_JSON).content(perfil("outro@teste.com")))
                .andExpect(status().isConflict())
                .andExpect(content().json("{\"erro\":\"Email já cadastrado\"}", true));
        verify(usuarios, never()).atualizarPerfil(anyLong(), anyString(), anyString());
    }

    @Test
    void perfilEmCorridaComOutroCadastroDa409() throws Exception {
        doThrow(new DuplicateKeyException("Duplicate entry"))
                .when(usuarios).atualizarPerfil(eq(7L), anyString(), eq("corrida@teste.com"));
        mvc.perform(put("/usuarios/perfil").header("Authorization", "Bearer " + jwt.assinar(7L, "u7@teste.com"))
                        .contentType(MediaType.APPLICATION_JSON).content(perfil("corrida@teste.com")))
                .andExpect(status().isConflict());
    }

    @Test
    void perfilComEmailLongoDa400() throws Exception {
        mvc.perform(put("/usuarios/perfil").header("Authorization", "Bearer " + jwt.assinar(7L, "u7@teste.com"))
                        .contentType(MediaType.APPLICATION_JSON).content(perfil(EMAIL_LONGO)))
                .andExpect(status().isBadRequest());
        verify(usuarios, never()).atualizarPerfil(anyLong(), anyString(), anyString());
    }
}
