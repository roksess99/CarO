-- ===========================================================================
--  RETOUREN
-- ===========================================================================
--
-- De klant meldt een retour aan op /nl/retour. Hij kiest per artikel hoeveel
-- er terug gaat, waarom, en krijgt een retournummer dat bij het pakket moet.
-- De beheerder ziet het verzoek in /beheer/retouren en zet het in drie
-- stappen af: aangevraagd → pakket ontvangen → terugbetaald.
--
-- Vier dingen die de vorm van deze tabellen bepalen:
--
-- 1. **Een retour is een geldstuk, geen bericht.** Daarom een tabel en geen
--    mailtje: er hangt een wettelijke termijn aan (terugbetalen binnen
--    veertien dagen na de melding) en je moet later kunnen laten zien wat er
--    wanneer is gebeurd. Een mail in een inbox is dat niet.
-- 2. **Het bedrag wordt bij de aanvraag bevroren.** Het komt uit
--    `order_lines`, dus uit wat de klant destijds betaalde — nooit uit de
--    catalogus van vandaag. Zelfde regel als bij de factuur (#10).
-- 3. **De reden is geen vrije tekst maar een keuze**, want het zijn drie
--    verschillende rechten met verschillende termijnen. Bedenktijd is
--    veertien dagen; een defect valt onder garantie en loopt twee jaar. Het
--    formulier weigert daarom niets op de datum — dat oordeel is aan de
--    beheerder, en zonder deze kolom kan hij het niet eens zien.
-- 4. **De terugbetaling loopt via Mollie**, op dezelfde betaling waarmee
--    besteld is. Dat scheelt een IBAN uitvragen en dus een bankrekening
--    bewaren; wat we hier opslaan is alleen het `re_…`-kenmerk dat Mollie
--    teruggeeft.

CREATE TABLE returns (
  -- RET-20260928-4K2P. Zelfde vorm als een ordernummer, zodat de klant en de
  -- beheerder ze naast elkaar kunnen leggen zonder uit te leggen wat wat is.
  reference        CHAR(17) NOT NULL,
  order_reference  CHAR(18) NOT NULL,

  status           ENUM('requested','received','refunded','rejected') NOT NULL,
  -- withdrawal = bedenktijd, wrong = verkeerd geleverd, damaged = beschadigd
  -- aangekomen, defect = kapot binnen de garantietermijn.
  reason           ENUM('withdrawal','wrong','damaged','defect') NOT NULL,
  -- Wat de klant er zelf bij schrijft. Mag leeg zijn: bij herroeping hoeft
  -- hij geen reden op te geven, en daar mogen we ook niet naar vragen.
  note             VARCHAR(1000) NULL,

  -- Het adres waarmee besteld is, in kleine letters. Hiermee is de aanvraag
  -- gekeurd, en hierheen gaat de bevestiging.
  email_key        VARCHAR(190) NOT NULL,

  -- Bevroren bij de aanvraag. `shipping_cents` is 0 zodra er ook maar één
  -- artikel in de bestelling achterblijft: de verzendkosten gaan alleen mee
  -- terug bij een volledige herroeping (art. 6:230r lid 2 BW).
  items_cents      INT UNSIGNED NOT NULL,
  shipping_cents   INT UNSIGNED NOT NULL DEFAULT 0,

  requested_at     DATETIME NOT NULL,
  received_at      DATETIME NULL,
  refunded_at      DATETIME NULL,
  -- `re_…` bij Mollie, plus wat er werkelijk is teruggeboekt. Dat laatste kan
  -- afwijken van items+shipping: de beheerder mag minder terugbetalen als een
  -- artikel beschadigd terugkomt, en dat moet je later kunnen navertellen.
  refund_id        VARCHAR(64) NULL,
  refunded_cents   INT UNSIGNED NULL,
  rejected_at      DATETIME NULL,
  rejected_reason  VARCHAR(190) NULL,
  -- Wie hem afhandelde. NULL zolang niemand hem heeft opgepakt.
  handled_by       INT UNSIGNED NULL,

  PRIMARY KEY (reference),
  KEY ix_returns_order (order_reference),
  -- Waar het paneel op sorteert: openstaand eerst, oudste bovenaan.
  KEY ix_returns_open (status, requested_at),
  -- RESTRICT en geen CASCADE: net als bij een factuur mag een bestelling met
  -- een terugbetaling eraan niet stilletjes verdwijnen.
  CONSTRAINT fk_returns_order FOREIGN KEY (order_reference)
    REFERENCES orders (reference) ON DELETE RESTRICT,
  CONSTRAINT fk_returns_admin FOREIGN KEY (handled_by)
    REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Welke artikelen er terug gaan, en hoeveel. Apart van `returns` omdat een
-- klant een deel van zijn bestelling mag terugsturen: van vier bougies gaat
-- er één terug.
--
-- Er staat bewust geen koppeling naar `order_lines.id` in, maar het
-- artikelnummer. Dat is hetzelfde nummer waarmee de beheerder inkoopt, dus
-- hij kan er direct mee bij de groothandel terecht, en het overleeft een
-- bestelling waarvan de regels ooit opnieuw zijn weggeschreven.
CREATE TABLE return_lines (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  return_reference  CHAR(17) NOT NULL,
  part_id           VARCHAR(64) NOT NULL,
  -- Bevroren: de naam zoals hij bij de bestelling stond.
  name              VARCHAR(190) NOT NULL,
  quantity          SMALLINT UNSIGNED NOT NULL,
  unit_gross_cents  INT UNSIGNED NOT NULL,
  line_gross_cents  INT UNSIGNED NOT NULL,

  PRIMARY KEY (id),
  -- Eén regel per artikel per retour; twee keer hetzelfde aanmelden is een
  -- vergissing, geen tweede regel.
  UNIQUE KEY uq_return_line (return_reference, part_id),
  CONSTRAINT fk_return_lines_return FOREIGN KEY (return_reference)
    REFERENCES returns (reference) ON DELETE CASCADE,
  CONSTRAINT ck_return_lines_quantity CHECK (quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
