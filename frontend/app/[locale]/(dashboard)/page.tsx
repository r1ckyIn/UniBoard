import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardContent />;
}

function DashboardContent() {
  const t = useTranslations("dashboard");

  return (
    <div>
      <AnimatedEntry delay={1}>
        <h1 className="font-serif text-[1.5rem] font-bold tracking-[-0.02em] mb-2">
          {t("welcome")}
        </h1>
      </AnimatedEntry>
      <AnimatedEntry delay={2}>
        <p className="text-text-2 text-[0.88rem]">{t("subtitle")}</p>
      </AnimatedEntry>
    </div>
  );
}
