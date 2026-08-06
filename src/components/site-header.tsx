import { useTranslations } from "next-intl";
import { CaroLockup } from "@/components/brand/caro-lockup";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";

export function SiteHeader() {
  const t = useTranslations("header");

  return (
    <header className="border-b border-border">
      <div className="site-container flex h-16 items-center justify-between">
        <Link href="/" aria-label={t("homeAria")} className="rounded-sm">
          <CaroLockup className="text-2xl md:text-3xl" />
        </Link>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
