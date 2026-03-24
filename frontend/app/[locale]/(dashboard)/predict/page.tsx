import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import PredictPage from "@/components/predict/PredictPage";

type Props = { params: Promise<{ locale: string }> };

export default async function PredictRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <PredictPage />
    </Suspense>
  );
}
