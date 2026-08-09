import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// Zoekbalk in de header. Bewust een gewoon GET-formulier: werkt zonder
// JavaScript, is bookmarkbaar en heeft geen client-side state nodig.
export async function SiteSearch({
  locale,
  defaultValue,
  className = "",
  autoFocus = false,
  // Het veld staat meerdere keren op een pagina (header desktop, header
  // mobiel, zoekpagina). Elk exemplaar heeft een eigen id nodig, anders
  // wijzen de labels naar hetzelfde veld.
  id,
}: {
  locale: string;
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
  id: string;
}) {
  const t = await getTranslations("search");
  const action = getPathname({
    locale: locale as Locale,
    href: "/search",
  });

  return (
    <form action={action} role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue ?? ""}
        placeholder={t("placeholder")}
        autoComplete="off"
        // Alleen op de zoekpagina zelf, waar zoeken het hoofddoel is
        autoFocus={autoFocus}
        className="w-full rounded-md border border-border bg-background py-2 pr-20 pl-10 text-sm"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md bg-caro-orange px-4 py-1.5 text-sm font-semibold text-caro-ink"
      >
        {t("submit")}
      </button>
    </form>
  );
}
