import { NextRequest } from "next/server";
import { mockResponse, mockDelay, requireAuth } from "@/lib/fixtures/helpers";
import { deadlineActions } from "@/app/api/v1/deadlines/route";

/**
 * DELETE /api/v1/deadlines/[deadlineId]/actions/[action]
 * Remove a deadline user action (unpin or undelete).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string; action: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;
  await mockDelay();

  const { deadlineId, action } = await params;
  const actionType =
    action === "pin" ? "pinned" : action === "delete" ? "deleted" : action;
  const actionSet = deadlineActions.get(actionType);
  if (actionSet) actionSet.delete(deadlineId);

  return mockResponse(null);
}
