"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { familyFromSlug, familySlug } from "@/lib/catalog/families";

export function LocaleSwitcher() {
  const t = useTranslations("localeSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  // Filters en zoektermen staan in de querystring en moeten de taalwissel
  // overleven; de filtersleutels zijn daarvoor taalonafhankelijk gemaakt.
  const query = Object.fromEntries(
    [...new Set(searchParams.keys())].map((key) => {
      const values = searchParams.getAll(key);
      return [key, values.length > 1 ? values : values[0]];
    }),
  );

  /**
   * Draagt `params` alles wat dit pathname nodig heeft?
   *
   * `usePathname()` leest de URL en `useParams()` de gerenderde boom, en die
   * twee lopen niet altijd gelijk op — tijdens een Fast Refresh op een
   * categoriepagina stond de URL al op `/[family]` terwijl params nog alleen
   * `{locale}` droeg. De Link gooit dan *Insufficient params provided for
   * localized pathname*, en een fout tijdens het renderen laat React de hele
   * boom opnieuw opbouwen in de browser — wat op zijn beurt de waarschuwing
   * over het thema-script in de `<head>` oplevert. Twee meldingen, één
   * oorzaak.
   *
   * GEMETEN 2026-10-14 in de console, met `Template: /[family]` en
   * `Params: {"locale":"nl"}` erbij.
   *
   * Een taalknop is het niet waard om een pagina voor om te gooien, dus bij
   * een gat valt hij terug op de homepage van die taal. Dat duurt één render:
   * zodra de boom bij de URL is, staat de juiste link er weer.
   */
  function hasParamsFor(path: string): boolean {
    return [...path.matchAll(/\[\.*([^\]]+)\]/g)].every(
      ([, name]) => params[name] !== undefined,
    );
  }

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
          href={
            hasParamsFor(pathname)
              ? { pathname, params: paramsForLocale(l), query }
              : "/"
          }
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
