import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import TimetablePage from "@/components/timetable/TimetablePage";

type Props = { params: Promise<{ locale: string }> };

export default async function TimetableRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense>
      <TimetablePage />
    </Suspense>
  );
}
