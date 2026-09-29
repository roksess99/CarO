import type { StoredOrder } from "@/lib/orders/types";
import type { ReturnLine } from "./types";

/**
 * Wat er van een bestelling nog terug kan, en wat dat kost.
 *
 * Framework-onafhankelijk en zonder database eromheen: het formulier in de
 * browser laat dezelfde bedragen zien als de server ze wegschrijft, en
 * `store.ts` importeren zou de MySQL-driver de browserbundel in trekken —
 * dezelfde valkuil als bij de kortingscodes en de prijsregels
 * (docs/DECISIONS.md #17).
 */

/** Hoeveel dagen de klant heeft om zich op zijn bedenktijd te beroepen */
export const WITHDRAWAL_DAYS = 14;

export interface ReturnableLine {
  partId: string;
  name: string;
  brand: string;
  /** Wat er besteld is */
  ordered: number;
  /** Wat er al eerder is aangemeld */
  alreadyReturned: number;
  /** Wat er nu nog aangemeld kan worden */
  returnable: number;
  unitGrossCents: number;
}

/**
 * De regels van een bestelling, met per artikel wat er nog terug kan.
 *
 * `order.items` en `order.document.lines` lopen gelijk op; zo wordt het in
 * components/checkout/actions.ts opgebouwd.
 *
 * Twee keer hetzelfde artikel in één bestelling kan niet — de winkelwagen telt
 * het aantal op — maar mocht het ooit toch gebeuren, dan tellen we ze bij
 * elkaar op in plaats van de tweede regel stil te laten vallen.
 */
export function returnableLines(
  order: StoredOrder,
  alreadyReturned: ReadonlyMap<string, number>,
): ReturnableLine[] {
  const byPart = new Map<string, ReturnableLine>();

  for (const [index, item] of order.items.entries()) {
    const line = order.document.lines[index];
    const existing = byPart.get(item.partId);
    if (existing) {
      existing.ordered += item.quantity;
      existing.returnable = Math.max(0, existing.ordered - existing.alreadyReturned);
      continue;
    }
    const done = alreadyReturned.get(item.partId) ?? 0;
    byPart.set(item.partId, {
      partId: item.partId,
      name: line?.name ?? item.partId,
      brand: line?.brand ?? "",
      ordered: item.quantity,
      alreadyReturned: done,
      returnable: Math.max(0, item.quantity - done),
      unitGrossCents: line?.unitGrossCents ?? 0,
    });
  }

  return [...byPart.values()];
}

export interface RefundBreakdown {
  lines: ReturnLine[];
  /** De artikelen, al verminderd met het deel van de kortingscode */
  itemsCents: number;
  /** Alleen gevuld als hiermee de hele bestelling terug is */
  shippingCents: number;
  totalCents: number;
  /** Of hiermee alles uit de bestelling terug is */
  isComplete: boolean;
}

/**
 * Wat er terugbetaald moet worden voor deze selectie.
 *
 * **De verzendkosten gaan alleen mee terug als de hele bestelling terugkomt.**
 * Art. 6:230r lid 2 BW verplicht ons de oorspronkelijke verzendkosten terug te
 * betalen bij herroeping — maar dat is de levering van de héle bestelling.
 * Houdt de klant één artikel, dan is er verzonden en blijven die kosten staan.
 * Eerdere retouren tellen mee: wie eerst één van de twee artikelen
 * terugstuurde en nu het tweede, heeft uiteindelijk alles herroepen.
 *
 * **Een kortingscode wordt naar rato verrekend.** Anders krijgt iemand die met
 * 20% korting kocht en één artikel terugstuurt de volle prijs van dat artikel
 * terug, en verdient hij aan zijn retour. Het document zegt niet op welke
 * regels de code precies viel (dat hangt aan welke artikelen in de aanbieding
 * zaten), dus verdelen we hem over het artikelbedrag. Bij een volledige
 * retour klopt het tot op de cent; bij een deel kan het een cent schelen, en
 * dan in het voordeel van de klant.
 */
/**
 * De rekensom zelf, los van de bestelling: het formulier in de browser toont
 * hetzelfde bedrag als de server wegschrijft. Zou de browser het anders
 * uitrekenen, dan staat er straks een ander getal op het scherm dan op het
 * bankafschrift.
 */
export function refundTotal(input: {
  /** Wat de gekozen artikelen samen kostten, vóór de kortingscode */
  selectedGross: number;
  itemsGrossCents: number;
  discountCents: number;
  shippingGrossCents: number;
  isComplete: boolean;
}): { itemsCents: number; shippingCents: number; totalCents: number } {
  const share =
    input.discountCents > 0 && input.itemsGrossCents > 0
      ? Math.round((input.selectedGross / input.itemsGrossCents) * input.discountCents)
      : 0;
  const itemsCents = Math.max(0, input.selectedGross - share);
  const shippingCents = input.isComplete ? input.shippingGrossCents : 0;
  return { itemsCents, shippingCents, totalCents: itemsCents + shippingCents };
}

export function refundFor(
  order: StoredOrder,
  lines: ReturnableLine[],
  selection: ReadonlyMap<string, number>,
): RefundBreakdown {
  const chosen: ReturnLine[] = [];
  let gross = 0;

  for (const line of lines) {
    const wanted = selection.get(line.partId) ?? 0;
    const quantity = Math.min(Math.max(0, Math.trunc(wanted)), line.returnable);
    if (quantity === 0) continue;
    const lineGross = line.unitGrossCents * quantity;
    gross += lineGross;
    chosen.push({
      partId: line.partId,
      name: line.name,
      quantity,
      unitGrossCents: line.unitGrossCents,
      lineGrossCents: lineGross,
    });
  }

  const doc = order.document;
  // Dezelfde kap als hierboven, en niet de rauwe keuze. Zonder dat telt een
  // aantal van 99 op een regel waar er één terug kan als "alles terug", en dan
  // gaan de verzendkosten mee terug op een gedeeltelijke retour.
  const isComplete = lines.every((line) => {
    const wanted = Math.min(
      Math.max(0, Math.trunc(selection.get(line.partId) ?? 0)),
      line.returnable,
    );
    return line.alreadyReturned + wanted >= line.ordered;
  });

  const amounts = refundTotal({
    selectedGross: gross,
    itemsGrossCents: doc.itemsGrossCents,
    discountCents: doc.discount?.grossCents ?? 0,
    shippingGrossCents: doc.shippingGrossCents,
    isComplete,
  });

  return { lines: chosen, ...amounts, isComplete };
}

/**
 * De laatste dag waarop de bedenktijd loopt, gerekend vanaf de betaling.
 *
 * **Dit is een schatting en geen oordeel.** De wet rekent vanaf het moment van
 * ontvangst, en dat weten we niet — er komt geen statusbericht van de
 * vervoerder (docs/DECISIONS.md #18). Vanaf de betaling rekenen valt altijd in
 * het nadeel van de klant, dus het formulier weigert er niets op: het getal
 * staat alleen in de melding aan de beheerder, zodat die het zelf kan wegen.
 */
export function withdrawalDeadline(order: StoredOrder): Date | null {
  if (!order.paidAt) return null;
  const date = new Date(order.paidAt);
  date.setDate(date.getDate() + WITHDRAWAL_DAYS);
  return date;
}
