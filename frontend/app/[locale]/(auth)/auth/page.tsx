import { Suspense } from "react";
import AuthPage from "@/components/auth/AuthPage";

export default function AuthPageRoute() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}
