import { setRequestLocale } from "next-intl/server";
import DeadlinesPage from "@/components/deadlines/DeadlinesPage";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DeadlinesPage />;
}
