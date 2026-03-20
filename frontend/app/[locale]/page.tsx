import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomePage />;
}

function HomePage() {
  const t = useTranslations("nav");
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-text-1 mb-4">
          UniBoard
        </h1>
        <p className="text-text-2">{t("dashboard")}</p>
      </div>
    </div>
  );
}
