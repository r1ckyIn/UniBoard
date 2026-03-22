import { Suspense } from "react";
import { SetupGuard } from "@/components/setup/SetupGuard";

export default function SetupPageRoute() {
  return (
    <SetupGuard>
      <Suspense>
        <div
          data-testid="setup-page"
          className="flex items-center justify-center min-h-screen"
        >
          <p>Setup Page</p>
        </div>
      </Suspense>
    </SetupGuard>
  );
}
