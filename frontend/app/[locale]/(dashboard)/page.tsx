import { setRequestLocale } from "next-intl/server";
import DashboardPage from "@/components/dashboard/DashboardPage";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardPage />;
}
