"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type {
  WhatIfScenarioResponse,
  WhatIfCreateRequest,
  TargetPathResponse,
  TargetRequest,
} from "../api/types";

/**
 * Fetch all saved What-if scenarios for the current user.
 */
export function useWhatIfScenarios() {
  return useQuery({
    queryKey: ["what-if"],
    queryFn: () =>
      unwrap<WhatIfScenarioResponse[]>(api.get(ENDPOINTS.gpa.whatIf)),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Save a new What-if scenario to the backend.
 * Invalidates the scenario list on success.
 */
export function useSaveWhatIf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WhatIfCreateRequest) =>
      unwrap<WhatIfScenarioResponse>(
        api.post(ENDPOINTS.gpa.whatIf, { json: data })
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["what-if"] }),
  });
}

/**
 * Calculate the target path: minimum required scores per assessment
 * to achieve a given WAM target.
 */
export function useTargetPath() {
  return useMutation({
    mutationFn: (data: TargetRequest) =>
      unwrap<TargetPathResponse>(
        api.post(ENDPOINTS.gpa.target, { json: data })
      ),
  });
}
