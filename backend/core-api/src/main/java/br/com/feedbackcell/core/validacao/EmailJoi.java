package br.com.feedbackcell.core.validacao;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * Aproximação do {@code Joi.string().email()} (biblioteca @hapi/address): local até 64 bytes
 * com os caracteres de atom, domínio com pelo menos 2 segmentos e TLD alfabético.
 * O Joi também confere o TLD contra a lista da IANA; aqui basta ter 2+ letras.
 */
final class EmailJoi {

    private static final Pattern LOCAL = Pattern.compile(
            "^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$");
    private static final Pattern ROTULO = Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$");
    private static final Pattern TLD = Pattern.compile("^[A-Za-z]{2,63}$");

    private EmailJoi() {
    }

    static boolean valido(String email) {
        int arroba = email.lastIndexOf('@');
        if (arroba <= 0 || arroba != email.indexOf('@') || email.length() > 254) return false;
        String local = email.substring(0, arroba);
        String dominio = email.substring(arroba + 1);
        if (local.getBytes(StandardCharsets.UTF_8).length > 64 || !LOCAL.matcher(local).matches()) return false;
        if (dominio.length() > 253) return false;
        String[] rotulos = dominio.split("\\.", -1);
        if (rotulos.length < 2) return false;
        for (String r : rotulos) {
            if (!ROTULO.matcher(r).matches()) return false;
        }
        return TLD.matcher(rotulos[rotulos.length - 1]).matches();
    }
}
