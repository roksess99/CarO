import type { OrderDocumentLine } from "@/lib/checkout/order-document";

/**
 * Merk en naam, zonder het merk twee keer te noemen.
 *
 * Bij banden zit het merk al in de naam die de leverancier levert ("FALKEN
 * HS02 195/65 R15 91 T"), bij onderdelen niet ("Remblokkenset, schijfrem" van
 * KRAFT AUTOMOTIVE). Het merk er blind voor plakken gaf "FALKEN FALKEN HS02 …"
 * in de bevestigingsmail. Bij velgen is `brand` soms leeg, want daar zet de
 * groothandel een omschrijving in dat veld (zie tyre24-provider).
 *
 * Staat in een eigen bestand omdat alle drie de plekken waar een bestelling
 * naar buiten gaat hem gebruiken: de klantmail, het inkoopbriefje voor de
 * beheerder en de voorvertoning in /api/dev/order-mail.
 */
export function productLabel(line: OrderDocumentLine): string {
  const brand = line.brand.trim();
  if (!brand) return line.name;
  const opening = line.name.slice(0, brand.length);
  const alreadyThere =
    opening.localeCompare(brand, "nl", { sensitivity: "base" }) === 0;
  return alreadyThere ? line.name : `${brand} ${line.name}`;
}
