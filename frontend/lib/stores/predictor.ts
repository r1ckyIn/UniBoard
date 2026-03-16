import { create } from "zustand";

interface ScoreOverride {
  assessment_id: string;
  hypothetical_score: number;
}

interface PredictorStore {
  // Per-assessment hypothetical scores
  overrides: Record<string, number>; // assessment_id -> score (0-100)
  setScore: (assessmentId: string, score: number) => void;
  clearScores: () => void;

  // Scenario management
  scenarioName: string;
  setScenarioName: (name: string) => void;

  // Load a saved scenario into the store
  loadScenario: (name: string, scores: ScoreOverride[]) => void;

  // Computed helper: convert overrides map to API-compatible array
  getOverridesAsArray: () => ScoreOverride[];
}

export const usePredictorStore = create<PredictorStore>((set, get) => ({
  overrides: {},

  setScore: (assessmentId, score) =>
    set((state) => ({
      overrides: { ...state.overrides, [assessmentId]: score },
    })),

  clearScores: () => set({ overrides: {}, scenarioName: "" }),

  scenarioName: "",
  setScenarioName: (name) => set({ scenarioName: name }),

  loadScenario: (name, scores) => {
    const overrides: Record<string, number> = {};
    for (const s of scores) {
      overrides[s.assessment_id] = s.hypothetical_score;
    }
    set({ scenarioName: name, overrides });
  },

  getOverridesAsArray: () =>
    Object.entries(get().overrides).map(([assessment_id, hypothetical_score]) => ({
      assessment_id,
      hypothetical_score,
    })),
}));
