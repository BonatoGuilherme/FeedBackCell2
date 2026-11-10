package br.com.feedbackcell.core.celulares;

import br.com.feedbackcell.core.auth.Autenticacao;
import br.com.feedbackcell.core.dados.CelularRepositorio;
import br.com.feedbackcell.core.dados.ImagemRepositorio;
import br.com.feedbackcell.core.web.Acao;
import br.com.feedbackcell.core.web.ErroApi;
import br.com.feedbackcell.core.web.Parametros;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Fotos dos celulares (controllers/celularImagensController.js). */
@RestController
@RequestMapping("/celulares")
public class ImagensController {

    public static final int MAX_IMAGEM_BYTES = 5 * 1024 * 1024;
    public static final int MAX_IMAGENS_POR_CELULAR = 10;
    private static final Set<String> TIPOS_ACEITOS = Set.of("image/jpeg", "image/png", "image/webp");
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};

    private final CelularRepositorio celulares;
    private final ImagemRepositorio imagens;
    private final Autenticacao auth;

    public ImagensController(CelularRepositorio celulares, ImagemRepositorio imagens, Autenticacao auth) {
        this.celulares = celulares;
        this.imagens = imagens;
        this.auth = auth;
    }

    public static String url(long idimagem) {
        return "/celulares/imagens/" + idimagem;
    }

    /** Identifica o formato pelo conteúdo (assinatura), não pelo header enviado. */
    public static String detectarMime(byte[] b) {
        if (b == null || b.length < 12) return null;
        if ((b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff) return "image/jpeg";
        if (Arrays.equals(Arrays.copyOf(b, 8), PNG)) return "image/png";
        if (new String(b, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(b, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) {
            return "image/webp";
        }
        return null;
    }

    /** Uma foto por requisição, corpo binário image/jpeg | image/png | image/webp. */
    @PostMapping("/{id}/imagens")
    public ResponseEntity<Map<String, Object>> enviar(@PathVariable String id, HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        byte[] corpo = lerCorpo(req);
        Long idcelular = Parametros.idFoto(id);
        if (idcelular == null) throw ErroApi.de(400, "ID inválido");
        if (corpo == null || corpo.length == 0) {
            throw ErroApi.de(415, "Envie a foto como JPEG, PNG ou WebP no corpo da requisição");
        }
        String mime = detectarMime(corpo);
        if (mime == null) throw ErroApi.de(415, "Formato de imagem não suportado (use JPEG, PNG ou WebP)");
        return Acao.executar("Erro ao enviar foto", () -> {
            verificarDono(idcelular, idusuario);
            int total = imagens.contar(idcelular);
            if (total >= MAX_IMAGENS_POR_CELULAR) {
                throw ErroApi.de(409, "Cada celular pode ter no máximo " + MAX_IMAGENS_POR_CELULAR + " fotos");
            }
            long idimagem = imagens.criar(idcelular, mime, corpo, total);
            Map<String, Object> imagem = new LinkedHashMap<>();
            imagem.put("idimagem", idimagem);
            imagem.put("mime", mime);
            imagem.put("tamanho", corpo.length);
            imagem.put("ordem", total);
            imagem.put("url", url(idimagem));
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("mensagem", "Foto enviada com sucesso");
            r.put("imagem", imagem);
            return ResponseEntity.status(201).body(r);
        });
    }

    @GetMapping("/{id}/imagens")
    public Map<String, Object> listar(@PathVariable String id) {
        Long idcelular = Parametros.idFoto(id);
        if (idcelular == null) throw ErroApi.de(400, "ID inválido");
        return Acao.executar("Erro ao listar fotos", () -> {
            List<Map<String, Object>> lista = imagens.listar(idcelular);
            lista.forEach(m -> m.put("url", url((Long) m.get("idimagem"))));
            return Map.of("imagens", lista);
        });
    }

    @GetMapping("/imagens/{idimagem}")
    public ResponseEntity<byte[]> servir(@PathVariable String idimagem) {
        Long id = Parametros.idFoto(idimagem);
        if (id == null) throw ErroApi.de(400, "ID inválido");
        return Acao.executar("Erro ao buscar foto", () -> {
            ImagemRepositorio.Foto foto = imagens.porId(id);
            if (foto == null) throw ErroApi.de(404, "Foto não encontrada");
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(foto.mime()))
                    .contentLength(foto.dados().length)
                    // o conteúdo de um id nunca muda, então pode ficar em cache
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                    .header("X-Content-Type-Options", "nosniff")
                    .header("Cross-Origin-Resource-Policy", "cross-origin")
                    .body(foto.dados());
        });
    }

    @DeleteMapping("/{id}/imagens/{idimagem}")
    public Map<String, Object> excluir(@PathVariable String id, @PathVariable String idimagem,
                                       HttpServletRequest req) {
        Long idusuario = auth.exigir(req).id();
        Long idcelular = Parametros.idFoto(id);
        Long idfoto = Parametros.idFoto(idimagem);
        if (idcelular == null || idfoto == null) throw ErroApi.de(400, "ID inválido");
        return Acao.executar("Erro ao remover foto", () -> {
            verificarDono(idcelular, idusuario);
            if (!imagens.excluir(idfoto, idcelular)) throw ErroApi.de(404, "Foto não encontrada");
            return Map.of("mensagem", "Foto removida com sucesso");
        });
    }

    private void verificarDono(long idcelular, Long idusuario) {
        Long dono = idcelular <= Integer.MAX_VALUE ? celulares.idDono(idcelular) : null;
        if (dono == null) throw ErroApi.de(404, "Celular não encontrado");
        if (!Objects.equals(dono, idusuario)) {
            throw ErroApi.de(403, "Você não tem permissão para alterar este celular");
        }
    }

    /**
     * express.raw: só lê corpos image/jpeg|png|webp (outros tipos ficam sem corpo -> 415)
     * e responde 413 acima de 5 MB.
     */
    private static byte[] lerCorpo(HttpServletRequest req) {
        String tipo = req.getContentType();
        if (tipo == null || !TIPOS_ACEITOS.contains(tipo.toLowerCase(Locale.ROOT).split(";")[0].trim())) return null;
        if (req.getContentLengthLong() > MAX_IMAGEM_BYTES) throw ErroApi.de(413, "Cada foto pode ter no máximo 5 MB");
        try (InputStream in = req.getInputStream()) {
            byte[] b = in.readNBytes(MAX_IMAGEM_BYTES + 1);
            if (b.length > MAX_IMAGEM_BYTES) throw ErroApi.de(413, "Cada foto pode ter no máximo 5 MB");
            return b;
        } catch (IOException e) {
            throw ErroApi.comStatus(400, "Corpo da requisição inválido");
        }
    }
}
