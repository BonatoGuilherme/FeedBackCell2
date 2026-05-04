-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema feedbackcell_db
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema feedbackcell_db
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `feedbackcell_db` DEFAULT CHARACTER SET utf8 ;
USE `feedbackcell_db` ;

-- -----------------------------------------------------
-- Table `feedbackcell_db`.`Usuarios`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedbackcell_db`.`Usuarios` (
  `idusuario` INT NOT NULL AUTO_INCREMENT,
  `Nome` VARCHAR(45) NOT NULL,
  `Email` VARCHAR(45) NOT NULL,
  `Senha` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`idusuario`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `feedbackcell_db`.`Celulares`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedbackcell_db`.`Celulares` (
  `idcelular` INT NOT NULL AUTO_INCREMENT,
  `Modelo` VARCHAR(45) NOT NULL,
  `Imagem` VARCHAR(200) NOT NULL,
  `Like` VARCHAR(45) NULL,
  `Deslike` VARCHAR(45) NULL,
  PRIMARY KEY (`idcelular`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `feedbackcell_db`.`Comentarios`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedbackcell_db`.`Comentarios` (
  `idcomentarios` INT NOT NULL AUTO_INCREMENT,
  `idusuario` INT NOT NULL,
  `idcelular` INT NOT NULL,
  `Text` VARCHAR(400) NOT NULL,
  `Data_hora` DATETIME NULL,
  `Celulares_idcelular` INT NOT NULL,
  `Usuarios_idusuario` INT NOT NULL,
  PRIMARY KEY (`idcomentarios`),
  INDEX `fk_Comentarios_Celulares_idx` (`Celulares_idcelular` ASC) VISIBLE,
  INDEX `fk_Comentarios_Usuarios1_idx` (`Usuarios_idusuario` ASC) VISIBLE,
  CONSTRAINT `fk_Comentarios_Celulares`
    FOREIGN KEY (`Celulares_idcelular`)
    REFERENCES `feedbackcell_db`.`Celulares` (`idcelular`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Comentarios_Usuarios1`
    FOREIGN KEY (`Usuarios_idusuario`)
    REFERENCES `feedbackcell_db`.`Usuarios` (`idusuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
