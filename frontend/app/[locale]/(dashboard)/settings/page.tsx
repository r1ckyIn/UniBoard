import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import SettingsPage from "@/components/settings/SettingsPage";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
