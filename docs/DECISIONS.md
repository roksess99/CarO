# Openstaande beslissingen — CarO

Zolang een beslissing hier op OPEN staat: **niet gokken, vragen.**

---

## 1. Onderdelen-catalogus API — VASTGESTELD → Tyre24/ALZURA

Besloten 2026-08-06: **Tyre24 / ALZURA REST API v1.3** (zie docs/api/TYRE24.md en
docs/api/tyre24-products-v13.yaml). Marketplace met groothandels, inclusief
TecDoc-data (voertuig-koppeling) en bestellen via de API (dropship mogelijk).

**Nog te regelen voordat de adapter live kan** (blokkeert fase 3-oplevering, niet de bouw):
- [ ] API-token genereren (Token Management op tyre24.alzura.com) → `TYRE24_API_TOKEN`
- [ ] `productAreaId` bepalen via `GET /areas` → `TYRE24_PRODUCT_AREA_ID`
- [ ] NL base path verifiëren (`/nl/nl/` i.p.v. `/de/de/`)

De adapter staat achter `src/lib/catalog/provider.ts`; zonder token valt hij terug
op de mock. Geen enkele andere plek in de code weet waar de data vandaan komt.

---

## 5. Prijsstrategie (marge op inkoop) — OPEN — blokkerend voor live gang

Tyre24 levert **B2B-inkoopprijzen**. De consumentenprijs (incl. 21% btw) moet daar
bovenop berekend worden. Opties: vaste marge %, marge per categorie, adviesprijs
(de `evkPrices` uit de API — uitzoeken wat die precies zijn).

**Tot dit besloten is**: `src/lib/pricing.ts` rekent met `CARO_MARGIN_PERCENT` uit
.env (alleen voor ontwikkeling) en een TODO-verwijzing naar deze beslissing.

---

## 2. Hosting — OPEN

Vercel (simpelst voor Next.js) vs. een EU-VPS. Let op AVG: klantdata bij voorkeur in de EU.

## 3. Bedrijfsvorm en betaalaccount — OPEN

Mollie vereist een KvK-inschrijving en zakelijke rekening. Dit blokkeert de betaal-integratie,
niet de rest van de bouw. Bouw checkout eerst tegen Mollie test mode.

## 4. Voorraadbeheer — OPEN, richting bekend

Tyre24 maakt dropshipping mogelijk: voorraad live opvragen (`stock` per item,
`/distributors` per artikel) en inkooporders via `POST /order`. Definitieve keuze
(alles dropship, of deels eigen voorraad) staat nog open, maar de API dekt beide.

---

## Vastgesteld

| Datum | Beslissing | Reden |
|---|---|---|
| 2026-08-06 | Tyre24/ALZURA als catalogus- en inkoop-API | Swagger-docs beschikbaar, TecDoc-data inbegrepen, dropship via API mogelijk |
| 2026-08-06 | Velgen komen in het assortiment | Tyre24 Alloys-API dekt matching (carID-flow) én 3D-beelden; zelfde leverancier en token. Eigen fase, na fase 3 |
| — | Next.js + TypeScript + Tailwind | Grootste community, snelste iteratie met een agent, sterke SEO-ondersteuning |
| — | PostgreSQL + Prisma | Type-safe, migraties, past bij bestaande SQL-kennis |
| — | Mollie boven Stripe | iDEAL is ~60% van NL online betalingen; Mollie is hier de standaard |
| — | Prijzen in eurocenten (integer) | Voorkomt afrondingsfouten |
