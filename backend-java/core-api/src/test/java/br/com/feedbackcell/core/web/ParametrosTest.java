package br.com.feedbackcell.core.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.feedbackcell.core.celulares.ImagensController;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/** Portado de backend/test/pagination.test.js e das regras de id dos controllers. */
class ParametrosTest {

    private static Parametros.Paginacao pag(String page, String limit) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        if (page != null) req.addParameter("page", page);
        if (limit != null) req.addParameter("limit", limit);
        return Parametros.paginacao(req);
    }

    @Test
    void paginacaoPadraoEValida() {
        assertThat(pag(null, null)).isEqualTo(new Parametros.Paginacao(1, 10));
        assertThat(pag("3", "100")).isEqualTo(new Parametros.Paginacao(3, 100));
        assertThat(pag("2", "5").offset()).isEqualTo(5);
    }

    @Test
    void paginacaoInvalida() {
        assertThat(pag("0", null)).isNull();
        assertThat(pag("-1", null)).isNull();
        assertThat(pag("1.5", null)).isNull();
        assertThat(pag("01", null)).isNull();
        assertThat(pag(null, "101")).isNull();
        assertThat(pag("abc", null)).isNull();
        assertThat(pag("99999999999999999999", null)).isNull();
        MockHttpServletRequest repetido = new MockHttpServletRequest();
        repetido.addParameter("page", "1", "2");
        assertThat(Parametros.paginacao(repetido)).isNull();
    }

    @Test
    void idComoNumberDoJavascript() {
        assertThat(Parametros.idJs("15")).isEqualTo(15);
        assertThat(Parametros.idJs("1e1")).isEqualTo(10);
        assertThat(Parametros.idJs(" 7 ")).isEqualTo(7);
        assertThat(Parametros.idJs("0x10")).isEqualTo(16);
        assertThat(Parametros.idJs("0")).isNull();
        assertThat(Parametros.idJs("1.5")).isNull();
        assertThat(Parametros.idJs("not-a-number")).isNull();
    }

    @Test
    void idDeCelularSoRecusaNaN() {
        assertThat(Parametros.idCelular("16")).isEqualTo(16);
        assertThat(Parametros.idCelular("1.5")).isEqualTo(-1);
        assertThat(Parametros.idCelular("99999999999")).isEqualTo(-1);
        assertThatThrownBy(() -> Parametros.idCelular("abc")).isInstanceOf(ErroApi.class);
    }

    @Test
    void idDeFoto() {
        assertThat(Parametros.idFoto("9999999999")).isEqualTo(9_999_999_999L);
        assertThat(Parametros.idFoto("0")).isNull();
        assertThat(Parametros.idFoto("12345678901")).isNull();
        assertThat(Parametros.idFoto("1a")).isNull();
    }

    @Test
    void detectaFormatoPelaAssinatura() {
        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0};
        byte[] webp = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};
        assertThat(ImagensController.detectarMime(jpeg)).isEqualTo("image/jpeg");
        assertThat(ImagensController.detectarMime(png)).isEqualTo("image/png");
        assertThat(ImagensController.detectarMime(webp)).isEqualTo("image/webp");
        assertThat(ImagensController.detectarMime("0123456789ab".getBytes())).isNull();
        assertThat(ImagensController.detectarMime(new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff})).isNull();
    }
}
