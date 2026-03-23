export interface ActivitySummary {
  completedDeadlinesLast7Days: number;
  recentCompletedItems: string[];
}

export interface EncouragementText {
  message: string;
  highlightPhrase: string;
}

/** Translation function matching next-intl's useTranslations return type. */
export type TranslateFn = (
  key: string,
  params?: Record<string, string>
) => string;

export type EncouragementProvider = (
  activity: ActivitySummary,
  t: TranslateFn
) => EncouragementText;

export const defaultEncouragementProvider: EncouragementProvider = (
  activity,
  t
) => {
  // Multiple completed items - acknowledge effort, suggest rest
  if (activity.recentCompletedItems.length >= 2) {
    const items = activity.recentCompletedItems.slice(0, 2);
    const highlight = t("hero.encourage.multiCompleteHighlight");
    return {
      message: t("hero.encourage.multiComplete", {
        item1: items[0],
        item2: items[1],
        highlight,
      }),
      highlightPhrase: highlight,
    };
  }

  // Single completed item - steady progress
  if (activity.recentCompletedItems.length === 1) {
    const highlight = t("hero.encourage.singleCompleteHighlight");
    return {
      message: t("hero.encourage.singleComplete", {
        item: activity.recentCompletedItems[0],
        highlight,
      }),
      highlightPhrase: highlight,
    };
  }

  // High productivity week
  if (activity.completedDeadlinesLast7Days > 3) {
    const highlight = t("hero.encourage.highProductivityHighlight");
    return {
      message: t("hero.encourage.highProductivity", {
        count: String(activity.completedDeadlinesLast7Days),
        highlight,
      }),
      highlightPhrase: highlight,
    };
  }

  // Some progress this week
  if (activity.completedDeadlinesLast7Days > 0) {
    const highlight = t("hero.encourage.someProgressHighlight");
    return {
      message: t("hero.encourage.someProgress", {
        count: String(activity.completedDeadlinesLast7Days),
        highlight,
      }),
      highlightPhrase: highlight,
    };
  }

  // Fresh start
  const highlight = t("hero.encourage.freshStartHighlight");
  return {
    message: t("hero.encourage.freshStart", { highlight }),
    highlightPhrase: highlight,
  };
};
