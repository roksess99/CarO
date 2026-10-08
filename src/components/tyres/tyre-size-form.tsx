"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  TYRE_DIAMETERS,
  TYRE_HEIGHTS,
  TYRE_SEASONS,
  TYRE_WIDTHS,
  type TyreSeason,
  type TyreSize,
} from "@/lib/catalog/tyre-size";

/**
 * De bandenmaat kiezen, met het voorbeeld op de flank dat meeloopt.
 *
 * **Waarom dit een clientcomponent is.** Het blijft een gewoon GET-formulier:
 * de maat komt in de URL en is daarmee deelbaar en bookmarkbaar, en zonder
 * JavaScript werkt hij nog steeds — de keuzelijsten dragen hun eigen `name`.
 * Wat JavaScript toevoegt is één ding: het plaatje van de flank toont wat de
 * klant kiest. Dat stond er als vaste tekst "205/55 R16", en dan wijst een
 * voorbeeld iets anders aan dan de velden eronder — precies de verwarring die
 * het plaatje moest wegnemen.
 */
export function TyreSizeForm({
  action,
  size,
  season,
}: {
  /** Pad waar het formulier naartoe gaat; de pagina leest de query */
  action: string;
  size: TyreSize | null;
  season: TyreSeason | null;
}) {
  const t = useTranslations("tyres");
  const [width, setWidth] = useState(size ? String(size.width) : "");
  const [height, setHeight] = useState(size ? String(size.height) : "");
  const [diameter, setDiameter] = useState(size ? String(size.diameter) : "");

  // Expliciete achtergrond- en tekstkleur: een select zonder die twee rendert
  // zijn uitklapmenu met browserkleuren (.claude/rules/frontend.md).
  const selectClass =
    "h-12 w-full rounded-md border border-border bg-background px-3 font-semibold text-foreground tabular-nums";
  const labelClass = "mb-1 block text-xs font-semibold text-muted";

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
    options: readonly number[],
  ) => (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">–</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    /* Op desktop naast elkaar: de kaart loopt over de volle contentbreedte
       en met alles onder elkaar bleef rechts een half scherm leeg, terwijl
       de klant naar beneden moest voor de knop. Onder lg blijft het één
       kolom — daar klopte de volgorde al. */
    <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <TyreWall width={width} height={height} diameter={diameter} />

      <form action={action} className="mt-4 lg:mt-0">
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {field("breedte", t("width"), width, setWidth, TYRE_WIDTHS)}
          {field("hoogte", t("height"), height, setHeight, TYRE_HEIGHTS)}
          {field("diameter", t("diameter"), diameter, setDiameter, TYRE_DIAMETERS)}
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
    </div>
  );
}

/** Wit voor een gekozen getal, grijs voor het voorbeeld en voor een leeg vak */
const CHOSEN = "#FFFFFF";
const PLACEHOLDER = "#767C85";

/**
 * De maat zoals hij op de flank van de band staat. Klanten kennen
 * "205/55 R16" van hun eigen band, niet als drie losse keuzelijsten — dit
 * plaatje legt de brug naar de velden eronder.
 *
 * Twee toestanden, en het verschil zit in de kleur. Heeft de klant nog niets
 * gekozen, dan staat er een grijs **voorbeeld** (205/55 R16): dat is wat het
 * plaatje moet uitleggen. Kiest hij één veld, dan springt dat getal op wit en
 * worden de andere twee streepjes — zo kan er nooit een getal staan dat hij
 * niet zelf heeft ingevuld.
 */
function TyreWall({
  width,
  height,
  diameter,
}: {
  width: string;
  height: string;
  diameter: string;
}) {
  const leeg = !width && !height && !diameter;
  const marks = [
    { x: 92, value: width, example: "205" },
    { x: 152, value: height, example: "55" },
    { x: 216, value: diameter, example: "16" },
  ];

  return (
    // Blijft aria-hidden: dit is een afbeelding van wat de keuzelijsten
    // hieronder al zeggen, en die worden voorgelezen.
    <svg
      viewBox="0 0 300 80"
      aria-hidden="true"
      className="h-20 w-full max-w-md"
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
      <g fontSize="24" fontWeight="700" textAnchor="middle">
        {/* Drie losse tekstblokken in plaats van één regel: alleen zo staan de
            oranje streepjes gegarandeerd onder het juiste getal. Met één
            string hangt dat af van de lettersoort die de bezoeker binnenhaalt. */}
        {marks.map((mark) => (
          <text
            key={mark.x}
            x={mark.x}
            y="36"
            fill={mark.value ? CHOSEN : PLACEHOLDER}
          >
            {mark.value || (leeg ? mark.example : "––")}
          </text>
        ))}
        <text x="124" y="36" fill={PLACEHOLDER}>
          /
        </text>
        <text x="188" y="36" fill={PLACEHOLDER}>
          R
        </text>
      </g>
      {/* Streepje onder elk getal, in dezelfde volgorde als de drie
          keuzelijsten eronder: breedte, hoogte, diameter. */}
      <g stroke="#FF6A13" strokeWidth="3" strokeLinecap="round">
        {marks.map((mark) => (
          <path key={mark.x} d={`M${mark.x - 20} 62 H${mark.x + 20}`} />
        ))}
      </g>
    </svg>
  );
}
