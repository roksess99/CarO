import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { AssemblyGroup } from "@/lib/catalog/wearparts";
import { groupSlug } from "@/lib/catalog/wearparts-provider";

/**
 * Categorielijst voor onderdelen: één groep per rij, met het pictogram van
 * de leverancier ervoor.
 *
 * Rijen en geen tegelraster: op een telefoon is dit de belangrijkste
 * navigatie van de hele site, en groepsnamen als "Gloeibougie &
 * Ontstekingssysteem" passen niet op de twee regels die een tegel heeft.
 * Een rij over de volle breedte leest in één oogopslag en is meteen een
 * ruim aanraakdoel.
 *
 * De pictogrammen zijn zwarte silhouetten op transparant — daarom een wit
 * vlak eronder, ook in donkere modus, anders verdwijnen ze.
 *
 * GEMETEN 2026-09-07: alleen de hoofdgroepen hebben een pictogram. De
 * subgroepen ("ABS wielsensoren", "Hoofdremcilinder") krijgen er géén van de
 * leverancier, en een rij lege vlakken leest slechter dan geen vlak. Vandaar
 * dat de lijst de beeldkolom als geheel weglaat zodra niemand er een heeft.
 *
 * Staat er in dezelfde lijst wél een pictogram naast een groep zonder, dan
 * mag daar geen grijs vlak blijven staan: dat leest als een plaatje dat nog
 * moet laden, terwijl er nooit een komt. Een moer in lijn met het merkteken
 * vult het gat en houdt de rijen uitgelijnd.
 *
 * Het aantal achter de naam is er om dezelfde reden als het weglaten van lege
 * groepen: de klant moet vóór de klik kunnen zien wat hem te wachten staat.
 * Ontbreekt het (telling mislukt of niet opgevraagd), dan staat er niets —
 * geen "0", want dat zou een leugen zijn.
 */
export function GroupList({
  groups,
  familySlugParam,
  carId,
}: {
  groups: readonly AssemblyGroup[];
  familySlugParam: string;
  carId: number;
}) {
  const withIcons = groups.some((group) => group.iconUrl);

  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <li key={group.id}>
          <Link
            href={{
              pathname: "/[family]/[category]",
              params: { family: familySlugParam, category: groupSlug(group) },
              query: { auto: String(carId) },
            }}
            className={`flex h-full items-center gap-3 rounded-xl border border-border bg-background transition-colors hover:border-caro-orange hover:bg-surface ${
              withIcons ? "p-2" : "min-h-14 px-4 py-3"
            }`}
          >
            {withIcons &&
              (group.iconUrl ? (
                <Image
                  src={group.iconUrl}
                  alt=""
                  width={240}
                  height={150}
                  sizes="80px"
                  className="h-14 w-20 shrink-0 rounded-lg bg-white object-contain p-1"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-surface"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6 text-muted/50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  >
                    {/* Zeskantmoer met open gat — hetzelfde motief als het
                        merkteken, zie docs/BRAND.md */}
                    <path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </span>
              ))}
            <span className="flex-1 text-sm leading-snug font-semibold">
              {group.name}
            </span>
            {group.articleCount !== undefined && group.articleCount > 0 && (
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {group.articleCount}
              </span>
            )}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="me-1 size-5 shrink-0 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
