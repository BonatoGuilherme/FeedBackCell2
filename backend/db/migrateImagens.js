const { pool } = require("./connection");

// Cria a tabela de fotos dos celulares em bancos que já existiam antes dela.
async function migrateImagens() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS CelularImagens (
       idimagem INT NOT NULL AUTO_INCREMENT,
       idcelular INT NOT NULL,
       mime VARCHAR(40) NOT NULL,
       tamanho INT NOT NULL,
       dados MEDIUMBLOB NOT NULL,
       ordem INT NOT NULL DEFAULT 0,
       dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (idimagem),
       KEY idx_imagens_celular_ordem (idcelular, ordem, idimagem),
       CONSTRAINT fk_CelularImagens_Celulares FOREIGN KEY (idcelular)
         REFERENCES Celulares (idcelular) ON DELETE CASCADE ON UPDATE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

module.exports = migrateImagens;
