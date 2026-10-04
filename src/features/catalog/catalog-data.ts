export interface CatalogNft {
  id: string;
  name: string;
  tokenId: string;
  priceEth: string;
  image: string;
  network: "Ethereum" | "Polygon" | "Solana";
  category: string;
  edition: string;
  isRare?: boolean;
  previousPriceEth?: string;
  releaseOrder: number;
  popularity: number;
}

const featuredNfts: CatalogNft[] = [
  {
    id: "emerald-ape-0042",
    name: "Emerald Ape",
    tokenId: "042",
    priceEth: "1.19",
    image: "/nfts/emerald-ape.png",
    network: "Ethereum",
    category: "Arte digital",
    edition: "1/50",
    releaseOrder: 9,
    popularity: 94,
  },
  {
    id: "sage-nomad-0009",
    name: "Sage Nomad",
    tokenId: "009",
    priceEth: "1.69",
    image: "/nfts/sage-nomad.png",
    network: "Polygon",
    category: "Arte digital",
    edition: "1/1",
    releaseOrder: 8,
    popularity: 82,
  },
  {
    id: "neon-vessel-0552",
    name: "Neon Vessel",
    tokenId: "552",
    priceEth: "1.99",
    image: "/nfts/ivory-baron.png",
    network: "Ethereum",
    category: "Arte 3D",
    edition: "1/10",
    isRare: true,
    previousPriceEth: "2.29",
    releaseOrder: 7,
    popularity: 99,
  },
  {
    id: "cosmic-bloom-0118",
    name: "Cosmic Bloom",
    tokenId: "118",
    priceEth: "1.29",
    image: "/nfts/sage-nomad.png",
    network: "Polygon",
    category: "Colecionáveis",
    edition: "1/25",
    releaseOrder: 6,
    popularity: 77,
  },
  {
    id: "violet-nomad-0314",
    name: "Violet Nomad",
    tokenId: "314",
    priceEth: "1.39",
    image: "/nfts/sage-nomad.png",
    network: "Solana",
    category: "Arte digital",
    edition: "1/1",
    releaseOrder: 5,
    popularity: 91,
  },
  {
    id: "ivory-baron-0088",
    name: "Ivory Baron",
    tokenId: "088",
    priceEth: "1.79",
    image: "/nfts/ivory-baron.png",
    network: "Ethereum",
    category: "Arte digital",
    edition: "1/10",
    isRare: true,
    releaseOrder: 4,
    popularity: 80,
  },
  {
    id: "golden-beat-0207",
    name: "Golden Beat",
    tokenId: "207",
    priceEth: "0.99",
    image: "/nfts/golden-beat.png",
    network: "Polygon",
    category: "Música",
    edition: "1/50",
    releaseOrder: 3,
    popularity: 75,
  },
  {
    id: "golden-frequency-0071",
    name: "Golden Frequency",
    tokenId: "071",
    priceEth: "0.59",
    image: "/nfts/sage-nomad.png",
    network: "Solana",
    category: "Música",
    edition: "1/50",
    releaseOrder: 2,
    popularity: 67,
  },
  {
    id: "golden-signal-0160",
    name: "Golden Signal",
    tokenId: "160",
    priceEth: "0.39",
    image: "/nfts/golden-beat.png",
    network: "Ethereum",
    category: "Música",
    edition: "1/100",
    releaseOrder: 1,
    popularity: 60,
  },
];

const nextPageNfts: CatalogNft[] = [
  ["amber-orbit", "Amber Orbit", "0264", "0.89", "/nfts/golden-beat.png", "Arte digital", "Polygon"],
  ["moss-keeper", "Moss Keeper", "0182", "1.09", "/nfts/sage-nomad.png", "Colecionáveis", "Ethereum"],
  ["night-porter", "Night Porter", "0327", "1.49", "/nfts/ivory-baron.png", "Arte 3D", "Solana"],
  ["copper-dream", "Copper Dream", "0201", "0.79", "/nfts/golden-beat.png", "Arte digital", "Polygon"],
  ["quiet-grove", "Quiet Grove", "0116", "1.29", "/nfts/sage-nomad.png", "Fotografia", "Ethereum"],
  ["velvet-echo", "Velvet Echo", "0408", "0.69", "/nfts/sage-nomad.png", "Música", "Solana"],
  ["cobalt-king", "Cobalt King", "0229", "1.89", "/nfts/ivory-baron.png", "Arte 3D", "Ethereum"],
  ["sunlit-frequency", "Sunlit Frequency", "0154", "0.49", "/nfts/golden-beat.png", "Música", "Polygon"],
  ["old-growth", "Old Growth", "0303", "1.59", "/nfts/sage-nomad.png", "Colecionáveis", "Solana"],
  ["jade-collector", "Jade Collector", "0412", "1.09", "/nfts/emerald-ape.png", "Arte digital", "Ethereum"],
  ["soft-focus", "Soft Focus", "0081", "0.99", "/nfts/sage-nomad.png", "Fotografia", "Polygon"],
  ["golden-hour", "Golden Hour", "0193", "0.79", "/nfts/golden-beat.png", "Arte digital", "Solana"],
  ["deep-canopy", "Deep Canopy", "0250", "1.39", "/nfts/ivory-baron.png", "Arte 3D", "Ethereum"],
  ["violet-current", "Violet Current", "0331", "0.59", "/nfts/sage-nomad.png", "Música", "Polygon"],
  ["amber-resonance", "Amber Resonance", "0218", "0.89", "/nfts/golden-beat.png", "Música", "Solana"],
  ["emerald-study", "Emerald Study", "0477", "1.79", "/nfts/emerald-ape.png", "Colecionáveis", "Ethereum"],
  ["still-water", "Still Water", "0138", "0.69", "/nfts/sage-nomad.png", "Fotografia", "Polygon"],
  ["stone-guardian", "Stone Guardian", "0064", "1.29", "/nfts/ivory-baron.png", "Arte 3D", "Solana"],
  ["fractal-garden", "Fractal Garden", "0501", "1.69", "/nfts/emerald-ape.png", "Generativa", "Ethereum"],
  ["pixel-quest", "Pixel Quest", "0502", "0.49", "/nfts/golden-beat.png", "Jogos", "Polygon"],
  ["studio-pass", "Studio Pass", "0503", "0.39", "/nfts/sage-nomad.png", "Assinaturas", "Solana"],
  ["kurio-key", "Kurio Key", "0504", "0.29", "/nfts/ivory-baron.png", "Utilidade", "Ethereum"],
].map(([id, name, tokenId, priceEth, image, category, network], index) => ({
  id,
  name,
  tokenId,
  priceEth,
  image,
  category,
  network: network as CatalogNft["network"],
  edition: index % 3 === 0 ? "1/10" : "1/50",
  releaseOrder: -index - 1,
  popularity: 55 + ((index * 13) % 40),
}));

export const catalogNfts = [...featuredNfts, ...nextPageNfts];

export const catalogCategories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];

export const featuredNft = featuredNfts[0];
