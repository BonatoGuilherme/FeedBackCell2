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
    void v2TrocaPrecoPorNotaDe1A5() throws Exception {
        String v2 = recurso("db/migration/V2__avaliacoes_sem_preco.sql");
        assertThat(v2).contains("ADD COLUMN `Nota` TINYINT NULL",
                "CHECK (`Nota` BETWEEN 1 AND 5)", "DROP COLUMN `Preco`");
    }

    @Test
    void v1NaoEhAlteradaPelaV2() throws Exception {
        // o Flyway guarda o checksum: editar a V1 quebra os bancos que já a aplicaram
        assertThat(recurso("db/migration/V1__schema_inicial.sql")).contains("`Preco` DECIMAL(10,2) NOT NULL");
    }

    @Test
    void v4GuardaOsCreditosDaMobileApiPorDia() throws Exception {
        assertThat(recurso("db/migration/V4__uso_creditos_mobileapi.sql"))
                .contains("CREATE TABLE `UsoCreditosMobileApi`", "PRIMARY KEY (`dia`)");
        // a V3 segue só com o limite por usuário (editar migração aplicada quebra o checksum)
        assertThat(recurso("db/migration/V3__uso_busca_especificacoes.sql")).doesNotContain("UsoCreditosMobileApi");
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
