import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { MarketplaceHome } from "@/features/catalog/marketplace-home";
import { defaultCatalogSearch, validateCatalogSearch } from "@/features/catalog/catalog-search";

export const Route = createFileRoute("/")({
  validateSearch: validateCatalogSearch,
  search: { middlewares: [stripSearchParams(defaultCatalogSearch)] },
  component: MarketplaceHome,
});
