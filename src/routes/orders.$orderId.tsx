import { createFileRoute, redirect } from "@tanstack/react-router";
import { isAxiosError } from "axios";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { OrderPage } from "@/features/orders/order-page";

export const Route = createFileRoute("/orders/$orderId")({
  beforeLoad: async ({ context, location }) => {
    try {
      const session = await context.queryClient.fetchQuery({ ...sessionQueryOptions, staleTime: 0 });
      if (!session.user) throw redirect({ to: "/login", search: { returnTo: location.href, expired: false } });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) throw redirect({ to: "/login", search: { returnTo: location.href, expired: true } });
      throw error;
    }
  },
  component: OrderRoute,
});

function OrderRoute() {
  const { orderId } = Route.useParams();
  return <OrderPage orderId={orderId} />;
}
