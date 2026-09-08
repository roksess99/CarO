/**
 * Gestructureerde data voor zoekmachines.
 *
 * `dangerouslySetInnerHTML` is hier de bedoelde weg: React zou de JSON anders
 * als tekst escapen en dan leest Google er niets van. De inhoud komt altijd
 * uit `JSON.stringify`, dus er staat nooit ongecontroleerde HTML in.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
