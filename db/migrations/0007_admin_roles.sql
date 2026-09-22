-- Rollen in het beheerpaneel — 2026-09-21
--
-- Tot nu toe gaf elke uitnodiging volledige toegang: wie binnen was kon
-- prijzen wijzigen, facturen lezen én nieuwe beheerders uitnodigen. De
-- eigenaar wil dat kunnen beperken: een boekhouder hoort bij de facturen en
-- de omzet, een marketingmedewerker bij de beoordelingen en de acties.
--
-- Drie rollen, geen vinkjes per persoon (winkelkeuze 2026-09-21). Minder
-- combinaties betekent minder om te testen, en een vinkjeslijst nodigt uit
-- tot rechten die niemand nodig heeft. De matrix staat in
-- src/lib/admin/roles.ts — dat is de enige plek waar hij hoort te staan.

ALTER TABLE admins
  ADD COLUMN role ENUM('eigenaar', 'boekhouder', 'marketing')
    NOT NULL DEFAULT 'eigenaar' AFTER email;

ALTER TABLE admin_invites
  ADD COLUMN role ENUM('eigenaar', 'boekhouder', 'marketing')
    NOT NULL DEFAULT 'eigenaar' AFTER email;

-- De standaardwaarde hierboven is er alleen om de bestaande rijen te vullen:
-- wie er al in stond wás eigenaar en moet dat blijven. Daarna gaat hij eruit.
--
-- Dat is met opzet. Een vergeten rol zou anders stilletjes "eigenaar" worden,
-- en dat is precies de fout die je bij rechten niet wilt maken: hij valt pas
-- op als iemand iets doet wat hij niet mocht. Zonder standaardwaarde weigert
-- MySQL de INSERT en merk je het meteen.
ALTER TABLE admins ALTER COLUMN role DROP DEFAULT;
ALTER TABLE admin_invites ALTER COLUMN role DROP DEFAULT;
