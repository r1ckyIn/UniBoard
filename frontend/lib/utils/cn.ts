import clsx, { type ClassValue } from "clsx";

/**
 * Merge class names conditionally using clsx.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
