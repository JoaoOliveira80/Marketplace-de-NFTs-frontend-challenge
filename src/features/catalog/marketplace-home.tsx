import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
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
import { catalogQueryOptions } from "@/features/catalog/catalog-api";
import type { CatalogSearch, CatalogTab } from "@/features/catalog/catalog-search";

const networkLabels = ["Ethereum", "Polygon", "Solana"] as const;

const sortOptions = [
  { value: "recent", label: "Listados recentemente" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
] as const;

const slides = [featuredNft, catalogNfts[1], catalogNfts[2]];

export function MarketplaceHome() {
  const filters = useSearch({ from: "/" });
  const navigate = useNavigate({ from: "/" });
  const { data, isPending, isError, isFetching, refetch } = useQuery(catalogQueryOptions(filters));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileFilterCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeSlide = slides[slideIndex];
  const networks = filters.network.split(",").filter(Boolean);
  const appliedRange: [number, number] = [filters.minPrice, filters.maxPrice];
  const tabs: { label: string; value: CatalogTab }[] = [
    { label: "Todos os NFTs", value: "all" },
    { label: "Novos lançamentos", value: "new" },
    { label: "Em alta", value: "trending" },
  ];

  const updateFilters = (patch: Partial<CatalogSearch>) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), resetScroll: false });
  };

  useEffect(() => {
    if (data && data.page !== filters.page) {
      void navigate({ search: (previous) => ({ ...previous, page: data.page }), replace: true, resetScroll: false });
    }
  }, [data, filters.page, navigate]);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      updateFilters({ q: (event as CustomEvent<string>).detail ?? "", page: 1 });
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
  });

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

  const pageCount = data?.pageCount ?? 1;
  const currentPage = data?.page ?? filters.page;
  const pageNfts = data?.items ?? [];

  const chooseCategory = (nextCategory: string) => {
    updateFilters({ category: filters.category === nextCategory ? "" : nextCategory, page: 1 });
  };

  const toggleNetwork = (network: string) => {
    const next = networks.includes(network) ? networks.filter((item) => item !== network) : [...networks, network];
    updateFilters({ network: next.join(","), page: 1 });
  };

  const applyPriceRange = (minPrice: number, maxPrice: number) => {
    updateFilters({ minPrice: Math.min(minPrice, maxPrice), maxPrice: Math.max(minPrice, maxPrice), page: 1 });
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
            key={`desktop-${filters.minPrice}-${filters.maxPrice}`}
            appliedRange={appliedRange}
            category={filters.category || null}
            facetCounts={data?.facets}
            networks={networks}
            onApplyPrice={applyPriceRange}
            onCategory={chooseCategory}
            onNetwork={toggleNetwork}
          />
          <FeaturedCollection />
        </aside>

        <div className="catalog-content">
          <div className="catalog-toolbar">
            <div className="catalog-tabs" role="tablist" aria-label="Coleções em destaque">
              {tabs.map((tab) => (
                <button
                  aria-selected={filters.tab === tab.value}
                  className={filters.tab === tab.value ? "is-active" : ""}
                  key={tab.value}
                  onClick={() => updateFilters({ tab: tab.value, page: 1 })}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <label className="catalog-sort">
              <span>Ordenar por:</span>
              <select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value as CatalogSearch["sort"], page: 1 })}>
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
                updateFilters({ q: event.target.value, page: 1 });
              }}
              placeholder="Buscar NFTs..."
              ref={desktopSearchRef}
              value={filters.q}
            />
            {filters.q && (
              <button aria-label="Limpar busca" onClick={() => updateFilters({ q: "", page: 1 })} type="button">
                <X aria-hidden="true" size={16} />
              </button>
            )}
          </div>

          {isError && data && (
            <div className="catalog-update-error" role="status">
              <span>Não foi possível atualizar o catálogo. Os NFTs exibidos são os últimos carregados.</span>
              <button onClick={() => void refetch()} type="button">Tentar novamente</button>
            </div>
          )}

          {!data && isPending ? (
            <div className="nft-grid" aria-label="Carregando NFTs" aria-busy="true">
              {Array.from({ length: 9 }, (_, index) => <CatalogSkeleton key={index} />)}
            </div>
          ) : !data && isError ? (
            <div className="catalog-empty" role="alert">
              <MagnifyingGlass aria-hidden="true" size={28} />
              <h2>Não foi possível carregar os NFTs</h2>
              <p>Verifique a conexão e tente novamente.</p>
              <button onClick={() => void refetch()} type="button">Tentar novamente</button>
            </div>
          ) : pageNfts.length > 0 ? (
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
                  updateFilters({ q: "", category: "", network: "", minPrice: 0.02, maxPrice: 12.3, page: 1 });
                }}
                type="button"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {isFetching && !isPending && <p className="catalog-refresh" role="status">Atualizando catálogo…</p>}

          {!isPending && !isError && pageCount > 1 && (
            <nav className="catalog-pagination" aria-label="Paginação do catálogo">
              <button
                aria-label="Página anterior"
                disabled={currentPage === 1}
                onClick={() => updateFilters({ page: Math.max(1, currentPage - 1) })}
                type="button"
              >
                <CaretLeft aria-hidden="true" size={16} />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  aria-current={currentPage === pageNumber ? "page" : undefined}
                  className={currentPage === pageNumber ? "is-active" : ""}
                  key={pageNumber}
                  onClick={() => updateFilters({ page: pageNumber })}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
              <button
                aria-label="Próxima página"
                disabled={currentPage === pageCount}
                onClick={() => updateFilters({ page: Math.min(pageCount, currentPage + 1) })}
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
              key={`mobile-${filters.minPrice}-${filters.maxPrice}`}
              appliedRange={appliedRange}
              category={filters.category || null}
              facetCounts={data?.facets}
              networks={networks}
              onApplyPrice={(min, max) => {
                applyPriceRange(min, max);
                setMobileFiltersOpen(false);
              }}
              onCategory={chooseCategory}
              onNetwork={toggleNetwork}
            />
            <button className="mobile-filter-drawer__done" onClick={() => setMobileFiltersOpen(false)} type="button">
              Ver {data?.total ?? 0} NFTs
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
  facetCounts?: { categories: Record<string, number>; networks: Record<string, number> };
  networks: string[];
  onApplyPrice: (minPrice: number, maxPrice: number) => void;
  onCategory: (category: string) => void;
  onNetwork: (network: string) => void;
}

function FilterPanel({
  appliedRange,
  category,
  facetCounts,
  networks,
  onApplyPrice,
  onCategory,
  onNetwork,
}: FilterPanelProps) {
  const [minPrice, setMinPrice] = useState(appliedRange[0]);
  const [maxPrice, setMaxPrice] = useState(appliedRange[1]);
  return (
    <div className="catalog-filters">
      <section className="catalog-filter-group">
        <h2>Coleções</h2>
        <ul className="catalog-category-list">
          {catalogCategories.map((categoryName) => (
            <li key={categoryName}>
              <button
                aria-pressed={category === categoryName}
                className={category === categoryName ? "is-active" : ""}
                onClick={() => onCategory(categoryName)}
                type="button"
              >
                <span>{categoryName}</span><span>({facetCounts?.categories[categoryName] ?? "…"})</span>
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
            <input aria-label="Preço mínimo em ETH" max="12.3" min="0.02" onChange={(event) => setMinPrice(Number(event.target.value))} step="0.01" type="range" value={minPrice} />
          </label>
          <label>
            <span className="sr-only">Preço máximo em ETH</span>
            <input aria-label="Preço máximo em ETH" max="12.3" min="0.02" onChange={(event) => setMaxPrice(Number(event.target.value))} step="0.01" type="range" value={maxPrice} />
          </label>
        </div>
        <p>Preço: {appliedRange[0].toFixed(2).replace(".", ",")} – {appliedRange[1].toFixed(2).replace(".", ",")} ETH</p>
        <button className="filter-apply" onClick={() => onApplyPrice(minPrice, maxPrice)} type="button">Aplicar</button>
      </section>

      <section className="catalog-filter-group network-filter">
        <h2>Rede</h2>
        <ul>
          {networkLabels.map((network) => (
            <li key={network}>
              <button
                aria-pressed={networks.includes(network)}
                className={networks.includes(network) ? "is-active" : ""}
                onClick={() => onNetwork(network)}
                type="button"
              >
                <span>{network}</span><span>({facetCounts?.networks[network] ?? "…"})</span>
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
      <Link aria-label={`Ver detalhes de ${nft.name} #${nft.tokenId}`} className="nft-card__link" params={{ nftId: nft.id }} to="/nft/$nftId">
        <div className="nft-card__image-wrap">
          <img className="nft-card__image" src={nft.image} alt={`${nft.name} #${nft.tokenId}`} loading="lazy" />
          {nft.id === featuredNft.id && <span className="nft-card__favorite-mark" aria-hidden="true"><Heart size={16} weight="regular" /></span>}
          {nft.available === 0 ? <span className="nft-card__badge">ESGOTADO</span> : nft.isRare && <span className="nft-card__badge">RARO</span>}
        </div>
        <h2>{nft.name} <span>#{nft.tokenId}</span></h2>
      </Link>
      <p className="nft-card__price">
        <strong>{nft.priceEth} ETH</strong>
        {nft.previousPriceEth && <del>{nft.previousPriceEth} ETH</del>}
      </p>
    </article>
  );
}

function CatalogSkeleton() {
  return (
    <div className="nft-card nft-card--skeleton" aria-hidden="true">
      <div className="nft-card__image-wrap shimmer" />
      <span className="skeleton-line shimmer" />
      <span className="skeleton-line skeleton-line--short shimmer" />
    </div>
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
