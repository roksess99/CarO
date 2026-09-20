import { randomBytes } from "node:crypto";
import { execute, query, queryOne, transaction } from "@/lib/db/client";

/**
 * Beoordelingen: opslag en de vragen die de winkel erover stelt.
 *
 * Twee cijfers per bestelling, want het zijn twee verschillende vragen:
 * **de webshop** (zoeken, bestellen, de site) en **de bestelling** (levering,
 * verpakking, het artikel). Een klant kan de site prettig vinden en toch een
 * beschadigd pakket krijgen; één gemiddeld cijfer verbergt dat allebei.
 *
 * Optioneel daarbovenop een cijfer per artikel. Dat is bewust optioneel: de
 * respons op zo'n mail is het hele punt, en een formulier dat om acht cijfers
 * vraagt krijgt er nul.
 *
 * **Verbergen mag alleen bij misbruik.** Negatieve beoordelingen wegfilteren
 * is verboden (Omnibus-richtlijn, de ACM handhaaft erop) en het is bovendien
 * dom: een eerlijk antwoord onder een klacht doet meer dan de klacht weghalen.
 * Daarom is `hidden_reason` verplicht en is `reply` het gereedschap dat bij
 * een slechte beoordeling hoort.
 */

export interface ReviewProduct {
  partId: string;
  family: string;
  name: string;
  rating: number;
}

export interface Review {
  id: number;
  orderReference: string;
  token: string;
  displayName: string | null;
  shopRating: number | null;
  orderRating: number | null;
  body: string | null;
  invitedAt: Date;
  submittedAt: Date | null;
  hiddenAt: Date | null;
  hiddenReason: string | null;
  reply: string | null;
  repliedAt: Date | null;
  products: ReviewProduct[];
}

interface ReviewRow {
  id: number;
  order_reference: string;
  token: string;
  display_name: string | null;
  shop_rating: number | null;
  order_rating: number | null;
  body: string | null;
  invited_at: Date;
  submitted_at: Date | null;
  hidden_at: Date | null;
  hidden_reason: string | null;
  reply: string | null;
  replied_at: Date | null;
}

interface ProductRow {
  review_id: number;
  part_id: string;
  family: string;
  name: string;
  rating: number;
}

function toReview(row: ReviewRow, products: ReviewProduct[] = []): Review {
  return {
    id: row.id,
    orderReference: row.order_reference,
    token: row.token,
    displayName: row.display_name,
    shopRating: row.shop_rating === null ? null : Number(row.shop_rating),
    orderRating: row.order_rating === null ? null : Number(row.order_rating),
    body: row.body,
    invitedAt: row.invited_at,
    submittedAt: row.submitted_at,
    hiddenAt: row.hidden_at,
    hiddenReason: row.hidden_reason,
    reply: row.reply,
    repliedAt: row.replied_at,
    products,
  };
}

async function productsFor(reviewIds: number[]): Promise<Map<number, ReviewProduct[]>> {
  const byReview = new Map<number, ReviewProduct[]>();
  if (reviewIds.length === 0) return byReview;
  const rows = await query<ProductRow>(
    `SELECT * FROM review_products WHERE review_id IN (${reviewIds.map(() => "?").join(",")})`,
    reviewIds,
  );
  for (const row of rows) {
    const list = byReview.get(row.review_id) ?? [];
    list.push({
      partId: row.part_id,
      family: row.family,
      name: row.name,
      rating: Number(row.rating),
    });
    byReview.set(row.review_id, list);
  }
  return byReview;
}

// ---------------------------------------------------------------------------
// Uitnodigen
// ---------------------------------------------------------------------------

/**
 * Een uitnodiging klaarzetten. `null` betekent: er stond er al een.
 *
 * De unieke sleutel op `order_reference` doet het werk, niet een controle
 * vooraf: draaien de cron-taak en de klok in de server tegelijk, dan lezen ze
 * allebei "nog geen uitnodiging" en zouden ze allebei mailen.
 */
export async function createInvite(
  orderReference: string,
  emailKey: string,
): Promise<string | null> {
  const token = randomBytes(16).toString("hex");
  const result = await execute(
    `INSERT IGNORE INTO reviews (order_reference, token, email_key, invited_at)
     VALUES (?, ?, ?, ?)`,
    [orderReference, token, emailKey.trim().toLowerCase(), new Date()],
  );
  return result.affectedRows === 1 ? token : null;
}

