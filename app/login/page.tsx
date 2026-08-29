import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";

// The screen reads ?error= from the auth callback, and Next needs a boundary
// around anything that reads the query string or the whole page refuses to
// build as static.
export default function LoginPage() {
  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  );
}
