import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import AuthPage from "@/components/auth/AuthPage";

export default function AuthPageRoute() {
  return (
    <AuthGuard>
      <Suspense>
        <AuthPage />
      </Suspense>
    </AuthGuard>
  );
}