export interface PendingInvite {
  reference: string;
  email: string;
  firstName: string;
  locale: string;
}

/**
 * Bestellingen die aan een uitnodiging toe zijn.
 *
 * **Wanneer, en waarom dat twee termijnen zijn.** We weten niet wanneer een
 * pakket bezorgd is — de winkel ontvangt geen statusbericht van de vervoerder.
 * Wat we wél hebben is `purchased_at`: het moment waarop de beheerder bij de
 * groothandel inkocht (docs/DECISIONS.md #10, dat blijft handwerk). Vanaf dat
 * moment is een week ruim genoeg voor bezorging.
 *
 * Heeft hij dat niet bijgehouden, dan valt de taak terug op **veertien dagen
 * na betaling**. Dat is laat, en met opzet: te vroeg vragen om een oordeel
 * over een pakket dat er nog niet is, is erger dan te laat vragen.
 */
export async function invitableOrders(now: Date = new Date()): Promise<PendingInvite[]> {
  return query<PendingInvite>(
    `SELECT o.reference, o.email, o.first_name AS firstName, o.locale
       FROM orders o
       LEFT JOIN reviews r ON r.order_reference = o.reference
      WHERE o.status = 'paid'
        AND o.paid_at IS NOT NULL
        AND r.id IS NULL
        AND COALESCE(
              DATE_ADD(o.purchased_at, INTERVAL 7 DAY),
              DATE_ADD(o.paid_at, INTERVAL 14 DAY)
            ) <= ?
      ORDER BY o.paid_at`,
    [now],
  );
}

// ---------------------------------------------------------------------------
// Invullen
// ---------------------------------------------------------------------------

export async function reviewByToken(token: string): Promise<Review | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const row = await queryOne<ReviewRow>(
    `SELECT * FROM reviews WHERE token = ?`,
    [token],
  );
  if (!row) return null;
  const products = await productsFor([row.id]);
  return toReview(row, products.get(row.id) ?? []);
}

export interface ReviewSubmission {
  token: string;
  displayName: string;
  shopRating: number;
  orderRating: number;
  body: string | null;
  products: ReviewProduct[];
}

/**
 * De beoordeling opslaan. `false` betekent: deze link is al gebruikt.
 *
 * In één transactie, en de voorwaarde `submitted_at IS NULL` zit in de UPDATE
 * zelf. Anders zou twee keer op "versturen" klikken twee keer artikelrijen
 * wegschrijven — de unieke sleutel zou dat wel tegenhouden, maar dan met een
 * foutmelding in plaats van een nette "al ingevuld".
 */
