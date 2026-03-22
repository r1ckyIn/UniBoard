import { Suspense } from "react";
import { SetupGuard } from "@/components/setup/SetupGuard";
import SetupPage from "@/components/setup/SetupPage";

export default function SetupPageRoute() {
  return (
    <SetupGuard>
      <Suspense>
        <SetupPage />
      </Suspense>
    </SetupGuard>
  );
}
