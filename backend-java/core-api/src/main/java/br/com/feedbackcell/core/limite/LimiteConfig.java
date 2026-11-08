package br.com.feedbackcell.core.limite;

import br.com.feedbackcell.core.config.Configuracao;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Redis quando RATE_LIMIT_REDIS_URL existe (obrigatório em produção); senão memória local. */
@Configuration
public class LimiteConfig {

    private static final Logger LOG = LoggerFactory.getLogger(LimiteConfig.class);

    @Bean
    public ArmazemLimite armazemLimite(Configuracao config) {
        if (config.redisUrl() == null) {
            LOG.warn("Redis de rate limit não configurado; usando memória local.");
            return new ArmazemMemoria();
        }
        return new ArmazemRedis(config.redisUrl());
    }
}
