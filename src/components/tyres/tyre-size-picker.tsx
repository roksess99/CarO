import { getTranslations } from "next-intl/server";
import {
  TYRE_DIAMETERS,
  TYRE_HEIGHTS,
  TYRE_SEASONS,
  TYRE_WIDTHS,
  type TyreSeason,
  type TyreSize,
} from "@/lib/catalog/tyre-size";

/**
 * Bandenmaat kiezen: breedte, hoogte, diameter en seizoen.
 *
 * Een gewoon GET-formulier, geen JavaScript: de maat komt in de URL en is
 * daarmee deelbaar en bookmarkbaar — precies wat een klant met twee auto's
 * nodig heeft. Zelfde aanpak als het zoekveld voor onderdelen.
 *
 * Waarom er geen tabblad "per auto" naast staat: geen van beide API's van de
 * leverancier koppelt een voertuig aan een bandenmaat. De Products-API heeft
 * geen voertuig-endpoints (docs/api/TYRE24.md) en de RDW-registratie levert de
 * maat niet mee (docs/DECISIONS.md #6). De maat van de band die er nú op zit
 * staat op de flank — vandaar het plaatje en de uitleg.
 */
export async function TyreSizePicker({
  action,
  size,
  season,
}: {
  /** Pad waar het formulier naartoe gaat; de pagina leest de query */
  action: string;
  size: TyreSize | null;
  season: TyreSeason | null;
}) {
  const t = await getTranslations("tyres");

  // Expliciete achtergrond- en tekstkleur: een select zonder die twee rendert
  // zijn uitklapmenu met browserkleuren (.claude/rules/frontend.md).
  const selectClass =
    "h-12 w-full rounded-md border border-border bg-background px-3 font-semibold text-foreground tabular-nums";
  const labelClass = "mb-1 block text-xs font-semibold text-muted";

  return (
    <section className="mt-8 rounded-xl border border-border p-4 md:p-6">
      <h2 className="text-lg">{t("pickerTitle")}</h2>

      <TyreWall />

      <form action={action} className="mt-4">
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <div>
            <label htmlFor="breedte" className={labelClass}>
              {t("width")}
            </label>
            <select
              id="breedte"
              name="breedte"
              defaultValue={size ? String(size.width) : ""}
              className={selectClass}
            >
              <option value="">–</option>
              {TYRE_WIDTHS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="hoogte" className={labelClass}>
              {t("height")}
            </label>
            <select
              id="hoogte"
              name="hoogte"
              defaultValue={size ? String(size.height) : ""}
              className={selectClass}
            >
              <option value="">–</option>
              {TYRE_HEIGHTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="diameter" className={labelClass}>
              {t("diameter")}
            </label>
            <select
              id="diameter"
              name="diameter"
              defaultValue={size ? String(size.diameter) : ""}
              className={selectClass}
            >
              <option value="">–</option>
              {TYRE_DIAMETERS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className={labelClass}>{t("season")}</legend>
          {/* Radioknoppen en geen keuzelijst: het zijn er vier en ze passen op
              een telefoon op twee regels. Zo is de keuze meteen zichtbaar. */}
          <div className="flex flex-wrap gap-2">
            {(["", ...TYRE_SEASONS] as const).map((value) => (
              <label key={value || "alle"} className="cursor-pointer">
                <input
                  type="radio"
                  name="seizoen"
                  value={value}
                  defaultChecked={(season ?? "") === value}
                  className="peer sr-only"
                />
                <span className="flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold peer-checked:border-caro-orange peer-checked:bg-caro-orange peer-checked:text-caro-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-caro-orange">
                  {t(`seasons.${value || "all"}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="mt-6 h-12 w-full rounded-md bg-caro-orange px-6 font-semibold text-caro-ink sm:w-auto sm:min-w-64"
        >
          {t("submit")}
        </button>
      </form>

      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted hover:text-foreground">
          {t("helpTitle")}
        </summary>
        <p className="mt-1 max-w-prose text-sm text-muted">{t("helpBody")}</p>
      </details>
    </section>
  );
}

/**
 * De maat zoals hij op de flank van de band staat. Klanten kennen
 * "205/55 R16" van hun eigen band, niet als drie losse keuzelijsten — dit
 * plaatje legt de brug naar de velden eronder.
 */
function TyreWall() {
  // Drie losse tekstblokken in plaats van één regel: alleen zo staan de
  // oranje streepjes gegarandeerd onder het juiste getal. Met één string
  // hangt dat af van de lettersoort die de bezoeker binnenhaalt.
  const marks = [
    { x: 92, label: "205" },
    { x: 152, label: "55" },
    { x: 216, label: "16" },
  ];

  return (
    <svg
      viewBox="0 0 300 80"
      aria-hidden="true"
      className="mt-4 h-20 w-full max-w-md"
    >
      {/* Flank van de band: donker vlak met de maat erin gestanst. Vaste
          kleuren mogen hier — dit is een afbeelding van een band, geen UI.
          De rand houdt hem zichtbaar in donkere modus, waar het zwarte vlak
          anders in de achtergrond wegvalt. */}
      <rect
        x="6"
        y="4"
        width="288"
        height="48"
        rx="12"
        fill="#0E1013"
        stroke="#767C85"
      />
      <g fill="#FFFFFF" fontSize="24" fontWeight="700" textAnchor="middle">
        {marks.map((mark) => (
          <text key={mark.label} x={mark.x} y="36">
            {mark.label}
          </text>
        ))}
        <text x="124" y="36">
          /
        </text>
        <text x="188" y="36">
          R
        </text>
      </g>
      {/* Streepje onder elk getal, in dezelfde volgorde als de drie
          keuzelijsten eronder: breedte, hoogte, diameter. */}
      <g stroke="#FF6A13" strokeWidth="3" strokeLinecap="round">
        {marks.map((mark) => (
          <path key={mark.label} d={`M${mark.x - 20} 62 H${mark.x + 20}`} />
        ))}
      </g>
    </svg>
  );
}
