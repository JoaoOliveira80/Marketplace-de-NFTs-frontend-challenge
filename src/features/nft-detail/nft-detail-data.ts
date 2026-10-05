import type { CatalogNft } from "@/features/catalog/catalog-data";

export interface NftEdition {
  id: string;
  label: string;
  priceEth: string;
  available: number;
  version?: number;
}

export interface NftDetail extends CatalogNft {
  description: string;
  gallery: { image: string; alt: string; cropScale: number; cropOrigin: string }[];
  editions: NftEdition[];
  collection: string;
  attributes: string[];
  rating: string;
  reviewCount: number;
  related: CatalogNft[];
  details: string[];
  reviews: { author: string; text: string; rating: number }[];
}

export function multiplyEth(amount: string, quantity: number) {
  const [whole, fraction = ""] = amount.split(".");
  const scale = 10n ** BigInt(fraction.length);
  const result = (BigInt(whole) * scale + BigInt(fraction || "0")) * BigInt(quantity);
  const integer = result / scale;
  const decimal = (result % scale).toString().padStart(fraction.length, "0");
  return fraction.length ? `${integer}.${decimal}` : integer.toString();
}
