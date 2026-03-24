import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import DigestPage from "@/components/digest/DigestPage";

type Props = { params: Promise<{ locale: string }> };

export default async function DigestRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <DigestPage />
    </Suspense>
  );
}
