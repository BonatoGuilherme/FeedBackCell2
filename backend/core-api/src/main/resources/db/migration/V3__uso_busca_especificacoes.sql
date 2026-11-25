-- Quantas buscas automáticas de especificações (que gastam crédito da MobileAPI) cada usuário já fez
-- em cada dia (dia no fuso America/Sao_Paulo). Guardar no banco faz o limite sobreviver a reinício do serviço.
CREATE TABLE `UsoBuscaEspecificacoes` (
  `idusuario` INT NOT NULL,
  `dia` DATE NOT NULL,
  `buscas` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`idusuario`, `dia`),
  CONSTRAINT `fk_UsoBusca_Usuarios` FOREIGN KEY (`idusuario`)
    REFERENCES `Usuarios` (`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
