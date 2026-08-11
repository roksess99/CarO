import { SearchBox } from "@/components/search/search-box";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// Zoekbalk in de header. Het formulier eromheen blijft een gewoon GET-
// formulier: zonder JavaScript kom je nog steeds op de zoekpagina uit, met
// JavaScript krijg je er live suggesties bij.
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
  const action = getPathname({
    locale: locale as Locale,
    href: "/search",
  });

  return (
    <SearchBox
      action={action}
      id={id}
      defaultValue={defaultValue}
      className={className}
      autoFocus={autoFocus}
    />
  );
}
