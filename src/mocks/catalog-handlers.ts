import { delay, http, HttpResponse } from "msw";
import { catalogNfts } from "@/features/catalog/catalog-data";
import type { CatalogNft } from "@/features/catalog/catalog-data";
import type { CatalogResponse } from "@/features/catalog/catalog-api";
import { parseCatalogSearch } from "@/features/catalog/catalog-search";
import type { NftDetail } from "@/features/nft-detail/nft-detail-data";
import { nftEditions } from "./nft-inventory";
import { currentCatalog } from "./realtime-state";

const PAGE_SIZE = 9;
let retryOnceFailuresRemaining = 2;

export function resetCatalogScenarios() {
  retryOnceFailuresRemaining = 2;
}

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
    const nft = currentCatalog().find((item) => item.id === params.nftId);
    if (!nft) return HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
    const emerald = nft.id === "emerald-ape-0042";
    const related = emerald
      ? ["cosmic-bloom-0118", "violet-nomad-0314", "ivory-baron-0088", "golden-beat-0207", "golden-signal-0160"]
          .map((id) => currentCatalog().find((item) => item.id === id))
          .filter((item): item is CatalogNft => Boolean(item))
      : currentCatalog().filter((item) => item.id !== nft.id && item.category === nft.category).slice(0, 5);
    const detail: NftDetail = {
      ...nft,
      description: emerald
        ? "Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na Ethereum."
        : `Um colecionável digital da coleção Kurio Editions, verificado na rede ${nft.network}.`,
      gallery: [
        { image: nft.image, alt: `Visão completa de ${nft.name} #${nft.tokenId}`, cropScale: 1, cropOrigin: "50% 50%" },
        { image: nft.image, alt: `Detalhe superior de ${nft.name} #${nft.tokenId}`, cropScale: 1.7, cropOrigin: "50% 25%" },
        { image: nft.image, alt: `Detalhe inferior de ${nft.name} #${nft.tokenId}`, cropScale: 1.7, cropOrigin: "50% 80%" },
        { image: nft.image, alt: `Visão aproximada de ${nft.name} #${nft.tokenId}`, cropScale: 1.25, cropOrigin: "68% 48%" },
      ],
      editions: nftEditions(nft),
      collection: "Kurio Apes",
      attributes: emerald ? ["Óculos", "Esmeralda", "Raro"] : [nft.category, nft.network],
      rating: "4.8",
      reviewCount: emerald ? 19 : 8,
      related,
      details: [
        `${nft.name} #${nft.tokenId} é uma obra digital ${nft.edition} finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${nft.network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
        "A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrado na rede.",
      ],
      reviews: [
        { author: "Marina A.", text: "Arte e detalhes incríveis. Uma peça especial na coleção.", rating: 5 },
        { author: "João P.", text: "A apresentação da obra e sua procedência ficaram muito claras.", rating: 5 },
      ],
    };
    return HttpResponse.json(detail);
  }),
  http.get("/api/nfts", async ({ request }) => {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const search = parseCatalogSearch(params);
    const latency = search.mock === "slow" ? 1800 : search.mock === "out-of-order" ? (search.q ? 120 : 1300) : 320;
    await delay(latency);

    if (search.mock === "offline") return HttpResponse.error();
    if (search.mock === "error") return HttpResponse.json({ message: "O catálogo está temporariamente indisponível." }, { status: 503 });
    if (search.mock === "retry-once" && retryOnceFailuresRemaining > 0) {
      retryOnceFailuresRemaining -= 1;
      return HttpResponse.json({ message: "O catálogo está temporariamente indisponível." }, { status: 503 });
    }

    const q = search.q.trim().toLocaleLowerCase("pt-BR");
    const networks = search.network.split(",").filter(Boolean);
    const matches = currentCatalog().filter((nft) =>
      (!q || `${nft.name} #${nft.tokenId}`.toLocaleLowerCase("pt-BR").includes(q)) &&
      (!search.category || nft.category === search.category) &&
      (!networks.length || networks.includes(nft.network)) &&
      Number(nft.priceEth) >= search.minPrice && Number(nft.priceEth) <= search.maxPrice,
    );
    const sorted = search.mock === "empty" ? [] : sortNfts(matches, search.tab, search.sort);
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
