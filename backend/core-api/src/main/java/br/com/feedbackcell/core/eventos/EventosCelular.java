package br.com.feedbackcell.core.eventos;

import java.util.function.IntConsumer;

/**
 * Pede a busca automática de especificações/modelo 3D. Implementações nunca lançam exceção:
 * falha do specs-service não pode quebrar a requisição HTTP.
 */
public interface EventosCelular {

    /**
     * @param fim chamado exatamente uma vez, quando a busca termina (ou nem chegou a sair), com os
     *            créditos da MobileAPI que ela gastou (0 se nenhum ou se não for possível saber)
     */
    void celularCriado(long idcelular, String marca, String modelo,
                       boolean precisaEspecificacoes, boolean precisaModelo3d, IntConsumer fim);
}
