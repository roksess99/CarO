import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CAR_MAKES } from "@/lib/footer-links";

/**
 * Populaire automerken als raster van knoppen.
 *
 * Autodoc zet hier zestien merken neer (bekeken 2026-11-23); wij acht, en dat
 * is geen zuinigheid. Het zijn de merken uit de footer, en die zijn gemeten:
 * Citroën gaf drie artikelen en staat er daarom niet in
 * (`lib/footer-links.ts`). Een merk aanbieden dat op een lege pagina uitkomt
 * is erger dan het weglaten.
 *
 * De link gaat naar /mijn-auto met het merk erin. Daar staan de
 * kentekenzoeker én de merk/model-kiezer bovenaan, dus de klant kan meteen
 * een uitvoering kiezen en komt uit op onderdelen die passen.
 */
export async function PopularMakes() {
  const t = await getTranslations("homeInfo");

  return (
    <section aria-labelledby="popular-makes">
      <h2 id="popular-makes" className="text-xl md:text-2xl">
        {t("makesTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-muted">{t("makesIntro")}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CAR_MAKES.map((make) => (
          <li key={make}>
            <Link
              href={{ pathname: "/my-car", query: { merk: make } }}
              className="flex h-full items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:border-caro-orange hover:bg-surface"
            >
              {make}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link
          href="/my-car"
          className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
        >
          {t("makesAll")} ›
        </Link>
      </p>
    </section>
  );
}