export async function submitReview(input: ReviewSubmission): Promise<boolean> {
  return transaction(async (tx) => {
    const [result] = await tx.execute(
      `UPDATE reviews
          SET display_name = ?, shop_rating = ?, order_rating = ?,
              body = ?, submitted_at = ?
        WHERE token = ? AND submitted_at IS NULL`,
      [
        input.displayName,
        input.shopRating,
        input.orderRating,
        input.body,
        new Date(),
        input.token,
      ],
    );
    if ((result as { affectedRows: number }).affectedRows !== 1) return false;

    const [rows] = await tx.execute(
      `SELECT id FROM reviews WHERE token = ?`,
      [input.token],
    );
    const reviewId = (rows as Array<{ id: number }>)[0]?.id;
    if (reviewId === undefined) return false;

    for (const product of input.products) {
      await tx.execute(
        `INSERT INTO review_products (review_id, part_id, family, name, rating)
         VALUES (?, ?, ?, ?, ?)`,
        [reviewId, product.partId, product.family, product.name, product.rating],
      );
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Wat de winkel toont
// ---------------------------------------------------------------------------

/**
 * Ingevuld, niet verborgen, nieuwste eerst.
 *
 * **Valt stil terug op niets als de database wegvalt.** Deze lijst staat op de
 * homepage en die wordt bij het bouwen voorgerenderd; een uitzondering hier
 * laat `next build` struikelen op een machine die niet bij de database kan.
 * Zelfde keuze als bij de kortingsregels: de winkel blijft werken, er staan
 * alleen even geen beoordelingen.
 */
export async function publishedReviews(limit = 50): Promise<Review[]> {
  try {
    const rows = await query<ReviewRow>(
      `SELECT * FROM reviews
        WHERE submitted_at IS NOT NULL AND hidden_at IS NULL
        ORDER BY submitted_at DESC
        LIMIT ?`,
      [limit],
    );
    const products = await productsFor(rows.map((row) => row.id));
    return rows.map((row) => toReview(row, products.get(row.id) ?? []));
  } catch (error) {
    console.error("Beoordelingen konden niet geladen worden", error);
    return [];
  }
}

export interface ReviewSummary {
  count: number;
  /** Gemiddelde van beide cijfers samen, op één decimaal */
  average: number;
  shopAverage: number;
  orderAverage: number;
}

/**
 * Het gemiddelde, voor de strook op de homepage en de markering voor Google.
 *
 * Alleen zichtbare beoordelingen tellen mee — dezelfde verzameling die de
 * bezoeker kan nalezen. Een gemiddelde over rijen die niemand kan zien is
 * niet controleerbaar en daarmee precies het soort cijfer waar de markering
 * van Google over struikelt.
 *
 * Valt de database weg, dan komt er `null` uit en verdwijnt de strook — net
 * alsof er nog geen beoordelingen zijn. Zie `publishedReviews`.
 */
export async function reviewSummary(): Promise<ReviewSummary | null> {
  let row;
  try {
    row = await queryOne<{
      n: number;
      shop: string | null;
      ord: string | null;
    }>(
      `SELECT COUNT(*) AS n, AVG(shop_rating) AS shop, AVG(order_rating) AS ord
         FROM reviews
        WHERE submitted_at IS NOT NULL AND hidden_at IS NULL`,
    );
  } catch (error) {
    console.error("Gemiddelde beoordeling kon niet geladen worden", error);
    return null;
  }
  if (!row || row.shop === null || row.ord === null) return null;
  const count = Number(row.n);
  if (count === 0) return null;

  const shopAverage = Number(row.shop);
  const orderAverage = Number(row.ord);
  return {
    count,
    average: Math.round(((shopAverage + orderAverage) / 2) * 10) / 10,
    shopAverage: Math.round(shopAverage * 10) / 10,
    orderAverage: Math.round(orderAverage * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Beheer
// ---------------------------------------------------------------------------

/** Alles, ook wat verborgen is en wat nog niet ingevuld is */
export async function allReviews(limit = 200): Promise<Review[]> {
  const rows = await query<ReviewRow>(
    `SELECT * FROM reviews ORDER BY submitted_at IS NULL, submitted_at DESC, invited_at DESC LIMIT ?`,
    [limit],
  );
  const products = await productsFor(rows.map((row) => row.id));
  return rows.map((row) => toReview(row, products.get(row.id) ?? []));
}

export async function findReview(id: number): Promise<Review | null> {
  const row = await queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = ?`, [
    id,
  ]);
  if (!row) return null;
  const products = await productsFor([row.id]);
  return toReview(row, products.get(row.id) ?? []);
}

export async function replyToReview(id: number, reply: string): Promise<boolean> {
  const result = await execute(
    `UPDATE reviews SET reply = ?, replied_at = ?
      WHERE id = ? AND submitted_at IS NOT NULL`,
    [reply, new Date(), id],
  );
  return result.affectedRows === 1;
}

/** Verbergen kan alleen mét reden; zie de kop van dit bestand. */
export async function hideReview(id: number, reason: string): Promise<boolean> {
  const result = await execute(
    `UPDATE reviews SET hidden_at = ?, hidden_reason = ?
      WHERE id = ? AND hidden_at IS NULL`,
    [new Date(), reason, id],
  );
  return result.affectedRows === 1;
}

export async function unhideReview(id: number): Promise<boolean> {
  const result = await execute(
    `UPDATE reviews SET hidden_at = NULL, hidden_reason = NULL
      WHERE id = ? AND hidden_at IS NOT NULL`,
    [id],
  );
  return result.affectedRows === 1;
}
