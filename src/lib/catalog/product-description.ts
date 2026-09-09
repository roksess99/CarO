import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/shipping";

/** Wat een vertaalfunctie hier minimaal moet kunnen */
type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * Lopende tekst bij een artikel, opgebouwd uit wat de leverancier meestuurt.
 *
 * Waarom dit nodig is: een productpagina bestond uit een foto, een prijs en
 * een definitielijst. Voor een zoekmachine is dat een pagina zonder tekst, en
 * voor een twijfelende koper een pagina zonder antwoord. Dit maakt er drie
 * tot vier zinnen van.
 *
 * Waarom het geen verkooppraat is: elke zin komt uit een veld dat er écht is
 * — merk, categorie, de eerste twee attributen, het OE-nummer, de voorraad,
 * het verzendtarief. Ontbreekt een veld, dan valt de zin weg. "Uitstekende
 * kwaliteit tegen een scherpe prijs" zou op elk van de honderdduizenden
 * artikelen passen en is daarmee precies de dunne content waar Google op
 * afrekent — en het is niet waar, want wij hebben het artikel nooit gezien.
 *
 * De zinnen verschillen per artikel omdat de bouwstenen verschillen: naam,
 * merk, maat, seizoen en OE-nummer zijn samen uniek genoeg.
 */
export function productDescription(
  part: Part,
  /**
   * Soortnaam uit de familie ("band", "velg"), niet de categorienaam. Bij
   * banden heet de categorie "Auto / SUV" — dat is de voertuigklasse, en
   * "is een auto / suv van Falken" slaat nergens op.
   */
  itemNoun: string,
  categoryName: string,
  t: Translate,
  /** Label en waarde van een attribuut, net als de tabel ze toont */
  spec: (item: NonNullable<Part["specs"]>[number]) => {
    label: string;
    value: string;
  },
): string[] {
  const sentences: string[] = [];

  sentences.push(
    part.brand
      ? t("descIntro", {
          name: part.name,
          brand: part.brand,
          noun: itemNoun,
          category: categoryName,
        })
      : t("descIntroNoBrand", {
          name: part.name,
          noun: itemNoun,
          category: categoryName,
        }),
  );

  // De eerste twee attributen zijn in de praktijk de maat en de uitvoering;
  // dieper in de lijst wordt het verpakkingsinformatie.
  const specs = (part.specs ?? [])
    .slice(0, 2)
    .map(spec)
    .filter((item) => item.label && item.value)
    .map((item) => `${item.label.toLowerCase()} ${item.value}`);
  if (specs.length > 0) {
    sentences.push(t("descSpecs", { specs: specs.join(", ") }));
  }

  // Alleen als het écht een OE-nummer is. Bij banden staat in dit veld het
  // artikelnummer van de leverancier; dat als OE-nummer aankondigen zou de
  // klant op zoek sturen naar een nummer dat bij zijn auto niets betekent.
  // Zelfde toets als de tabel op de productpagina.
  const isOeNumber =
    Boolean(part.oeNumber) &&
    !(part.specs ?? []).some(
      (item) => item.key === "itemNumber" && item.value === part.oeNumber,
    );
  if (isOeNumber) {
    sentences.push(t("descFit", { oeNumber: part.oeNumber }));
  }

  sentences.push(
    t("descDelivery", {
      shipping: formatPriceCents(STANDARD_SHIPPING_CENTS),
      freeFrom: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
    }),
  );

  return sentences;
}
