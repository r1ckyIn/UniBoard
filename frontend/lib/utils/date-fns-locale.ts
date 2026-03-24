import { useLocale } from "next-intl";
import { enUS, zhCN } from "date-fns/locale";

/**
 * Resolve the date-fns locale object from the active next-intl locale.
 */
export function useDateFnsLocale() {
  const locale = useLocale();
  return locale === "zh" ? zhCN : enUS;
}
