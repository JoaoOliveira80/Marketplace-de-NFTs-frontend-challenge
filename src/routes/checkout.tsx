import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { CheckoutPage } from "@/features/checkout/checkout-page";

export const Route = createFileRoute("/checkout")({
  beforeLoad: async ({ context, location }) => {
    try {
      const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 });
      if (!session.user) throw redirect({ to: "/login", search: { returnTo: location.href, expired: false } });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) throw redirect({ to: "/login", search: { returnTo: location.href, expired: true } });
      throw error;
    }
  },
  component: CheckoutPage,
  errorComponent: () => <section className="checkout-page"><h1>Não foi possível verificar sua sessão</h1><p>Verifique a conexão e tente novamente.</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section>,
});
