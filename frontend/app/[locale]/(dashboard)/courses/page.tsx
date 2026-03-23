import { setRequestLocale } from "next-intl/server";
import CoursesPage from "@/components/courses/CoursesPage";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CoursesPage />;
}
