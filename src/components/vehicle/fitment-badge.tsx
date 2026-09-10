"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import {
  checkFitmentAction,
  type FitmentResult,
} from "@/components/vehicle/fitment-actions";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { VehicleSearch } from "@/components/vehicle/vehicle-search";
import { Link } from "@/i18n/navigation";
import { familySlug, type ProductFamily } from "@/lib/catalog/families";
import { vehicleLabel } from "@/lib/vehicle/label";

/**
 * Past dit onderdeel op de auto van de bezoeker?
 *
 * De belangrijkste vraag op een onderdelenpagina, en tot nu toe stond het
 * antwoord nergens: de klant zag wel een prijs, maar moest zelf uit het
 * OE-nummer opmaken of hij het juiste artikel voor zich had.
 *
 * Vier eerlijke staten, en géén vijfde die gokt:
 *
 * - geen auto gekozen → uitnodiging met het kentekenveld erbij
 * - past → groen, met de auto er voluit bij zodat hij te controleren is
 * - past niet → rood, met de weg terug naar de onderdelen die wél passen
 * - niet te bepalen → oranje "controleer de passing"
 *
 * Client component omdat de auto in localStorage leeft (use-vehicle.ts) en
 * dus pas na hydratie bekend is; de controle zelf loopt server-side door een
 * Server Action (fitment-actions.ts).
 */
export function FitmentBadge({
  family,
  articleId,
  categorySlug,
}: {
  family: ProductFamily;
  articleId: string;
  categorySlug: string;
}) {
  const t = useTranslations("fitment");
  const locale = useLocale();
  const vehicle = useVehicle();
  // De uitkomst wordt bewaard mét de auto waar hij bij hoort. Zonder dat zou
  // een klant die van auto wisselt eerst nog de groene vink van de vórige
  // auto zien staan — en dat is precies de vergissing die deze badge moet
  // voorkomen. Zo hoeft er ook niets gewist te worden bij een wisseling: de
  // uitkomst is simpelweg niet meer van toepassing.
  const [checked, setChecked] = useState<{
    carId: number;
    outcome: FitmentResult;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [showFinder, setShowFinder] = useState(false);
  const carId = vehicle?.carId;
  const result =
    checked && carId !== undefined && checked.carId === carId
      ? checked.outcome
      : null;

  useEffect(() => {
    if (!carId) return;
    let current = true;
    startTransition(async () => {
      const outcome = await checkFitmentAction(
        family,
        articleId,
        categorySlug,
        carId,
      );
      // De klant kan van auto wisselen terwijl de call loopt; dan hoort het
      // antwoord bij de vorige auto en zou een groene vink liegen.
      if (current) setChecked({ carId, outcome });
    });
    return () => {
      current = false;
    };
  }, [family, articleId, categorySlug, carId]);

  // Geen auto gekozen: uitnodigen, niet oordelen. Het kentekenveld staat er
  // meteen bij — de klant hoeft niet terug naar de header om de vraag die
  // hij hier heeft beantwoord te krijgen.
  if (!vehicle) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <Icon tone="unknown" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("noVehicleTitle")}</p>
            <p className="mt-1 text-sm text-muted">{t("noVehicleBody")}</p>
          </div>
        </div>
        {showFinder ? (
          <div className="mt-4">
            <VehicleSearch
              compact
              autoFocus
              onSelected={() => setShowFinder(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowFinder(true)}
            className="mt-3 h-11 w-full rounded-md border-2 border-caro-orange px-4 font-semibold text-foreground hover:bg-caro-orange/10"
          >
            {t("enterPlate")}
          </button>
        )}
      </div>
    );
  }

  const label = vehicleLabel(vehicle);

  // Zolang de controle loopt geen voorlopig oordeel tonen: een badge die van
  // groen naar rood springt is erger dan een badge die even niets zegt.
  if (pending || result === null) {
    return (
      <Card tone="pending">
        <p className="font-semibold">{t("checking")}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </Card>
    );
  }

  if (result === "fits") {
    return (
      <Card tone="fits">
        <p className="font-semibold">{t("fitsTitle")}</p>
        <p className="mt-1 text-sm font-medium">{label}</p>
      </Card>
    );
  }

  if (result === "doesNotFit") {
    return (
      <Card tone="doesNotFit">
        <p className="font-semibold">{t("doesNotFitTitle", { car: label })}</p>
        <p className="mt-1 text-sm text-muted">{t("doesNotFitBody")}</p>
        {carId && (
          <Link
            href={{
              pathname: "/[family]",
              params: { family: familySlug("onderdelen", locale) },
              query: { auto: String(carId) },
            }}
            className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4"
          >
            {t("browseFitting")}
          </Link>
        )}
      </Card>
    );
  }

  return (
    <Card tone="unknown">
      <p className="font-semibold">{t("unknownTitle")}</p>
      <p className="mt-1 text-sm text-muted">
        {t("unknownBody", { car: label })}
      </p>
    </Card>
  );
}

type Tone = "fits" | "doesNotFit" | "unknown" | "pending";

/**
 * Dezelfde kleurafspraak als de voorraadbadge: kleur draagt de boodschap niet
 * alleen (WCAG 2.2 — 1.4.1), elke staat heeft een eigen pictogram én tekst.
 * Merkoranje blijft buiten beeld, dat is het accent van de koopknop.
 */
const TONES: Record<Tone, string> = {
  fits: "border-green-600/30 bg-green-50 text-green-900 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-100",
  doesNotFit:
    "border-danger/30 bg-danger/5 text-foreground dark:border-danger/40 dark:bg-danger/10",
  unknown:
    "border-amber-600/30 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-50",
  pending: "border-border bg-surface text-foreground",
};

function Card({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border p-4 ${TONES[tone]}`}
    >
      <Icon tone={tone} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Icon({ tone }: { tone: Tone }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "mt-0.5 size-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (tone === "fits") {
    return (
      <svg {...common} className={`${common.className} text-green-700 dark:text-green-300`}>
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path d="m8 12.5 2.5 2.5L16 9.5" />
      </svg>
    );
  }
  if (tone === "doesNotFit") {
    return (
      <svg {...common} className={`${common.className} text-danger`}>
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (tone === "pending") {
    return (
      <svg {...common} className={`${common.className} text-muted`}>
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }
  return (
    <svg {...common} className={`${common.className} text-amber-700 dark:text-amber-300`}>
      <path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" strokeWidth={2} />
      <path d="M12 9.5v4" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}
