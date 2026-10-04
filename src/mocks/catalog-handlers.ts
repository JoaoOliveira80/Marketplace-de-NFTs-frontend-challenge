import { delay, http, HttpResponse } from "msw";
import { catalogNfts } from "@/features/catalog/catalog-data";
import type { CatalogNft } from "@/features/catalog/catalog-data";
import type { CatalogResponse } from "@/features/catalog/catalog-api";
import { parseCatalogSearch } from "@/features/catalog/catalog-search";

const PAGE_SIZE = 9;

function sortNfts(items: CatalogNft[], tab: string, sort: string) {
  const sorted = [...items];
  if (tab === "new") sorted.sort((a, b) => b.releaseOrder - a.releaseOrder);
  else if (tab === "trending") sorted.sort((a, b) => b.popularity - a.popularity);
  if (sort === "price-asc") sorted.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
  else if (sort === "price-desc") sorted.sort((a, b) => Number(b.priceEth) - Number(a.priceEth));
  return sorted;
}

export const catalogHandlers = [
  http.get("/api/nfts/:nftId", async ({ params }) => {
    await delay(240);
    const nft = catalogNfts.find((item) => item.id === params.nftId);
    return nft
      ? HttpResponse.json(nft)
      : HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
  }),
  http.get("/api/nfts", async ({ request }) => {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const search = parseCatalogSearch(params);
    const latency = search.mock === "slow" ? 1800 : search.mock === "out-of-order" ? (search.q ? 120 : 1300) : 320;
    await delay(latency);

    if (search.mock === "offline") return HttpResponse.error();
    if (search.mock === "error") return HttpResponse.json({ message: "O catálogo está temporariamente indisponível." }, { status: 503 });

    const q = search.q.trim().toLocaleLowerCase("pt-BR");
    const networks = search.network.split(",").filter(Boolean);
    const matches = catalogNfts.filter((nft) =>
      (!q || `${nft.name} #${nft.tokenId}`.toLocaleLowerCase("pt-BR").includes(q)) &&
      (!search.category || nft.category === search.category) &&
      (!networks.length || networks.includes(nft.network)) &&
      Number(nft.priceEth) >= search.minPrice && Number(nft.priceEth) <= search.maxPrice,
    );
    const sorted = sortNfts(matches, search.tab, search.sort);
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const page = Math.min(search.page, pageCount);
    const response: CatalogResponse = {
      items: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: sorted.length,
      page,
      pageSize: PAGE_SIZE,
      pageCount,
      facets: {
        categories: Object.fromEntries([...new Set(catalogNfts.map((nft) => nft.category))].map((category) => [category, catalogNfts.filter((nft) => nft.category === category).length])),
        networks: Object.fromEntries([...new Set(catalogNfts.map((nft) => nft.network))].map((network) => [network, catalogNfts.filter((nft) => nft.network === network).length])),
      },
    };
    return HttpResponse.json(response);
  }),
];
