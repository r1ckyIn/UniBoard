import { redirect } from "next/navigation";

/**
 * Root page -- redirects to the default locale.
 * The middleware handles locale detection from Accept-Language,
 * but this page covers direct visits to /.
 */
export default function RootPage() {
  redirect("/en");
}
