package br.com.feedbackcell.core;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.Test;

/**
 * Sanidade do schema versionado (a validação contra um MySQL real é manual: os testes não têm banco).
 */
class MigracaoTest {

    private static String recurso(String caminho) throws Exception {
        try (InputStream in = MigracaoTest.class.getClassLoader().getResourceAsStream(caminho)) {
            assertThat(in).as(caminho).isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void v1TemTodasAsTabelasEOsIndicesFinais() throws Exception {
        String v1 = recurso("db/migration/V1__schema_inicial.sql");
        assertThat(v1).contains("CREATE TABLE `Usuarios`", "CREATE TABLE `Celulares`",
                "CREATE TABLE `CelularImagens`", "CREATE TABLE `Comentarios`",
                "`Especificacoes` JSON NULL", "`Modelo3d` VARCHAR(32) NULL",
                "idx_celulares_created_id", "idx_celulares_usuario_created_id",
                "idx_comentarios_celular_created_id", "idx_comentarios_usuario_created_id",
                "idx_imagens_celular_ordem");
        // índices que o backend Node removia por serem redundantes
        assertThat(v1).doesNotContain("KEY `idx_usuario`", "KEY `idx_celular`");
    }

    @Test
    void bancoExistenteRecebeBaselineNaVersao1() throws Exception {
        Properties p = new Properties();
        p.load(new java.io.StringReader(recurso("application.properties")));
        assertThat(p.getProperty("spring.flyway.baseline-on-migrate")).isEqualTo("true");
        assertThat(p.getProperty("spring.flyway.baseline-version")).isEqualTo("1");
        assertThat(p.getProperty("spring.flyway.enabled")).isEqualTo("${FLYWAY_ENABLED:true}");
        assertThat(p.getProperty("spring.datasource.url")).contains("${DB_NAME:feedbackcell_db}");
    }
}
