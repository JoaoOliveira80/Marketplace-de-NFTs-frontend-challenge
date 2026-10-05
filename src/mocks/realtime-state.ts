import { catalogNfts, type CatalogNft } from "@/features/catalog/catalog-data";
import { ethUnits } from "@/features/cart/eth";
import type { NftEdition } from "@/features/nft-detail/nft-detail-data";
import type { NftUpdatedEvent } from "@/features/realtime/realtime-types";

const KEY = "kurio-realtime-nfts";
type EditionOverride = Pick<NftEdition, "priceEth" | "available"> & { version: number };
type Overrides = Record<string, Record<string, EditionOverride>>;

function read(): Overrides {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Overrides; }
  catch { return {}; }
}

export function editionOverride(nftId: string, editionId: string): EditionOverride | undefined {
  return read()[nftId]?.[editionId];
}

export function currentCatalogNft(nft: CatalogNft): CatalogNft {
  const editionId = nft.id === "emerald-ape-0042" ? "fifty" : "default";
  const override = editionOverride(nft.id, editionId);
  return override ? { ...nft, priceEth: override.priceEth, available: override.available, version: override.version } : { ...nft, version: 0 };
}

export function currentCatalog(): CatalogNft[] { return catalogNfts.map(currentCatalogNft); }

export function resetRealtimeNfts() {
  localStorage.removeItem(KEY);
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("kurio-realtime-price-") || key.startsWith("kurio-realtime-sold-out-")) localStorage.removeItem(key);
  }
}

export function updateEdition(nftId: string, editionId: string, priceEth: string, available: number): NftUpdatedEvent | null {
  const nft = catalogNfts.find((item) => item.id === nftId);
  const validEdition = nft?.id === "emerald-ape-0042" ? ["unique", "ten", "fifty", "open"].includes(editionId) : editionId === "default";
  if (!nft || !validEdition || !/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(priceEth) || !Number.isSafeInteger(available) || available < 0) return null;
  try { ethUnits(priceEth); } catch { return null; }
  const state = read();
  const version = (state[nftId]?.[editionId]?.version ?? 0) + 1;
  state[nftId] = { ...state[nftId], [editionId]: { priceEth, available, version } };
  localStorage.setItem(KEY, JSON.stringify(state));
  return { eventId: crypto.randomUUID(), nftId, editionId, priceEth, available, version };
}
