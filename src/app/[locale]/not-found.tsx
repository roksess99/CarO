import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="site-container py-16 md:py-24">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
