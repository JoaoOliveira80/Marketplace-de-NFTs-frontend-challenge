import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/features/auth/auth-page";
import { authSearch } from "@/features/auth/auth-search";

export const Route = createFileRoute("/register")({
  validateSearch: authSearch,
  component: RegisterPage,
});

function RegisterPage() {
  const { returnTo } = Route.useSearch();
  return <AuthPage mode="register" returnTo={returnTo} expired={false} />;
}
