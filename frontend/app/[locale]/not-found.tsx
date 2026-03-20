import { useTranslations } from "next-intl";

/**
 * Locale-specific 404 page.
 */
export default function NotFound() {
  const t = useTranslations("common");
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-text-1 mb-4">404</h1>
        <p className="text-text-2">{t("error")}</p>
      </div>
    </div>
  );
}
