package br.com.feedbackcell.core.eventos;

/**
 * Publica pedidos de busca de especificações. Implementações nunca lançam exceção:
 * falha do Kafka não pode quebrar a requisição HTTP.
 */
public interface EventosCelular {

    String TOPICO_CRIADO = "feedbackcell.celular.criado";
    String TOPICO_ESPECIFICACOES = "feedbackcell.celular.especificacoes";

    void celularCriado(long idcelular, String marca, String modelo,
                       boolean precisaEspecificacoes, boolean precisaModelo3d);
}
