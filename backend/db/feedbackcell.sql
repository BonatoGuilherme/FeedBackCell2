-- Database automatically created by MYSQL_DATABASE env var
-- This script creates tables for feedbackcell_db

USE `feedbackcell_db`;

-- Table: Usuarios
CREATE TABLE IF NOT EXISTS `Usuarios` (
  `idusuario` INT NOT NULL AUTO_INCREMENT,
  `Nome` VARCHAR(100) NOT NULL,
  `Email` VARCHAR(100) NOT NULL UNIQUE KEY,
  `Senha` VARCHAR(255) NOT NULL,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idusuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: Celulares
CREATE TABLE IF NOT EXISTS `Celulares` (
  `idcelular` INT NOT NULL AUTO_INCREMENT,
  `idusuario` INT NOT NULL,
  `Modelo` VARCHAR(100) NOT NULL,
  `Imagem` VARCHAR(500),
  `Descricao` TEXT,
  `Like` INT DEFAULT 0,
  `Deslike` INT DEFAULT 0,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcelular`),
  KEY `idx_usuario` (`idusuario`),
  CONSTRAINT `fk_Celulares_Usuarios` FOREIGN KEY (`idusuario`) 
    REFERENCES `Usuarios` (`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: Comentarios
CREATE TABLE IF NOT EXISTS `Comentarios` (
  `idcomentario` INT NOT NULL AUTO_INCREMENT,
  `idusuario` INT NOT NULL,
  `idcelular` INT NOT NULL,
  `texto` VARCHAR(500) NOT NULL,
  `dataCriacao` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idcomentario`),
  KEY `idx_usuario` (`idusuario`),
  KEY `idx_celular` (`idcelular`),
  CONSTRAINT `fk_Comentarios_Usuarios` FOREIGN KEY (`idusuario`) 
    REFERENCES `Usuarios` (`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_Comentarios_Celulares` FOREIGN KEY (`idcelular`) 
    REFERENCES `Celulares` (`idcelular`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
