-- Korting op één soort onderdeel — 2026-09-22
--
-- Een kortingsregel kon op de hele productgroep, op een categorie of op één
-- artikel. Bij onderdelen viel de categorie af: die categorieboom hangt aan
-- een auto, en een artikel dat via het zoekveld binnenkomt draagt helemaal
-- geen categorie (docs/DECISIONS.md #7). Daar bleef dus alleen "alle
-- onderdelen" of "dit ene artikel" over, en daartussen zit precies wat de
-- beheerder wil: "15% op alle remschijven".
--
-- Dezelfde sleutel als bij price_rules (0005): het TecDoc-soortnummer. Dat
-- levert de leverancier op het artikel zélf mee, dus het is overal hetzelfde
-- — op de onderdelenpagina, in een zoekresultaat en bij het afrekenen. Een
-- categorie zou op de ene pagina wél gelden en op de andere niet.
--
-- De lijst met soorten staat in src/lib/admin/part-kinds.ts en nergens
-- anders. Hier komt alleen het nummer te staan, als tekst, net als bij
-- price_rules.target.
--
-- Alleen uitbreiden: bestaande rijen houden hun waarde en blijven werken.

ALTER TABLE discount_rules
  MODIFY COLUMN scope ENUM('part','kind','category','family') NOT NULL;
