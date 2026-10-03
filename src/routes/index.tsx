import { createFileRoute } from "@tanstack/react-router";
import { MarketplaceHome } from "@/features/catalog/marketplace-home";

export const Route = createFileRoute("/")({
  component: MarketplaceHome,
});
