/**
 * Faculty-specific WAM level weight schemes for USYD.
 *
 * Standard: all levels weighted equally at 1.
 * Engineering (EIHWAM): 0/2/3/4 for 1000/2000/3000/4000+ level.
 * Science Honours (SCIWAM): 0/2/3 for 1000/2000/3000+ level.
 */

export type FacultyScheme = "standard" | "engineering" | "science_honours";

export const FACULTY_WEIGHTS: Record<FacultyScheme, (level: number) => number> =
  {
    standard: () => 1,

    engineering: (level: number) => {
      if (level >= 4) return 4;
      if (level === 3) return 3;
      if (level === 2) return 2;
      return 0; // 1000-level excluded
    },

    science_honours: (level: number) => {
      if (level >= 3) return 3;
      if (level === 2) return 2;
      return 0; // 1000-level excluded
    },
  };

/**
 * Parse the course level from a USYD course code.
 * E.g. "COMP2017" -> 2, "COMP3221" -> 3, "EDGU1003" -> 1.
 * Finds the first digit in the code string.
 */
export function getLevelFromCode(code: string): number {
  const match = code.match(/\d/);
  return match ? parseInt(match[0], 10) : 1;
}
