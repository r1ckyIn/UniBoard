export interface ActivitySummary {
  completedDeadlinesLast7Days: number;
  recentCompletedItems: string[];
}

export interface EncouragementText {
  message: string;
  highlightPhrase: string;
}

export type EncouragementProvider = (activity: ActivitySummary) => EncouragementText;

export const defaultEncouragementProvider: EncouragementProvider = (activity) => {
  // Multiple completed items - acknowledge effort, suggest rest
  if (activity.recentCompletedItems.length >= 2) {
    const items = activity.recentCompletedItems.slice(0, 2);
    return {
      message: `The ${items[0]} and the ${items[1]} are done and behind you now. You've been working so hard — it's okay to take it slow today.`,
      highlightPhrase: "it's okay to take it slow today",
    };
  }
  // Single completed item - steady progress
  if (activity.recentCompletedItems.length === 1) {
    return {
      message: `${activity.recentCompletedItems[0]} is behind you now. Take a deep breath — you're making steady progress.`,
      highlightPhrase: "you're making steady progress",
    };
  }
  // High productivity week
  if (activity.completedDeadlinesLast7Days > 3) {
    return {
      message: `You've wrapped up ${activity.completedDeadlinesLast7Days} tasks this week. That's impressive — you've earned a moment to breathe.`,
      highlightPhrase: "you've earned a moment to breathe",
    };
  }
  // Some progress this week
  if (activity.completedDeadlinesLast7Days > 0) {
    return {
      message: `You're ${activity.completedDeadlinesLast7Days} tasks into the week already. Keep this momentum going — you've got this.`,
      highlightPhrase: "you've got this",
    };
  }
  // Fresh start
  return {
    message: "A new week stretches ahead. Take it one task at a time — every small step counts.",
    highlightPhrase: "every small step counts",
  };
};
