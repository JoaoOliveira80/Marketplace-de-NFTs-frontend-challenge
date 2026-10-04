import type { CatalogNft } from "@/features/catalog/catalog-data";
import type { NftEdition } from "@/features/nft-detail/nft-detail-data";

export function nftEditions(nft: CatalogNft): NftEdition[] {
  if (nft.id === "emerald-ape-0042") return [
    { id: "unique", label: "1/1", priceEth: "3.99", available: 0 },
    { id: "ten", label: "1/10", priceEth: "1.89", available: 3 },
    { id: "fifty", label: "1/50", priceEth: nft.priceEth, available: 8 },
    { id: "open", label: "ABERTA", priceEth: "0.89", available: 100 },
  ];
  return [{ id: "default", label: nft.edition, priceEth: nft.priceEth, available: nft.id === "violet-nomad-0314" ? 1 : 6 }];
}
