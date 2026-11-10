package br.com.feedbackcell.core.eventos;

/**
 * Pede a busca automática de especificações/modelo 3D. Implementações nunca lançam exceção:
 * falha do specs-service não pode quebrar a requisição HTTP.
 */
public interface EventosCelular {

    void celularCriado(long idcelular, String marca, String modelo,
                       boolean precisaEspecificacoes, boolean precisaModelo3d);
}
