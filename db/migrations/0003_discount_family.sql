-- Bij welke productgroep een kortingsregel hoort.
--
-- Stond er niet in, omdat de winkel het niet nodig heeft: die kijkt per artikel
-- of er een regel op past. De aanbiedingenpagina werkt andersom — die begint
-- bij de regel en moet de artikelen erbij zoeken, en daarvoor moet hij weten
-- wélke catalogus hij moet bevragen. Een artikelnummer alleen zegt dat niet.
--
-- Bestaande rijen krijgen een lege waarde; die regels tonen dan niets op de
-- aanbiedingenpagina, maar blijven gewoon werken in de winkel.

ALTER TABLE discount_rules
  ADD COLUMN family VARCHAR(16) NOT NULL DEFAULT '' AFTER scope;
