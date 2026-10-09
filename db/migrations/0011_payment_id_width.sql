-- Het betaalkenmerk moet ruimer: Stripe-sessies passen niet in 32 tekens.
--
-- `orders.payment_id` stond op VARCHAR(32). Een Mollie-kenmerk (`tr_…`) is een
-- stuk of vijftien tekens en past ruim; een Stripe Checkout Session
-- (`cs_test_…`) is 66 tekens.
--
-- GEMETEN 2026-10-09, en anders dan hier eerst stond: **deze server weigert de
-- rij niet, hij kapt hem stil af.** Twee testbestellingen die vóór deze
-- migratie werden aangemaakt kregen een kenmerk van precies 32 tekens. Allebei
-- werden ze betaald, en allebei bleven ze op `awaiting_payment` staan: met een
-- afgekapt kenmerk vindt `getPayment` de sessie nooit meer. Geen foutmelding,
-- geen factuur, geen mail — alleen een bestelling die eeuwig wacht.
--
-- Dit is een verbreding en geen verandering van betekenis: bestaande waarden
-- blijven ongemoeid en elke bestaande waarde past nog steeds. Terugdraaien kan
-- niet (@docs/DECISIONS.md #25), maar dat hoeft hier ook niet — de oude breedte
-- is een ondergrens die niemand mist.

ALTER TABLE orders MODIFY COLUMN payment_id VARCHAR(255) NULL;
