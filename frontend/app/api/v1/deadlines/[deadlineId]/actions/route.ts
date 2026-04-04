import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { deadlineActions } from "@/app/api/v1/deadlines/route";

/**
 * POST /api/v1/deadlines/[deadlineId]/actions
 * Create a deadline user action (pin or delete).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;
  await mockDelay();

  const { deadlineId } = await params;
  const body = await request.json();
  const action = body.action as string;

  const actionType =
    action === "pin" ? "pinned" : action === "delete" ? "deleted" : null;
  if (!actionType) {
    return mockError("VALIDATION_ERROR", `Invalid action: ${action}`, 400);
  }

  deadlineActions.get(actionType)!.add(deadlineId);

  return mockResponse({
    id: `action_${deadlineId}_${actionType}`,
    deadline_id: deadlineId,
    action_type: actionType,
    created_at: new Date().toISOString(),
  });
}
