import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth/auth-page";
import { authSearch } from "@/features/auth/auth-search";

export const Route = createFileRoute("/login")({
  validateSearch: authSearch,
  component: LoginPage,
});

function LoginPage() {
  const { returnTo, expired } = Route.useSearch();
  return <AuthPage mode="login" returnTo={returnTo} expired={expired} />;
}
