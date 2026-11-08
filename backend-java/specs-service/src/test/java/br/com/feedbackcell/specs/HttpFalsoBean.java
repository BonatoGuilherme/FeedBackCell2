package br.com.feedbackcell.specs;

import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;

/** Nos testes @QuarkusTest, troca o ClienteHttpJdk por respostas falsas (sem rede). */
@Alternative
@Priority(1)
@ApplicationScoped
public class HttpFalsoBean extends HttpFalso {
}
