import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type GpaReportResponse =
  paths["/gpa"]["get"]["responses"]["200"]["content"]["application/json"];
type GpaPredictResponse =
  paths["/gpa/predict"]["post"]["responses"]["200"]["content"]["application/json"];
type GpaPathResponse =
  paths["/gpa/path"]["post"]["responses"]["200"]["content"]["application/json"];

// ── Request body type aliases ───────────────────────────────────────────────
type PredictBody =
  paths["/gpa/predict"]["post"]["requestBody"]["content"]["application/json"];
type PathBody =
  paths["/gpa/path"]["post"]["requestBody"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const gpaKeys = {
  all: ["gpa"] as const,
  report: () => [...gpaKeys.all, "report"] as const,
  predict: (scores: PredictBody["what_if_scores"]) =>
    [...gpaKeys.all, "predict", scores] as const,
  path: (target: number) => [...gpaKeys.all, "path", target] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const gpaOptions = {
  report: () =>
    queryOptions({
      queryKey: gpaKeys.report(),
      queryFn: () => api.get("gpa").json<GpaReportResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useGpaReport() {
  return useQuery(gpaOptions.report());
}

export function useGpaPredict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PredictBody) =>
      api.post("gpa/predict", { json: body }).json<GpaPredictResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpaKeys.all });
    },
  });
}

export function useGpaPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PathBody) =>
      api.post("gpa/path", { json: body }).json<GpaPathResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpaKeys.all });
    },
  });
}
