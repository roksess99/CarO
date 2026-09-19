-- ===========================================================================
--  BEOORDELINGEN
-- ===========================================================================
--
-- Na een bestelling krijgt de klant één mail met een link naar een formulier.
-- Daar geeft hij twee cijfers — één voor de webshop en één voor de bestelling
-- — en optioneel een cijfer per artikel plus een stuk tekst.
--
-- Drie dingen die deze vorm bepalen:
--
-- 1. **Eén uitnodiging per bestelling, en de link is de sleutel.** Er is geen
--    account om mee in te loggen, dus het token in de mail is het enige bewijs
--    dat deze beoordeling bij een échte, betaalde bestelling hoort. Daarmee
--    mag de winkel "geverifieerde aankoop" zeggen — en dat mag alleen als het
--    ook waar is (Omnibus-richtlijn; de ACM handhaaft op verzonnen reviews).
-- 2. **Verbergen kan, maar laat een spoor na.** Negatieve beoordelingen
--    wegfilteren is verboden. `hidden_reason` is daarom verplicht zodra
--    `hidden_at` gevuld is; wie later terugkijkt ziet waaróm iets weg is.
-- 3. **De naam die de klant ziet staat apart van zijn echte naam.** De klant
--    kiest zelf wat eronder komt ("Roksana K." of "Anoniem"); zijn volledige
--    naam blijft in `orders` staan en komt nooit op de site.

CREATE TABLE reviews (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_reference  CHAR(18) NOT NULL,

  -- Wat in de mail staat: /nl/beoordeling/<token>. Raadbaar mag hij niet zijn,
  -- want ermee kun je namens die bestelling publiceren.
  token            CHAR(32) NOT NULL,
  -- Aan wie de uitnodiging ging, in kleine letters. Niet om te mailen maar om
  -- te kunnen beantwoorden wie om verwijdering vraagt.
  email_key        VARCHAR(190) NOT NULL,

  -- NULL tot de klant het formulier invult.
  display_name     VARCHAR(80) NULL,
  -- 1 t/m 5. Twee cijfers, want het zijn twee verschillende vragen: de winkel
  -- (zoeken, bestellen, de site) en de bestelling (levering, verpakking).
  shop_rating      TINYINT UNSIGNED NULL,
  order_rating     TINYINT UNSIGNED NULL,
  body             TEXT NULL,

  invited_at       DATETIME NOT NULL,
  submitted_at     DATETIME NULL,

  -- Alleen bij misbruik: scheldwoorden, persoonsgegevens, iets wat niet over
  -- deze bestelling gaat. Nooit omdat het cijfer laag is.
  hidden_at        DATETIME NULL,
  hidden_reason    VARCHAR(190) NULL,

  -- Het publieke antwoord van de winkel. Dít is wat je met een slechte
  -- beoordeling doet — niet verbergen.
  reply            TEXT NULL,
  replied_at       DATETIME NULL,

  PRIMARY KEY (id),
  -- Eén uitnodiging per bestelling. Draait de dagelijkse taak twee keer, dan
  -- ketst de tweede af in plaats van een tweede mail te sturen.
  UNIQUE KEY uq_reviews_order (order_reference),
  UNIQUE KEY uq_reviews_token (token),
  -- Waar de winkelpagina op zoekt: ingevuld, niet verborgen, nieuwste eerst.
  KEY ix_reviews_public (submitted_at, hidden_at),
  CONSTRAINT fk_reviews_order FOREIGN KEY (order_reference)
    REFERENCES orders (reference) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Een cijfer per artikel uit de bestelling. Optioneel: wie alleen de twee
-- hoofdcijfers invult is ook klaar, en dat is de meeste mensen.
--
-- Apart van `reviews` omdat het er meerdere per beoordeling zijn, en met
-- `part_id` erin is later een gemiddelde per artikel te tonen zonder dat er
-- nu al iets voor gebouwd hoeft te worden.
CREATE TABLE review_products (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id    BIGINT UNSIGNED NOT NULL,
  part_id      VARCHAR(64) NOT NULL,
  family       VARCHAR(16) NOT NULL,
  -- Bevroren: de naam zoals hij bij de bestelling stond. De catalogus van de
  -- leverancier verandert, een beoordeling hoort bij wat er toen stond.
  name         VARCHAR(190) NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_review_product (review_id, part_id),
  KEY ix_review_products_part (part_id),
  CONSTRAINT fk_review_products_review FOREIGN KEY (review_id)
    REFERENCES reviews (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
