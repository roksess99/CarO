import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GROUP_PHOTO_SIZE, groupPhoto } from "@/lib/catalog/group-photos";
import { POPULAR_PART_PHOTOS, POPULAR_PARTS } from "@/lib/footer-links";

/**
 * Veelgezochte onderdelen als fototegels, direct onder de hero.
 *
 * Bij Autodoc en Winparts staat dit blok als eerste onder het zoekpaneel
 * (bekeken 2026-11-23): wie geen kenteken bij de hand heeft, kiest een
 * onderdeel op het oog. Bij ons stond er alleen de vier productgroepen, dus
 * de klant die "remblokken" zocht moest eerst naar Onderdelen en daar een
 * auto opgeven.
 *
 * De tegels zoeken op naam, net als "Veelgezocht" in de footer: dat werkt
 * zonder gekozen auto, en elke term is gemeten op treffers
 * (`lib/footer-links.ts`). De labels blijven in beide talen Nederlands, want
 * het label ís de zoekterm en de catalogus spreekt geen Engels.
 *
 * Kost geen verzoek bij de leverancier: de lijst en de foto's staan bij ons.
 */
export async function PopularParts() {
  const t = await getTranslations("homeInfo");

  return (
    <section className="site-container pt-12 md:pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-2xl md:text-3xl">{t("partsTitle")}</h2>
        <Link
          href="/my-car"
          className="text-sm font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
        >
          {t("partsByCar")}
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-muted">{t("partsIntro")}</p>

      {/* Op een telefoon ook vier naast elkaar, met kleine foto's. In twee
          kolommen waren acht tegels samen 1.040px hoog (GEMETEN 2026-11-23 op
          375px) en duwden ze alles eronder anderhalf scherm weg. */}
      <ul className="mt-6 grid grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {POPULAR_PARTS.map((part) => {
          const photo = groupPhoto(POPULAR_PART_PHOTOS[part]);
          return (
            <li key={part}>
              <Link
                href={{ pathname: "/search", query: { q: part } }}
                className="group flex h-full flex-col items-center gap-2 rounded-lg border border-border bg-background px-1 py-2 text-center hover:border-caro-orange sm:gap-3 sm:p-4"
              >
                {photo && (
                  <Image
                    src={photo}
                    // Het label eronder zegt al wat het is
                    alt=""
                    width={GROUP_PHOTO_SIZE}
                    height={GROUP_PHOTO_SIZE}
                    sizes="(min-width: 640px) 160px, 20vw"
                    className="aspect-square w-full max-w-36 rounded-md bg-white object-contain p-1 ring-1 ring-caro-ink/10 sm:p-2"
                  />
                )}
                {/* lang="nl": het label is ook op de Engelse pagina Nederlands,
                    en zo breekt "Distributieriem" op een lettergreep in
                    plaats van midden in een woord. */}
                <span
                  lang="nl"
                  className="w-full text-xs font-semibold [overflow-wrap:anywhere] hyphens-auto sm:text-base group-hover:underline group-hover:decoration-caro-orange group-hover:decoration-2 group-hover:underline-offset-4">
                  {part}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
