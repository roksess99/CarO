# Openstaande beslissingen — CarO

Zolang een beslissing hier op OPEN staat: **niet gokken, vragen.**

---

## 1. Onderdelen-catalogus API — OPEN — blokkerend

Dit is de kern van de webshop en het grootste risico. Auto-onderdelen hebben een
voertuig-koppeling nodig (merk/model/motorcode → welk onderdeel past), niet alleen een
productlijst. Opties:

| Optie | Voordeel | Nadeel |
|---|---|---|
| **TecDoc / TecAlliance** | De EU-standaard. Volledige voertuig-onderdeel matching | Licentiekosten, contract nodig, niet self-service |
| **Leverancier-feed** (bv. via een NL groothandel) | Goedkoop, direct voorraad en inkoopprijs | Afhankelijk van één partij, formaat vaak CSV/XML |
| **Eigen catalogus** | Volledige controle | Enorm veel datawerk, geen voertuig-matching |

**Actie**: eerst uitzoeken welke leverancier of dropship-partner je gebruikt. De datakeuze
volgt uit de leverancier, niet andersom.

**Tot dat vaststaat**: bouw achter `src/lib/catalog/provider.ts` met een mock-implementatie.
Geen enkele andere plek in de code mag weten waar de data vandaan komt.

---

## 2. Hosting — OPEN

Vercel (simpelst voor Next.js) vs. een EU-VPS. Let op AVG: klantdata bij voorkeur in de EU.

## 3. Bedrijfsvorm en betaalaccount — OPEN

Mollie vereist een KvK-inschrijving en zakelijke rekening. Dit blokkeert de betaal-integratie,
niet de rest van de bouw. Bouw checkout eerst tegen Mollie test mode.

## 4. Voorraadbeheer — OPEN

Eigen voorraad of dropshipping? Bepaalt of we voorraadstanden bijhouden of live opvragen.

---

## Vastgesteld

| Datum | Beslissing | Reden |
|---|---|---|
| — | Next.js + TypeScript + Tailwind | Grootste community, snelste iteratie met een agent, sterke SEO-ondersteuning |
| — | PostgreSQL + Prisma | Type-safe, migraties, past bij bestaande SQL-kennis |
| — | Mollie boven Stripe | iDEAL is ~60% van NL online betalingen; Mollie is hier de standaard |
| — | Prijzen in eurocenten (integer) | Voorkomt afrondingsfouten |
