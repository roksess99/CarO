-- Bijhouden welke nachtelijke taak op welke dag gedraaid heeft.
--
-- Dit is geen logboek maar een slot. De prijsmeting kan door drie dingen
-- aangeroepen worden — de cron-taak bij de hostingpartij, de klok in de server
-- zelf, en de knop in het beheerpaneel — en die mogen niet alle drie dezelfde
-- dag opnieuw de leverancier gaan bevragen.
--
-- De primaire sleutel (naam, dag) is wat dat afdwingt: wie als eerste een rij
-- weet weg te schrijven mag draaien, de rest krijgt "bestaat al" terug. Dat is
-- één statement en dus atomair; een controle in code ("heeft hij vandaag al
-- gedraaid?") zou twee processen allebei "nee" laten lezen.

CREATE TABLE job_runs (
  name        VARCHAR(40) NOT NULL,
  -- De dag in UTC, net als alle andere datums in deze database
  ran_on      DATE NOT NULL,
  started_at  DATETIME NOT NULL,
  -- Blijft leeg als de taak vastliep; dan zie je in het paneel dat hij hangt
  finished_at DATETIME NULL,
  -- Wat hij gedaan heeft: aantal artikelen, aantal verzoeken, fouten
  detail_json JSON NULL,
  PRIMARY KEY (name, ran_on),
  KEY ix_job_runs_started (name, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
