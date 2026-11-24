import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import { GROUP_PHOTO_SIZE, groupPhoto } from "@/lib/catalog/group-photos";
import { POPULAR_PARTS } from "@/lib/footer-links";

/**
 * Veelgezochte onderdelen als fototegels, direct onder de hero.
 *
 * Bij Autodoc en Winparts staat dit blok als eerste onder het zoekpaneel
 * (bekeken 2026-11-23): wie geen kenteken bij de hand heeft, kiest een
 * onderdeel op het oog. Bij ons stond er alleen de vier productgroepen, dus
 * de klant die "remblokken" zocht moest eerst naar Onderdelen en daar een
 * auto opgeven.
 *
 * **De tegels zochten tot 2026-11-24 op naam en dat was fout.** Zes van de
 * acht kwamen uit bij iets anders: "Remschijf" gaf schroeven en dekplaten,
 * "Schokdemper" beschermkappen. De meetreeks staat bij `POPULAR_PARTS` in
 * `lib/footer-links.ts`. Ze wijzen nu een eindgroep aan in de boom van de
 * auto — hetzelfde pad als de rij "meest gezocht" op de onderdelenpagina —
 * en daarom mag het label wél vertaald worden: het is geen zoekterm meer.
 *
 * Kost geen verzoek bij de leverancier: de lijst en de foto's staan bij ons.
 */
export async function PopularParts() {
  const [t, tPart, locale] = await Promise.all([
    getTranslations("homeInfo"),
    getTranslations("partNames"),
    getLocale(),
  ]);
  const parts = familySlug("onderdelen", locale);

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
          375px) en duwden ze alles eronder anderhalf scherm weg.

          Op `xl` juist acht op één rij. GEMETEN 2026-11-24 op 1280px: met
          vier kolommen was een tegel 292px breed om een foto van 144px
          (`max-w-36`) heen — ruim de helft lege tegel. Met acht is hij 138px
          en vult de foto hem bijna; het blok is dan ook één rij in plaats
          van twee. */}
      <ul className="mt-6 grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 xl:grid-cols-8">
        {POPULAR_PARTS.map((part) => {
          const photo = groupPhoto(part.photo);
          return (
            <li key={part.key}>
              <Link
                href={{
                  pathname: "/[family]",
                  params: { family: parts },
                  query: { deel: part.key },
                }}
                // Dezelfde omlijning als de rij "meest gezocht" op de
                // onderdelenpagina (`group-list.tsx`, compact): het zijn
                // dezelfde onderdelen in dezelfde rol, dus ze horen er
                // hetzelfde uit te zien.
                className="group flex h-full flex-col items-center gap-2 rounded-lg border border-caro-orange/40 bg-background px-1 py-2 text-center transition-colors hover:border-caro-orange hover:bg-surface sm:gap-3 sm:p-4"
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
                {/* **Het afbreekpunt staat in de vertaling zelf**, als een
                    zacht afbreekstreepje (`­`) in `partNames`. GEMETEN
                    2026-11-24 op 375px: het labelvak is dan 70px en
                    "Distributieriem" 86px, dus drie van de acht braken
                    middenin — "Remblokke / n", "Schokdemp / er". Dat is wat
                    `[overflow-wrap:anywhere]` doet, en `hyphens-auto` komt er
                    niet aan te pas: dat vraagt een woordenlijst die niet elke
                    browser heeft. Een zacht streepje werkt overal, is
                    onzichtbaar waar het past en wordt door schermlezers
                    genegeerd. De regel hieronder blijft staan als vangnet. */}
                <span className="w-full text-xs font-semibold [overflow-wrap:anywhere] hyphens-auto sm:text-sm group-hover:underline group-hover:decoration-caro-orange group-hover:decoration-2 group-hover:underline-offset-4">
                  {tPart(part.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
