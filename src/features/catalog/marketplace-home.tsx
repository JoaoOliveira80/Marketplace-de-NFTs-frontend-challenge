import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  Heart,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import {
  catalogCategories,
  catalogNfts,
  featuredNft,
  type CatalogNft,
} from "@/features/catalog/catalog-data";

const PAGE_SIZE = 9;
const networkCounts = [
  { label: "Ethereum", count: 119 },
  { label: "Polygon", count: 78 },
  { label: "Solana", count: 86 },
] as const;

const sortOptions = [
  { value: "recent", label: "Listados recentemente" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
] as const;

const slides = [featuredNft, catalogNfts[1], catalogNfts[2]];

export function MarketplaceHome() {
  const [activeTab, setActiveTab] = useState("Todos os NFTs");
  const [category, setCategory] = useState<string | null>(null);
  const [networks, setNetworks] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(0.02);
  const [maxPrice, setMaxPrice] = useState(12.3);
  const [appliedRange, setAppliedRange] = useState<[number, number]>([0.02, 12.3]);
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("recent");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileFilterCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeSlide = slides[slideIndex];

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearch((event as CustomEvent<string>).detail ?? "");
      setPage(1);
    };
    const handleFilterToggle = () => {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setMobileFiltersOpen((open) => !open);
    };
    const handleSearchFocus = () => {
      setDesktopSearchOpen(true);
      requestAnimationFrame(() => desktopSearchRef.current?.focus());
    };

    window.addEventListener("kurio:catalog-search", handleSearch);
    window.addEventListener("kurio:catalog-filter-toggle", handleFilterToggle);
    window.addEventListener("kurio:catalog-search-focus", handleSearchFocus);

    return () => {
      window.removeEventListener("kurio:catalog-search", handleSearch);
      window.removeEventListener("kurio:catalog-filter-toggle", handleFilterToggle);
      window.removeEventListener("kurio:catalog-search-focus", handleSearchFocus);
    };
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    mobileFilterCloseRef.current?.focus();
    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const drawer = mobileFilterCloseRef.current?.closest("[role='dialog']");
      const focusable = drawer?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.removeEventListener("keydown", handleDrawerKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [mobileFiltersOpen]);

  const visibleNfts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    const filtered = catalogNfts.filter((nft) => {
      const matchesSearch = `${nft.name} #${nft.tokenId}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
      const matchesCategory = !category || nft.category === category;
      const matchesNetwork = networks.length === 0 || networks.includes(nft.network);
      const price = Number(nft.priceEth);
      const matchesPrice = price >= appliedRange[0] && price <= appliedRange[1];

      return matchesSearch && matchesCategory && matchesNetwork && matchesPrice;
    });

    const sorted = [...filtered];
    if (activeTab === "Novos lançamentos") {
      sorted.sort((a, b) => b.releaseOrder - a.releaseOrder);
    } else if (activeTab === "Em alta") {
      sorted.sort((a, b) => b.popularity - a.popularity);
    }

    if (sort === "price-asc") sorted.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
    if (sort === "price-desc") sorted.sort((a, b) => Number(b.priceEth) - Number(a.priceEth));

    return sorted;
  }, [activeTab, appliedRange, category, networks, search, sort]);

  const pageCount = Math.max(1, Math.ceil(visibleNfts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageNfts = visibleNfts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const chooseCategory = (nextCategory: string) => {
    setCategory((current) => (current === nextCategory ? null : nextCategory));
    setPage(1);
  };

  const toggleNetwork = (network: string) => {
    setNetworks((selected) =>
      selected.includes(network)
        ? selected.filter((item) => item !== network)
        : [...selected, network],
    );
    setPage(1);
  };

  const applyPriceRange = () => {
    setAppliedRange([Math.min(minPrice, maxPrice), Math.max(minPrice, maxPrice)]);
    setPage(1);
  };

  return (
    <div className="marketplace-home">
      <section className="marketplace-hero" aria-labelledby="hero-title">
        <div className="marketplace-hero__copy">
          <p className="marketplace-hero__eyebrow">Bem-vindo à Kurio</p>
          <h1 id="hero-title">
            <span className="hero-copy-desktop">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span>
            <span className="hero-copy-mobile">SEJA DONO DA CULTURA DIGITAL</span>
          </h1>
          <p className="marketplace-hero__description hero-copy-desktop">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara,
            apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <p className="marketplace-hero__description hero-copy-mobile">
            Descubra NFTs selecionados de criadores do mundo todo.
          </p>
          <a className="marketplace-hero__cta" href="#catalogo">
            EXPLORAR <ArrowRight aria-hidden="true" className="marketplace-hero__cta-icon" size={18} weight="bold" />
          </a>
        </div>
        <div className="marketplace-hero__art-wrap">
          <img className="marketplace-hero__art" src={activeSlide.image} alt={`${activeSlide.name} #${activeSlide.tokenId}`} />
          <img className="marketplace-hero__secondary-art" src="/nfts/sage-nomad.png" alt="Sage Nomad em destaque" />
          <div className="marketplace-hero__dots" aria-label="Destaques do marketplace">
            {slides.map((slide, index) => (
              <button
                aria-label={`Mostrar ${slide.name}`}
                aria-current={index === slideIndex ? "true" : undefined}
                className={index === slideIndex ? "is-active" : ""}
                key={slide.id}
                onClick={() => setSlideIndex(index)}
                type="button"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="catalog-section" id="catalogo" aria-label="Explorar NFTs">
        <aside className="catalog-sidebar" aria-label="Filtros do catálogo">
          <FilterPanel
            appliedRange={appliedRange}
            category={category}
            maxPrice={maxPrice}
            minPrice={minPrice}
            networks={networks}
            onApplyPrice={applyPriceRange}
            onCategory={chooseCategory}
            onMaxPrice={setMaxPrice}
            onMinPrice={setMinPrice}
            onNetwork={toggleNetwork}
          />
          <FeaturedCollection />
        </aside>

        <div className="catalog-content">
          <div className="catalog-toolbar">
            <div className="catalog-tabs" role="tablist" aria-label="Coleções em destaque">
              {["Todos os NFTs", "Novos lançamentos", "Em alta"].map((tab) => (
                <button
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "is-active" : ""}
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  role="tab"
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
            <label className="catalog-sort">
              <span>Ordenar por:</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={`catalog-search-inline${desktopSearchOpen ? " is-open" : ""}`}>
            <MagnifyingGlass aria-hidden="true" size={18} />
            <input
              aria-label="Buscar NFTs"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar NFTs..."
              ref={desktopSearchRef}
              value={search}
            />
            {search && (
              <button aria-label="Limpar busca" onClick={() => setSearch("")} type="button">
                <X aria-hidden="true" size={16} />
              </button>
            )}
          </div>

          {pageNfts.length > 0 ? (
            <div className="nft-grid">
              {pageNfts.map((nft) => <NftCard key={nft.id} nft={nft} />)}
            </div>
          ) : (
            <div className="catalog-empty">
              <MagnifyingGlass aria-hidden="true" size={28} />
              <h2>Nenhum NFT encontrado</h2>
              <p>Altere a busca ou os filtros para ver outras peças.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategory(null);
                  setNetworks([]);
                  setMinPrice(0.02);
                  setMaxPrice(12.3);
                  setAppliedRange([0.02, 12.3]);
                  setPage(1);
                }}
                type="button"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {pageCount > 1 && (
            <nav className="catalog-pagination" aria-label="Paginação do catálogo">
              <button
                aria-label="Página anterior"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                <CaretLeft aria-hidden="true" size={16} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                  className={currentPage === pageNumber ? "is-active" : ""}
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
              <button
                aria-label="Próxima página"
                disabled={currentPage === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                type="button"
              >
                <CaretRight aria-hidden="true" size={16} />
              </button>
            </nav>
          )}
        </div>
      </section>

      <HomeEditorialSections />

      {mobileFiltersOpen && (
        <div className="mobile-filter-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMobileFiltersOpen(false);
        }}>
          <section aria-label="Filtros do catálogo" aria-modal="true" className="mobile-filter-drawer" role="dialog">
            <div className="mobile-filter-drawer__heading">
              <h2>Filtros</h2>
              <button aria-label="Fechar filtros" onClick={() => setMobileFiltersOpen(false)} ref={mobileFilterCloseRef} type="button">
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <FilterPanel
              appliedRange={appliedRange}
              category={category}
              maxPrice={maxPrice}
              minPrice={minPrice}
              networks={networks}
              onApplyPrice={() => {
                applyPriceRange();
                setMobileFiltersOpen(false);
              }}
              onCategory={chooseCategory}
              onMaxPrice={setMaxPrice}
              onMinPrice={setMinPrice}
              onNetwork={toggleNetwork}
            />
            <button className="mobile-filter-drawer__done" onClick={() => setMobileFiltersOpen(false)} type="button">
              Ver {visibleNfts.length} NFTs
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

interface FilterPanelProps {
  appliedRange: [number, number];
  category: string | null;
  maxPrice: number;
  minPrice: number;
  networks: string[];
  onApplyPrice: () => void;
  onCategory: (category: string) => void;
  onMaxPrice: (value: number) => void;
  onMinPrice: (value: number) => void;
  onNetwork: (network: string) => void;
}

function FilterPanel({
  appliedRange,
  category,
  maxPrice,
  minPrice,
  networks,
  onApplyPrice,
  onCategory,
  onMaxPrice,
  onMinPrice,
  onNetwork,
}: FilterPanelProps) {
  return (
    <div className="catalog-filters">
      <section className="catalog-filter-group">
        <h2>Coleções</h2>
        <ul className="catalog-category-list">
          {catalogCategories.map((item) => (
            <li key={item.label}>
              <button
                aria-pressed={category === item.label}
                className={category === item.label ? "is-active" : ""}
                onClick={() => onCategory(item.label)}
                type="button"
              >
                <span>{item.label}</span><span>({item.count})</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="catalog-filter-group price-filter">
        <h2>Faixa de preço</h2>
        <div className="price-filter__ranges">
          <label>
            <span className="sr-only">Preço mínimo em ETH</span>
            <input aria-label="Preço mínimo em ETH" max="12.3" min="0.02" onChange={(event) => onMinPrice(Number(event.target.value))} step="0.01" type="range" value={minPrice} />
          </label>
          <label>
            <span className="sr-only">Preço máximo em ETH</span>
            <input aria-label="Preço máximo em ETH" max="12.3" min="0.02" onChange={(event) => onMaxPrice(Number(event.target.value))} step="0.01" type="range" value={maxPrice} />
          </label>
        </div>
        <p>Preço: {appliedRange[0].toFixed(2).replace(".", ",")} – {appliedRange[1].toFixed(2).replace(".", ",")} ETH</p>
        <button className="filter-apply" onClick={onApplyPrice} type="button">Aplicar</button>
      </section>

      <section className="catalog-filter-group network-filter">
        <h2>Rede</h2>
        <ul>
          {networkCounts.map((network) => (
            <li key={network.label}>
              <button
                aria-pressed={networks.includes(network.label)}
                className={networks.includes(network.label) ? "is-active" : ""}
                onClick={() => onNetwork(network.label)}
                type="button"
              >
                <span>{network.label}</span><span>({network.count})</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FeaturedCollection() {
  return (
    <article className="featured-collection">
      <h2>NFT EM DESTAQUE</h2>
      <p>OFERTA LIMITADA</p>
      <img src="/nfts/sage-nomad.png" alt="Sage Nomad com chapéu e moletom violeta" />
    </article>
  );
}

function NftCard({ nft }: { nft: CatalogNft }) {
  return (
    <article className="nft-card">
      <div className="nft-card__image-wrap">
        <img className="nft-card__image" src={nft.image} alt={`${nft.name} #${nft.tokenId}`} loading="lazy" />
        {nft.id === featuredNft.id && <span className="nft-card__favorite-mark" aria-hidden="true"><Heart size={16} weight="regular" /></span>}
        {nft.isRare && <span className="nft-card__badge">RARO</span>}
      </div>
      <h2>{nft.name} <span>#{nft.tokenId}</span></h2>
      <p className="nft-card__price">
        <strong>{nft.priceEth} ETH</strong>
        {nft.previousPriceEth && <del>{nft.previousPriceEth} ETH</del>}
      </p>
    </article>
  );
}

function HomeEditorialSections() {
  const articles = [
    { image: "/nfts/ivory-baron.png", date: "12 de setembro", time: "Leitura de 6 min", title: "Como funciona a propriedade de NFTs", text: "Aprenda a colecionar, negociar e verificar ativos digitais." },
    { image: "/nfts/emerald-ape.png", date: "13 de setembro", time: "Leitura de 2 min", title: "10 artistas digitais para acompanhar", text: "Conheça criadores que moldam a cultura digital." },
    { image: "/nfts/sage-nomad.png", date: "15 de setembro", time: "Leitura de 3 min", title: "Raridade, atributos e procedência", text: "Entenda raridade, procedência e direitos autorais." },
    { image: "/nfts/golden-beat.png", date: "15 de setembro", time: "Leitura de 2 min", title: "Como proteger sua carteira", text: "Proteja sua carteira, seus ativos e sua identidade." },
  ];

  return (
    <div className="home-editorial">
      <section className="home-promos" aria-label="Destaques Kurio">
        <article className="home-promo">
          <img src="/nfts/emerald-ape.png" alt="Emerald Ape usando óculos e jaqueta verde" loading="lazy" />
          <div>
            <h2>Lançamentos gênesis de edição limitada</h2>
            <p>Colecione edições escassas diretamente dos criadores antes da revelação pública.</p>
            <a href="#catalogo">Explorar <ArrowRight aria-hidden="true" size={14} /></a>
          </div>
        </article>
        <article className="home-promo home-promo--reverse">
          <img src="/nfts/ivory-baron.png" alt="Ivory Baron, arte digital da coleção Kurio" loading="lazy" />
          <div>
            <h2>Arte digital selecionada e muito mais</h2>
            <p>Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.</p>
            <a href="#catalogo">Explorar <ArrowRight aria-hidden="true" size={14} /></a>
          </div>
        </article>
      </section>

      <section className="home-journal" aria-labelledby="journal-title">
        <h2 id="journal-title">Diário da Cunhagem</h2>
        <p>Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <div className="home-journal__grid">
          {articles.map((article) => (
            <article className="journal-card" key={article.title}>
              <img src={article.image} alt="" loading="lazy" />
              <div className="journal-card__body">
                <p className="journal-card__meta">{article.date}&nbsp; | &nbsp;{article.time}</p>
                <h3>{article.title}</h3>
                <p>{article.text}</p>
                <span>Ler mais →</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
