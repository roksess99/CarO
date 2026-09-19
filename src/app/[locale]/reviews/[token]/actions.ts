"use server";

import { revalidatePath } from "next/cache";
import { orderProducts } from "@/lib/orders/store";
import { reviewByToken, submitReview } from "@/lib/reviews/store";

export type ReviewResult = { error: string } | { ok: true } | undefined;

/** Hoeveel tekst een klant kwijt kan. Ruim, maar niet eindeloos. */
const MAX_BODY = 2000;
const MAX_NAME = 60;

function rating(formData: FormData, field: string): number | null {
  const value = Number(formData.get(field));
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

/**
 * De beoordeling opslaan.
 *
 * **Het token is het enige bewijs.** Er is geen inlog; de link uit de mail
 * hoort bij precies één betaalde bestelling en kan maar één keer gebruikt
 * worden. Daarom wordt hier niets uit het formulier geloofd dat de klant niet
 * hoort te kunnen bepalen: het ordernummer, de artikelen en het mailadres
 * komen alle drie uit de database, niet uit de POST.
 */
export async function saveReview(
  _previous: ReviewResult,
  formData: FormData,
): Promise<ReviewResult> {
  const token = String(formData.get("token") ?? "");
  const review = await reviewByToken(token);
  if (!review) return { error: "Deze link klopt niet meer." };
  if (review.submittedAt) {
    return { error: "Deze beoordeling is al ingevuld. Bedankt daarvoor!" };
  }

  const shopRating = rating(formData, "shopRating");
  const orderRating = rating(formData, "orderRating");
  if (shopRating === null) return { error: "Geef de webshop een cijfer." };
  if (orderRating === null) return { error: "Geef de bestelling een cijfer." };

  const name = String(formData.get("displayName") ?? "").trim();
  const anonymous = formData.get("anonymous") === "1";
  const displayName = anonymous ? "Anoniem" : name.slice(0, MAX_NAME);
  if (!displayName) {
    return { error: "Vul een naam in, of kies “liever anoniem”." };
  }

  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);

  // De artikelen komen uit de bestelling zelf. Zou het formulier ze mogen
  // aanleveren, dan kon iemand met een geldige link een cijfer plakken op een
  // artikel dat hij nooit gekocht heeft — en juist dat verband is wat
  // "geverifieerde aankoop" betekent.
  const lines = await orderProducts(review.orderReference);
  const products = lines.flatMap((line) => {
    const value = Number(formData.get(`part:${line.partId}`));
    if (!Number.isInteger(value) || value < 1 || value > 5) return [];
    return [
      {
        partId: line.partId,
        family: line.family,
        name: line.name,
        rating: value,
      },
    ];
  });

  const saved = await submitReview({
    token,
    displayName,
    shopRating,
    orderRating,
    body: body || null,
    products,
  });
  if (!saved) {
    return { error: "Deze beoordeling is al ingevuld. Bedankt daarvoor!" };
  }

  revalidatePath("/[locale]/reviews", "page");
  return { ok: true };
}
