# E-mail aan ALZURA / Tyre24 — openstaande vragen

Concept om te versturen naar de support-/API-afdeling. In het Engels, omdat dat
bij een internationale B2B-helpdesk het veiligst is. Vul je klantnummer in en
haal weg wat je niet wilt vragen.

**Belangrijk**: zet je API-token nooit in een e-mail. Verwijs naar je klant- of
accountnummer; support kan het token daaraan koppelen.

---

**Subject:** REST API v1.3 (Products) — questions about product images, product
area activation and vehicle search

---

Dear ALZURA / Tyre24 team,

We are building a Dutch webshop on top of your Products REST API v1.3. Our API
token is active and working — we can successfully retrieve areas, categories,
items and prices. Before we go live we have a few questions we could not answer
from the Swagger documentation.

Our account/customer number: **[VUL IN]**

---

**1. Product images: what should replace the `%s` placeholders?**

This is our most urgent question, because we currently cannot show any product
photos at all.

Every `media[].imageLink` we receive contains two `%s` placeholders, in every
product area we have access to:

- Tyres (area 6):
  `https://media3.tyre-shopping.com/images/tyre/26064-PTY-%s-%s-br1.jpg`
- Used parts (area 10):
  `https://media1.tyre-shopping.com/mediamanagement/b2b_productarea_up/2026/5/26/33/255333/3947354-X-%s-%s-br1.jpeg`
- OE parts (area 3):
  `https://media1.tyre-shopping.com/mediamanagement/category_logo_neutral/2025/7/7/10/13/666081-X-%s-%s-br1.jpg`

What we tried:

- Requesting the URL unchanged (with `%s` still in it) returns **HTTP 400**.
- Substituting width and height (`200-200`, `400-400`, `800-600`, `1-1`, `0-0`)
  returns **HTTP 500** with a response body that is always exactly the same
  12,240 bytes: a generic 300×225 JPEG, regardless of the size requested.

Could you tell us:

- a. What values belong in the two `%s` placeholders (and are there fixed
  allowed sizes)?
- b. Are real product photos available for tyres and OE parts at all, or is
  `category_logo_neutral` (as in the area 3 example above) the only image we
  will receive for those articles?
- c. Is there a separate media/CDN endpoint we should be using instead?

---

**2. Can product area 3 ("Original-Ersatzteile") be activated on the NL platform?**

We sell to Dutch consumers, so we work against
`https://tyre24.alzura.com/nl/nl/rest/v13/products`.

- On `/de/de/` area 3 works: searching for OE number `06A115561B` returns two
  Volkswagen oil filters with stock and prices.
- On `/nl/nl/`, `/be/nl/` and `/fr/fr/` the same request returns
  `ERR_B2B_PRODUCTAREA_INACTIVE` ("Requested b2b productarea is not active on
  platform 'nl'!").

Can product area 3 be activated for our account on the **nl** platform? If that
requires a different contract or agreement, please let us know what is needed.

The same question applies to **area 10 (used parts)** and **area 1
(accessories)**: both return categories on `/de/de/` but are empty on `/nl/nl/`.
Activating them on nl would also give us Dutch category names instead of German
ones.

---

**3. Documentation for the TecDoc vehicle search**

Area 3 reports `showTecDocVehicleSearch: true`, but it also has
`searchableByCategory: false`, and searching only works with a complete,
exact OE number (partial numbers, wildcards and product names all return 0
results). That means our customers cannot browse or find parts unless they
already know the exact OE number.

The Products API does not appear to contain vehicle endpoints — `/carBrands`,
`/carModels`, `/carTypes`, `/vehicles`, `/articles` and `/tecdoc` all return
HTTP 400. At the same time the Swagger file contains definitions that are not
used by any documented endpoint (`assemblyGroup`, `CategoryBySearchString`,
`ArticlesDirectSearch`, `vehicleIdentification`), which suggests a separate API
exists.

- a. Is there a separate parts/TecDoc API, and could you send us its
  documentation?
- b. Is it possible to look up parts by vehicle (brand → model → type, or by
  TecDoc vehicle ID) the way the Alloys API does with
  `carBrands` / `carModels` / `carTypes`?
- c. Our customers enter a Dutch licence plate, from which we obtain make,
  model, type, engine capacity and power via the Dutch RDW register. Is there a
  supported way to translate that into a TecDoc vehicle ID so we can show only
  parts that fit that car?

---

**4. Are the prices in the API excluding VAT?**

Each article returns a price block with `type: "ek"` and one with `type: "evp_3"`
(for example `ek 27.63` and `evp_3 48.00` for a tyre).

- a. Can you confirm that both amounts are **excluding VAT**?
- b. Is `evp_3` the recommended retail price (and what do the other `evp_*`
  variants mean)?

We need certainty here, because Dutch consumer law requires us to display prices
including VAT. If we add 21% VAT to an amount that already includes it, every
price in our shop would be wrong.

---

**5. Which agreements do we need before we can place orders?**

Area 3 has `agreementNeeded: true`. We see the endpoints `/agreementList`,
`/agreementPdfs` and `/newPdfAgreement` in the documentation.

- a. Which agreements must be in place before `POST /order` will succeed?
- b. Is this per wholesaler, and can it be arranged entirely through the API, or
  does it require manual steps on your side?

---

**6. Two documentation details we found by testing**

Not questions, but perhaps useful for your documentation:

- Pagination is **zero-based**: `page=1` returns the *second* page. This is not
  stated in the Swagger and cost us some time to find.
- The `filter` field in the `/items` response is an **object** for a
  category query but an **empty array** for an `itemId` query. Strictly typed
  clients break on this.

---

Thank you very much for your help. If it is easier to discuss this by phone or
in a call, we are happy to do so.

Kind regards,

**[NAAM]**
CarO Onderdelen
**[E-MAIL / TELEFOON]**
