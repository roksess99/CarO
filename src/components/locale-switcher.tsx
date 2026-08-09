"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { familyFromSlug, familySlug } from "@/lib/catalog/families";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();

  /**
   * De familieslug is taalafhankelijk (banden ↔ tyres). Zonder deze
   * vertaling zou de taalwissel naar /en/banden/... gaan en dat bestaat niet.
   */
  function paramsForLocale(targetLocale: string) {
    const familyParam = params.family;
    if (typeof familyParam !== "string") return params;
    const family = familyFromSlug(familyParam, locale);
    if (!family) return params;
    return { ...params, family: familySlug(family, targetLocale) };
  }

  return (
    <nav aria-label={t("label")} className="flex items-center text-sm font-semibold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          // @ts-expect-error -- params horen bij het huidige pathname (next-intl-patroon voor dynamische routes)
          href={{ pathname, params: paramsForLocale(l) }}
          locale={l}
          aria-label={t(l)}
          aria-current={l === locale ? "true" : undefined}
          className={
            l === locale
              ? "px-2 py-1 text-foreground underline decoration-caro-orange decoration-2 underline-offset-4"
              : "px-2 py-1 text-muted hover:text-foreground"
          }
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
