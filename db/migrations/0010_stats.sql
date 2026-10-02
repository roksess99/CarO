-- ===========================================================================
--  BEZOEKCIJFERS
-- ===========================================================================
--
-- Eigen tellers in plaats van een analysedienst van een derde. De reden is
-- niet principieel maar praktisch: zodra er een script van buiten op de site
-- staat is een toestemmingsbanner verplicht, en dan meet je nog maar de helft
-- van je bezoekers — juist de helft die toestemming gaf, en dat is geen
-- willekeurige groep (@docs/DECISIONS.md #24).
--
-- Drie dingen bepalen de vorm van deze tabel:
--
-- 1. **Er wordt niets over een persoon bewaard.** Geen IP-adres, geen
--    vingerafdruk, geen sleutel op het apparaat van de bezoeker. Wat hier
--    staat is per dag een getal per soort gebeurtenis. Daarmee is er niets te
--    herleiden en hoeft er niets in de privacyverklaring bij te komen.
-- 2. **Per dag opgeteld, niet per gebeurtenis een rij.** Een winkel met
--    duizend bezoeken per dag levert zo een handvol rijen op in plaats van
--    duizenden. Een jaar past in een paar duizend regels, en het uitlezen is
--    één groepering.
-- 3. **Ophogen gebeurt met ON DUPLICATE KEY UPDATE**, dus zonder eerst te
--    lezen. Twee bezoekers tegelijk kunnen elkaars telling niet overschrijven;
--    dat is dezelfde reden waarom de factuurteller in de database zit en niet
--    in code (@docs/DECISIONS.md #13).
--
-- Wat er NIET in staat en bewust ontbreekt: het aantal betaalde bestellingen.
-- Dat telt het dashboard uit `orders`, want dat is de waarheid. Een tweede
-- telling ernaast loopt vroeg of laat uit de pas met de eerste.

CREATE TABLE IF NOT EXISTS stats_daily (
  -- De dag in de tijdzone van de server. Geen tijdstip: een uurverdeling
  -- zegt bij deze aantallen niets en verdrievoudigt het aantal rijen.
  stat_date DATE NOT NULL,

  -- Welke gebeurtenis. De lijst staat in src/lib/stats/types.ts en het
  -- ontvangstadres weigert alles wat daar niet in staat.
  metric VARCHAR(32) NOT NULL,

  -- Verbijzondering binnen de gebeurtenis: bij `pageview` het soort pagina
  -- (home, familie, categorie, product), bij `source` de herkomst
  -- (google, direct, overig). Leeg waar het niet van toepassing is.
  label VARCHAR(48) NOT NULL DEFAULT '',

  total INT UNSIGNED NOT NULL DEFAULT 0,

  PRIMARY KEY (stat_date, metric, label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
