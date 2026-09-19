-- ===========================================================================
--  PRIJSOPSLAG PER GROEP
-- ===========================================================================
--
-- Tot nu toe volgde de winkel de adviesverkoopprijs van de leverancier, met
-- een ondergrens van 25% marge als vangnet (docs/DECISIONS.md #5). De
-- eigenaar wil dat zelf bepalen: hij vult een percentage in en dat wordt de
-- opslag op de INKOOPPRIJS. 10% betekent dus: inkoop + 10%, en daar komt de
-- btw nog overheen.
--
-- Let op het verschil met discount_rules. Een kortingsregel is tijdelijk en
-- mag als "-15%" bij de klant in beeld; een prijsregel hiéronder is gewoon de
-- prijs. Die krijgt dus géén kortingsvlag, géén doorgestreepte van-prijs en
-- komt niet op de aanbiedingenpagina. Zet je hier iets lager neer, dan is dat
-- je nieuwe normale prijs en niet een aanbieding.
--
-- Geen looptijd: een prijs geldt tot je hem verandert. Wie een tijdelijke
-- verlaging wil gebruikt een kortingsregel.

CREATE TABLE price_rules (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  label          VARCHAR(120) NOT NULL,

  -- Van breed naar smal. De smalste regel die op een artikel past wint; is er
  -- helemaal geen regel, dan blijft de adviesprijs van de leverancier staan.
  --
  --   shop      alles
  --   family    onderdelen | banden | velgen | toebehoren
  --   category  categorieslug, bv. "auto-suv-1"   (NIET bij onderdelen)
  --   kind      TecDoc-soortnummer, bv. 7         (ALLEEN bij onderdelen)
  --   part      één artikel-id
  scope          ENUM('shop','family','category','kind','part') NOT NULL,

  -- Leeg bij scope 'shop'. Bij de rest de familie waar het doel bij hoort.
  family         VARCHAR(16) NOT NULL DEFAULT '',
  -- Leeg bij 'shop' en 'family'; anders de slug, het soortnummer of het id.
  target         VARCHAR(190) NOT NULL DEFAULT '',

  -- Opslag op de inkoopprijs in procenten. DECIMAL en geen float: dit raakt
  -- geld. Negatief kan niet — onder de inkoopprijs verkopen we nooit.
  markup_percent DECIMAL(6,2) UNSIGNED NOT NULL,

  -- Stoppen is niet weggooien: zo blijft navraagbaar waarom een oude
  -- bestelling die prijs had. Een nieuwe regel voor hetzelfde doel zet de
  -- vorige automatisch stop (lib/pricing/markup.ts).
  disabled_at    DATETIME NULL,
  created_by     INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL,

  PRIMARY KEY (id),
  -- Waar de winkel op zoekt: alle lopende regels in één keer.
  KEY ix_price_rules_active (disabled_at, scope),
  CONSTRAINT fk_price_rules_admin FOREIGN KEY (created_by)
    REFERENCES admins (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
