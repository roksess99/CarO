-- Track & trace naar de klant: de vervoerder erbij, en wanneer het bericht
-- eruit ging.
--
-- `orders.tracking_code` stond sinds 0001 al in de tabel, met het commentaar
-- "de track & trace die hij van de vervoerder krijgt" — maar er heeft nooit
-- iets in gestaan: geen enkele regel code schreef of las hem. Nu wel.
--
-- Drie dingen veranderen:
--
-- 1. **VARCHAR(64) wordt 255.** De beheerder plakt een lijn uit de mail van de
--    vervoerder, en dat is een URL. `https://jouw.postnl.nl/track-and-trace/
--    3SDFC1234567890-NL-7038DE` is 72 tekens, en DHL en GLS hangen er een
--    querystring achter. 64 tekens kapt die stil af — precies de fout van
--    0011, waar een afgekapt betaalkenmerk twee betaalde bestellingen liet
--    hangen (@docs/DECISIONS.md #30). Een afgekapte link geeft de klant een
--    404 bij de vervoerder.
-- 2. **`tracking_carrier`** zegt wélke vervoerder het is. Nodig om van een
--    kale code een werkende link te maken, en de klant leest het ook in de
--    mail: "PostNL, 3SDFC…" zegt hem waar hij moet zijn.
-- 3. **`tracking_sent_at`** is het bewijs dat het bericht de deur uit is. Een
--    gevulde code is dat niet: als de mail mislukt staat de code er wel en is
--    de klant nog niets wijzer. Het scherm leest dit veld, niet de code.
--
-- Alleen toevoegen en verbreden, zoals elke migratie hier (#25): bestaande
-- waarden blijven ongemoeid en elke bestaande waarde past nog.

ALTER TABLE orders
  MODIFY COLUMN tracking_code VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS tracking_carrier VARCHAR(16) NULL AFTER tracking_code,
  ADD COLUMN IF NOT EXISTS tracking_sent_at DATETIME NULL AFTER tracking_carrier;
