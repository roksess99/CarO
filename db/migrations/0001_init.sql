-- CarO — beheerpaneel: eerste schema
-- Hoort bij docs/DECISIONS.md #12 t/m #14.
--
-- Draaien: phpMyAdmin in hPanel > kies de database > tabblad SQL > plakken.
-- Er staat bewust geen CREATE DATABASE in: die maakt Hostinger zelf aan, met
-- een voorvoegsel voor je accountnummer.
--
-- Drie regels die overal gelden:
--   * Bedragen zijn INT in hele centen. Nooit DECIMAL of FLOAT — € 74,50 is 7450.
--   * Tijden zijn DATETIME in UTC. De weergave in de juiste tijdzone doet de app.
--   * utf8mb4, niet utf8. Dat laatste is een halve tekenset die stukloopt op
--     een ë, een emoji of een Chinese fabrikantsnaam.

SET NAMES utf8mb4;


-- ===========================================================================
--  TOEGANG
--  De eerste inlog van de hele winkel. Beheerders staan in de database en
--  niet in een instellingenbestand, omdat er een tweede bij moet kunnen.
-- ===========================================================================

CREATE TABLE admins (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email              VARCHAR(190) NOT NULL,
  -- Nooit het wachtwoord zelf. De hash komt uit argon2/bcrypt en bevat zijn
  -- eigen zout; daarom één kolom en geen aparte salt-kolom.
  password_hash      VARCHAR(255) NOT NULL,
  -- Het geheim achter de zes cijfers in de authenticator-app. Versleuteld
  -- opgeslagen met een sleutel uit .env: wie de database leest mag hiermee
  -- geen codes kunnen genereren.
  totp_secret        VARBINARY(255) NULL,
  -- Blijft leeg tot de eerste code goed is ingetypt. Zonder deze stap sluit
  -- een verkeerd ingestelde app je buiten je eigen winkel.
  totp_confirmed_at  DATETIME NULL,
  created_at         DATETIME NOT NULL,
  last_login_at      DATETIME NULL,
  -- Toegang intrekken zonder de rij te verwijderen: de naam moet in het
  -- logboek leesbaar blijven.
  disabled_at        DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE admin_invites (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(190) NOT NULL,
  -- Alleen een afdruk van de link, niet de link zelf. Lekt de database, dan
  -- kan niemand met de inhoud alsnog een account aanmaken.
  token_hash  CHAR(64) NOT NULL,
  invited_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL,
  expires_at  DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_invites_token (token_hash),
  KEY ix_admin_invites_email (email),
  CONSTRAINT fk_admin_invites_admin FOREIGN KEY (invited_by)
    REFERENCES admins (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE admin_sessions (
  -- De cookie draagt het echte teken; hier staat alleen de afdruk.
  token_hash   CHAR(64) NOT NULL,
  admin_id     INT UNSIGNED NOT NULL,
  created_at   DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  expires_at   DATETIME NOT NULL,
  PRIMARY KEY (token_hash),
  KEY ix_admin_sessions_admin (admin_id),
  -- Verlopen rijen opruimen en "log mij overal uit" gebruiken dit.
  KEY ix_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_admin FOREIGN KEY (admin_id)
    REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE admin_recovery_codes (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id  INT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  used_at   DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_admin_recovery_admin (admin_id),
  CONSTRAINT fk_admin_recovery_admin FOREIGN KEY (admin_id)
    REFERENCES admins (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE audit_log (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- RESTRICT en niet CASCADE: een beheerder verwijderen mag het logboek niet
  -- leegmaken. Daarvoor is admins.disabled_at er.
  admin_id   INT UNSIGNED NOT NULL,
  action     VARCHAR(40) NOT NULL,
  subject    VARCHAR(80) NULL,
  -- Oude en nieuwe waarde. Bij kortingen gaat het over geld, dus dat wil je
  -- kunnen terugkijken.
  detail_json JSON NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_audit_created (created_at),
  KEY ix_audit_admin (admin_id),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id)
    REFERENCES admins (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===========================================================================
--  BESTELLINGEN EN FACTUREN
-- ===========================================================================

CREATE TABLE orders (
  -- CARO-20260916-4K2P — achttien tekens. Dit is GEEN factuurnummer.
  reference            CHAR(18) NOT NULL,
  status               ENUM('awaiting_payment','paid','failed') NOT NULL,
  -- Staat in de terugkeer-URL. Zonder dit kan iemand andermans bestelling
  -- opvragen door het kenmerk te raden.
  access_token         CHAR(32) NOT NULL,
  locale               CHAR(2) NOT NULL,

  payment_id           VARCHAR(32) NULL,
  payment_method       VARCHAR(24) NULL,

  email                VARCHAR(190) NOT NULL,
  first_name           VARCHAR(80) NOT NULL,
  last_name            VARCHAR(80) NOT NULL,
  phone                VARCHAR(32) NULL,
  postcode             VARCHAR(16) NOT NULL,
  house_number         VARCHAR(16) NOT NULL,
  house_number_addition VARCHAR(16) NULL,
  street               VARCHAR(120) NOT NULL,
  city                 VARCHAR(120) NOT NULL,
  country              CHAR(2) NOT NULL DEFAULT 'NL',

  items_gross_cents    INT UNSIGNED NOT NULL,
  shipping_gross_cents INT UNSIGNED NOT NULL,
  discount_cents       INT UNSIGNED NOT NULL DEFAULT 0,
  -- Exact het bedrag dat naar Mollie is gegaan.
  total_gross_cents    INT UNSIGNED NOT NULL,
  total_vat_cents      INT UNSIGNED NOT NULL,
  discount_code_id     INT UNSIGNED NULL,

  -- De bevestiging zoals hij verstuurd is, bevroren. Hieruit wordt de PDF
  -- opnieuw getekend zonder de catalogus te bevragen.
  document_json        JSON NOT NULL,

  created_at           DATETIME NOT NULL,
  paid_at              DATETIME NULL,
  -- Wat voorkomt dat de klant drie bevestigingen krijgt: Mollie meldt zich
  -- vaker dan één keer en de terugkeerpagina controleert ook.
  notified_at          DATETIME NULL,
  -- Handwerk van de beheerder: ingekocht bij de groothandel, en de track &
  -- trace die hij van de vervoerder krijgt.
  purchased_at         DATETIME NULL,
  tracking_code        VARCHAR(64) NULL,

  PRIMARY KEY (reference),
  KEY ix_orders_status_created (status, created_at),
  KEY ix_orders_paid (paid_at),
  KEY ix_orders_email (email),
  KEY ix_orders_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE order_lines (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_reference  CHAR(18) NOT NULL,
  -- Het nummer waarmee de beheerder inkoopt bij de groothandel.
  part_id          VARCHAR(64) NOT NULL,
  family           VARCHAR(16) NOT NULL,
  name             VARCHAR(190) NOT NULL,
  brand            VARCHAR(120) NULL,
  oe_number        VARCHAR(64) NULL,
  quantity         SMALLINT UNSIGNED NOT NULL,
  unit_gross_cents INT UNSIGNED NOT NULL,
  line_gross_cents INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_order_lines_order (order_reference),
  -- Apart van document_json omdat je hierop kunt zoeken: wat verkoopt het
  -- best, wat moet er vandaag ingekocht worden.
  KEY ix_order_lines_part (part_id),
  CONSTRAINT fk_order_lines_order FOREIGN KEY (order_reference)
    REFERENCES orders (reference) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE counters (
  -- bv. invoice_2026
  name  VARCHAR(40) NOT NULL,
  value INT UNSIGNED NOT NULL,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Waarom een eigen tabel en geen AUTO_INCREMENT: die telt door zodra een
-- transactie begint, óók als hij daarna terugdraait. Dan vallen er gaten in de
-- factuurreeks, en dat is precies wat een reeks niet mag hebben. Het nummer
-- wordt opgehoogd met SELECT ... FOR UPDATE binnen dezelfde transactie waarin
-- de factuur wordt weggeschreven.


CREATE TABLE invoices (
  -- 2026-0001. Per jaar opnieuw beginnen, binnen het jaar aaneengesloten.
  number            CHAR(9) NOT NULL,
  kind              ENUM('invoice','credit') NOT NULL DEFAULT 'invoice',
  -- Welke factuur hiermee teruggedraaid wordt. Een verstuurde factuur wijzig
  -- je nooit; corrigeren gaat met een creditfactuur met een eigen nummer.
  credit_of         CHAR(9) NULL,
  order_reference   CHAR(18) NOT NULL,
  issued_at         DATETIME NOT NULL,
  total_net_cents   INT UNSIGNED NOT NULL,
  total_vat_cents   INT UNSIGNED NOT NULL,
  total_gross_cents INT UNSIGNED NOT NULL,
  -- Bedrijfsgegevens, klantgegevens en regels zoals ze op de dag van uitgifte
  -- waren. Een factuur mag nooit opnieuw berekend worden uit prijzen van nu.
  snapshot_json     JSON NOT NULL,
  PRIMARY KEY (number),
  KEY ix_invoices_order (order_reference),
  KEY ix_invoices_issued (issued_at),
  -- RESTRICT: een bestelling met een factuur eraan mag niet verdwijnen. De
  -- fiscale bewaarplicht is zeven jaar.
  CONSTRAINT fk_invoices_order FOREIGN KEY (order_reference)
    REFERENCES orders (reference) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_credit_of FOREIGN KEY (credit_of)
    REFERENCES invoices (number) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===========================================================================
--  KORTINGEN
-- ===========================================================================

CREATE TABLE discount_rules (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- Voor de beheerder zelf: "Winteractie remschijven".
  label       VARCHAR(120) NOT NULL,
  scope       ENUM('part','category','family') NOT NULL,
  -- Eén categorie is één rij, geen tweehonderd. Scheelt opslag én een
  -- API-verzoek per artikel bij de nachtelijke prijscontrole.
  target      VARCHAR(64) NOT NULL,
  -- Te diep wordt geweigerd in het paneel, niet stilletjes afgekapt: anders
  -- staat er 40% in het scherm terwijl de klant 18% ziet.
  percent     TINYINT UNSIGNED NOT NULL,
  starts_at   DATETIME NOT NULL,
  ends_at     DATETIME NOT NULL,
  created_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL,
  -- Stopzetten zonder weggooien: anders verdwijnt waaróm een oude bestelling
  -- die prijs had.
  disabled_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY ix_discount_rules_lookup (scope, target, starts_at, ends_at),
  CONSTRAINT fk_discount_rules_admin FOREIGN KEY (created_by)
    REFERENCES admins (id) ON DELETE RESTRICT,
  CONSTRAINT ck_discount_rules_percent CHECK (percent BETWEEN 1 AND 70),
  CONSTRAINT ck_discount_rules_period CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE discount_codes (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- De collatie is hoofdletterongevoelig, dus WINTER10 en winter10 zijn
  -- dezelfde code. Dat is gewenst: de klant typt maar wat.
  code              VARCHAR(32) NOT NULL,
  percent           TINYINT UNSIGNED NOT NULL,
  -- Gerekend over de artikelen, zónder verzendkosten.
  min_spend_cents   INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at         DATETIME NOT NULL,
  ends_at           DATETIME NOT NULL,
  -- NULL = onbeperkt.
  max_uses          INT UNSIGNED NULL,
  used_count        INT UNSIGNED NOT NULL DEFAULT 0,
  once_per_customer TINYINT(1) NOT NULL DEFAULT 1,
  created_by        INT UNSIGNED NOT NULL,
  created_at        DATETIME NOT NULL,
  disabled_at       DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_discount_codes_code (code),
  CONSTRAINT fk_discount_codes_admin FOREIGN KEY (created_by)
    REFERENCES admins (id) ON DELETE RESTRICT,
  CONSTRAINT ck_discount_codes_percent CHECK (percent BETWEEN 1 AND 70),
  CONSTRAINT ck_discount_codes_period CHECK (ends_at > starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE discount_code_uses (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code_id         INT UNSIGNED NOT NULL,
  -- Het mailadres in kleine letters, zonder spaties.
  email_key       VARCHAR(190) NOT NULL,
  order_reference CHAR(18) NOT NULL,
  -- Wordt pas geschreven als er betaald is: een afgebroken checkout mag de
  -- enige kans van een klant niet opsouperen.
  used_at         DATETIME NOT NULL,
  PRIMARY KEY (id),
  -- DIT is wat "één keer per klant" afdwingt. Een controle in de code
  -- ("heeft dit adres hem al gebruikt?") lijkt genoeg, maar twee bestellingen
  -- op hetzelfde moment lezen allebei "nee" en slaan allebei op. De database
  -- weigert de tweede.
  UNIQUE KEY uq_code_per_customer (code_id, email_key),
  KEY ix_code_uses_order (order_reference),
  CONSTRAINT fk_code_uses_code FOREIGN KEY (code_id)
    REFERENCES discount_codes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_code_uses_order FOREIGN KEY (order_reference)
    REFERENCES orders (reference) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE price_history (
  part_id     VARCHAR(64) NOT NULL,
  seen_on     DATE NOT NULL,
  price_cents INT UNSIGNED NOT NULL,
  -- Samen uniek: één prijs per artikel per dag.
  PRIMARY KEY (part_id, seen_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Alleen van artikelen die in een actie zitten of er kort in zaten. NOOIT de
-- hele catalogus: de leverancier heeft er miljoenen, "remschijf" alleen al
-- geeft 7.127 treffers. De wet vraagt de dertigdagenprijs uitsluitend bij een
-- aangekondigde verlaging — geen actie, geen verplichting, niets te bewaren.
-- Rijen ouder dan veertig dagen mogen weg.


-- De koppeling van orders naar discount_codes staat hier onderaan, omdat
-- discount_codes pas hierboven is aangemaakt.
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_discount_code FOREIGN KEY (discount_code_id)
    REFERENCES discount_codes (id) ON DELETE SET NULL;
