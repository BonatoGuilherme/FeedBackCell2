-- Créditos da MobileAPI já gastos por dia (UTC, como o teto do specs-service). O specs-service guarda
-- o teto em memória e zera ao reiniciar; aqui ele sobrevive. O total do mês é a soma dos dias do mês.
CREATE TABLE `UsoCreditosMobileApi` (
  `dia` DATE NOT NULL,
  `creditos` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`dia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
