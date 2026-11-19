-- Avaliação por nota (1 a 5) no lugar de preço.
-- Comentários antigos ficam com Nota NULL (não entram na média nem na contagem).

ALTER TABLE `Comentarios`
  ADD COLUMN `Nota` TINYINT NULL,
  ADD CONSTRAINT `chk_comentarios_nota` CHECK (`Nota` BETWEEN 1 AND 5);

-- Em produção isso apaga a coluna Preco com os valores que ela tiver.
ALTER TABLE `Celulares`
  DROP COLUMN `Preco`;
