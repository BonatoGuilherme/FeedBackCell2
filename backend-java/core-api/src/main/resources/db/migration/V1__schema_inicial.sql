-- Schema inicial do FeedBackCELL.
-- Equivale ao estado final que o antigo backend Node produzia: backend/db/feedbackcell.sql
-- + migrateCelulares (Marca, Preco, Especificacoes, Modelo3d) + migrateImagens (CelularImagens)
-- + migrateIndexes (índices de listagem; idx_usuario/idx_celular removidos por redundância).
-- Bancos que já estavam nesse estado recebem baseline na versão 1 (spring.flyway.baseline-*).

CREATE TABLE `Usuarios` (
  `idusuario` INT NOT NULL AUTO_INCREMENT,
  `Nome` VARCHAR(100) NOT NULL,
  `Email` VARCHAR(100) NOT NULL UNIQUE KEY,
  `Senha` VARCHAR(255) NOT NULL,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idusuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Celulares` (
  `idcelular` INT NOT NULL AUTO_INCREMENT,
  `idusuario` INT NOT NULL,
  `Marca` VARCHAR(100) NOT NULL DEFAULT 'Não informada',
  `Modelo` VARCHAR(100) NOT NULL,
  `Preco` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `Imagem` VARCHAR(500),
  `Descricao` TEXT,
  `Especificacoes` JSON NULL,
  `Modelo3d` VARCHAR(32) NULL,
  `Like` INT DEFAULT 0,
  `Deslike` INT DEFAULT 0,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcelular`),
  -- listagem geral: ORDER BY dataCriacao DESC, idcelular DESC
  KEY `idx_celulares_created_id` (`dataCriacao` DESC, `idcelular` DESC),
  -- "meus itens" (e índice da FK de idusuario)
  KEY `idx_celulares_usuario_created_id` (`idusuario`, `dataCriacao` DESC, `idcelular` DESC),
  CONSTRAINT `fk_Celulares_Usuarios` FOREIGN KEY (`idusuario`)
    REFERENCES `Usuarios` (`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fotos dos celulares, guardadas no próprio banco.
CREATE TABLE `CelularImagens` (
  `idimagem` INT NOT NULL AUTO_INCREMENT,
  `idcelular` INT NOT NULL,
  `mime` VARCHAR(40) NOT NULL,
  `tamanho` INT NOT NULL,
  `dados` MEDIUMBLOB NOT NULL,
  `ordem` INT NOT NULL DEFAULT 0,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idimagem`),
  KEY `idx_imagens_celular_ordem` (`idcelular`, `ordem`, `idimagem`),
  CONSTRAINT `fk_CelularImagens_Celulares` FOREIGN KEY (`idcelular`)
    REFERENCES `Celulares` (`idcelular`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Comentarios` (
  `idcomentario` INT NOT NULL AUTO_INCREMENT,
  `idusuario` INT NOT NULL,
  `idcelular` INT NOT NULL,
  `texto` VARCHAR(500) NOT NULL,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcomentario`),
  -- comentários de um celular (e índice da FK de idcelular)
  KEY `idx_comentarios_celular_created_id` (`idcelular`, `dataCriacao` DESC, `idcomentario` DESC),
  -- "meus comentários" (e índice da FK de idusuario)
  KEY `idx_comentarios_usuario_created_id` (`idusuario`, `dataCriacao` DESC, `idcomentario` DESC),
  CONSTRAINT `fk_Comentarios_Usuarios` FOREIGN KEY (`idusuario`)
    REFERENCES `Usuarios` (`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Comentarios_Celulares` FOREIGN KEY (`idcelular`)
    REFERENCES `Celulares` (`idcelular`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
