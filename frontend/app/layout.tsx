import type { ReactNode } from "react";
import "./globals.css";

/**
 * Root layout -- minimal wrapper.
 * The [locale] layout handles HTML lang, fonts, and providers.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
