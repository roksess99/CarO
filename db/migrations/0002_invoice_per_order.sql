-- Eén factuur per bestelling, afgedwongen door de database.
--
-- `issueInvoice()` kijkt eerst of er al een factuur is en maakt er anders een.
-- Tussen dat kijken en dat maken zit een gaatje: twee webhooks van Mollie die
-- tegelijk binnenkomen lezen allebei "nog geen factuur". Deze sleutel zorgt dat
-- de tweede dan afketst in plaats van een tweede nummer uit de reeks te halen.
--
-- Op (order_reference, kind), niet op order_reference alleen: een creditfactuur
-- hoort bij dezelfde bestelling en moet er wél naast kunnen bestaan.

ALTER TABLE invoices
  ADD CONSTRAINT uq_invoices_order_kind UNIQUE (order_reference, kind);
