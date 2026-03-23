import { setRequestLocale } from "next-intl/server";
import CourseDetailPage from "@/components/course-detail/CourseDetailPage";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function Page({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <CourseDetailPage courseId={id} />;
}
