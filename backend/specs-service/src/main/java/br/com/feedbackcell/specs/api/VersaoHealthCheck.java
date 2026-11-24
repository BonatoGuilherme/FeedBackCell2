package br.com.feedbackcell.specs.api;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

/**
 * Mostra em /q/health (e /q/health/live) o commit em execução. O valor vem de RENDER_GIT_COMMIT,
 * que o Render define em cada deploy; o smoke test (.github/workflows/smoke.yml) usa esse campo
 * para saber quando o deploy novo subiu. Fora do Render fica "local".
 */
@Liveness
@ApplicationScoped
public class VersaoHealthCheck implements HealthCheck {

    private final String commit;

    public VersaoHealthCheck(@ConfigProperty(name = "RENDER_GIT_COMMIT", defaultValue = "local") String commit) {
        this.commit = commit;
    }

    @Override
    public HealthCheckResponse call() {
        return HealthCheckResponse.named("versao").up().withData("commit", commit).build();
    }
}
