import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CaretLeft, Heart, MagnifyingGlass, Minus, Plus, ShoppingCart, Star, X } from "@phosphor-icons/react";
import { nftQueryOptions } from "@/features/catalog/catalog-api";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { favoritesQueryOptions, useToggleFavorite } from "@/features/favorites/favorites-api";
import { multiplyEth, type NftDetail } from "@/features/nft-detail/nft-detail-data";
import { cartQueryOptions, guestId, useCartActions } from "@/features/cart/cart-api";
import { NftImage } from "@/components/nft-image";

export const Route = createFileRoute("/nft/$nftId")({ component: NftEntry });

function galleryImageStyle(image: NftDetail["gallery"][number]): CSSProperties {
  return { transform: `scale(${image.cropScale})`, transformOrigin: image.cropOrigin };
}

function QuantityControl({ quantity, available, onChange }: { quantity: number; available: number; onChange: (value: number) => void }) {
  return <div className="nft-quantity" aria-label="Quantidade">
    <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => onChange(quantity - 1)}><Minus size={17} weight="bold" /></button>
    <span aria-live="polite">{quantity}</span>
    <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= available} onClick={() => onChange(quantity + 1)}><Plus size={17} weight="bold" /></button>
  </div>;
}

function DetailContent({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedEdition, setSelectedEdition] = useState(nft.editions.find((edition) => edition.label === nft.edition)?.id ?? nft.editions[0].id);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");
  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const zoomCloseRef = useRef<HTMLButtonElement>(null);
  const [favoriteError, setFavoriteError] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [cartError, setCartError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const edition = nft.editions.find((item) => item.id === selectedEdition) ?? nft.editions[0];
  const totalPrice = multiplyEth(edition.priceEth, quantity);
  const session = useQuery(sessionQueryOptions);
  const cartScope = session.data?.user ? `user-${session.data.user.id}` : `guest-${guestId()}`;
  const cart = useQuery({ ...cartQueryOptions(cartScope), enabled: !session.isPending });
  const alreadyInCart = cart.data?.items.find((item) => item.nftId === nft.id && item.editionId === edition.id)?.quantity ?? 0;
  const remainingToAdd = Math.max(0, edition.available - alreadyInCart);
  const userId = session.data?.user?.id ?? "guest";
  const favorites = useQuery({ ...favoritesQueryOptions(userId), enabled: Boolean(session.data?.user) });
  const toggleFavorite = useToggleFavorite(userId);
  const cartActions = useCartActions();
  const isFavorite = favorites.data?.ids.includes(nft.id) ?? false;

  useEffect(() => {
    if (!zoomOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const zoomTrigger = zoomTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    zoomCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setZoomOpen(false);
      } else if (event.key === "Tab") {
        event.preventDefault();
        zoomCloseRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      (zoomTrigger ?? previousFocus)?.focus();
    };
  }, [zoomOpen]);

  const onFavorite = () => {
    if (!session.data?.user) {
      void navigate({ to: "/login", search: { returnTo: window.location.pathname + window.location.search, expired: false } });
      return;
    }
    setFavoriteError(false);
    toggleFavorite.mutate({ nftId: nft.id, favorite: !isFavorite }, { onError: () => setFavoriteError(true) });
  };

  const addToCart = (openCart: boolean) => {
    if (remainingToAdd < quantity) return;
    setCartError("");
    setCartMessage("");
    cartActions.add.mutate({ nftId: nft.id, editionId: edition.id, quantity }, {
      onSuccess: () => { if (openCart) void navigate({ to: "/cart" }); else setCartMessage("NFT adicionado ao carrinho."); },
      onError: () => setCartError("Não foi possível adicionar esta edição ao carrinho. Verifique a disponibilidade e tente novamente."),
    });
  };

  const favoriteButton = (mobile: boolean) => <button
    className={mobile ? "nft-detail__round-action nft-detail__mobile-heart" : "nft-detail__favorite-button"}
    type="button"
    aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    aria-pressed={isFavorite}
    onClick={onFavorite}
  ><Heart size={mobile ? 22 : 21} weight={isFavorite ? "fill" : "regular"} />{!mobile && <span>{isFavorite ? "Favoritado" : "Favoritar"}</span>}</button>;

  return <section className="nft-detail" aria-labelledby="nft-detail-title">
    <div className="nft-detail__mobile-actions">
      <Link className="nft-detail__round-action" to="/" aria-label="Voltar ao catálogo"><CaretLeft size={20} /></Link>
      {favoriteButton(true)}
    </div>
    <div className="nft-detail__breadcrumb"><Link to="/">Início</Link><span>/</span><Link to="/">Mercado</Link></div>
    <div className="nft-detail__top">
      <div className="nft-detail__gallery">
        <div className="nft-detail__thumbnails" aria-label="Galeria do NFT">
          {nft.gallery.map((image, index) => <button key={index} type="button" className={selectedImage === index ? "is-selected" : ""} aria-label={image.alt} aria-pressed={selectedImage === index} onClick={() => setSelectedImage(index)}><NftImage image={image.image} style={galleryImageStyle(image)} alt="" sizes="90px" /></button>)}
        </div>
        <div className="nft-detail__artwork">
          <NftImage image={nft.gallery[selectedImage].image} style={galleryImageStyle(nft.gallery[selectedImage])} alt={nft.gallery[selectedImage].alt} sizes="(max-width: 640px) 90vw, 45vw" fetchPriority="high" />
          <button ref={zoomTriggerRef} type="button" aria-label="Ampliar imagem" onClick={() => setZoomOpen(true)}><MagnifyingGlass size={22} /></button>
          <div className="nft-detail__gallery-dots" role="group" aria-label="Galeria do NFT">
            {nft.gallery.map((image, index) => <button key={index} type="button" className={selectedImage === index ? "is-selected" : ""} aria-label={image.alt} aria-pressed={selectedImage === index} onClick={() => setSelectedImage(index)} />)}
          </div>
        </div>
      </div>
      <div className="nft-detail__info">
        <div className="nft-detail__title-row"><h1 id="nft-detail-title">{nft.name} #{nft.tokenId}</h1><span className="nft-detail__rating"><Star size={17} weight="fill" /> {nft.rating} ({nft.reviewCount})</span></div>
        <div className="nft-detail__desktop-price"><strong>{edition.priceEth} ETH</strong><span>★★★★★ {nft.reviewCount} avaliações de colecionadores</span></div>
        <div className="nft-detail__intro"><h2>Sobre este NFT:</h2><p>{nft.description}</p></div>
        <div className="nft-detail__editions"><strong>Edição:</strong><div role="group" aria-label="Escolha a edição">{nft.editions.map((item) => <button type="button" key={item.id} className={item.id === selectedEdition ? "is-selected" : ""} aria-pressed={item.id === selectedEdition} onClick={() => { setSelectedEdition(item.id); setQuantity(1); }}>{item.label}</button>)}</div></div>
        {edition.available === 0 ? <p className="nft-detail__availability" role="status">Esta edição está esgotada.</p> : <p className="nft-detail__availability">{edition.available} disponíveis nesta edição{alreadyInCart > 0 ? ` · ${alreadyInCart} no carrinho` : ""}{remainingToAdd === 0 ? " · limite atingido" : ""}</p>}
        <div className="nft-detail__desktop-controls"><QuantityControl quantity={quantity} available={remainingToAdd} onChange={setQuantity} /><div className="nft-detail__purchase-actions"><button className="nft-detail__buy" type="button" disabled={remainingToAdd < quantity || cart.isPending || cartActions.add.isPending} onClick={() => addToCart(true)}>COMPRAR</button>{favoriteButton(false)}</div></div>
        {cartError && <p className="nft-detail__favorite-error" role="alert">{cartError}</p>}{cartMessage && <p role="status">{cartMessage}</p>}
        {favoriteError && <p className="nft-detail__favorite-error" role="alert">Não foi possível atualizar os favoritos. Tente novamente.</p>}
        <dl className="nft-detail__metadata"><div><dt>ID do token:</dt><dd>#{nft.tokenId}</dd></div><div><dt>Coleção:</dt><dd>{nft.collection}</dd></div><div><dt>Atributos:</dt><dd>{nft.attributes.join(", ")}</dd></div></dl>
        <div className="nft-detail__share"><strong>Compartilhar este NFT:</strong> <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopyMessage("Link copiado"); } catch { setCopyMessage("Não foi possível copiar o link"); } }}>Copiar link</button><span role="status">{copyMessage}</span></div>
      </div>
    </div>
    <div className="nft-detail__below">
      <div className="nft-detail__tabs" role="tablist" aria-label="Informações do NFT"><button type="button" role="tab" aria-selected={activeTab === "details"} className={activeTab === "details" ? "is-selected" : ""} onClick={() => setActiveTab("details")}>Detalhes do NFT</button><button type="button" role="tab" aria-selected={activeTab === "reviews"} className={activeTab === "reviews" ? "is-selected" : ""} onClick={() => setActiveTab("reviews")}>Avaliações de colecionadores ({nft.reviewCount})</button></div>
      {activeTab === "details" ? <div className="nft-detail__prose"><p>{nft.details[0]}</p><p>{nft.details[1]}</p><strong>Rede:</strong><p>Cunhado na {nft.network} com procedência imutável e metadados armazenados no IPFS.</p><strong>Contrato:</strong><p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p><strong>Direitos autorais:</strong><p>Contrato inteligente verificado.</p></div> : <div className="nft-detail__reviews" role="tabpanel">{nft.reviews.map((review) => <article key={review.author}><strong>{review.author}</strong><span aria-label={`${review.rating} de 5 estrelas`}>★★★★★</span><p>{review.text}</p></article>)}</div>}
      <section className="nft-detail__related" aria-labelledby="related-title"><h2 id="related-title">Mais desta coleção</h2><div>{nft.related.map((item) => <Link to="/nft/$nftId" params={{ nftId: item.id }} key={item.id}><span><NftImage image={item.image} alt="" sizes="25vw" /></span><strong>{item.name} #{item.tokenId}</strong><b>{item.priceEth} ETH</b></Link>)}</div></section>
    </div>
    <div className="nft-detail__mobile-buy"><div><span>Qtd.</span><QuantityControl quantity={quantity} available={remainingToAdd} onChange={setQuantity} /><strong>{totalPrice} ETH</strong></div><div><button className="nft-detail__buy" type="button" disabled={remainingToAdd < quantity || cart.isPending || cartActions.add.isPending} onClick={() => addToCart(true)}>Comprar NFT</button><button className="nft-detail__mobile-cart" type="button" disabled={remainingToAdd < quantity || cart.isPending || cartActions.add.isPending} aria-label="Adicionar ao carrinho" onClick={() => addToCart(false)}><ShoppingCart size={22} /></button></div></div>
    {zoomOpen && <div className="nft-detail__zoom" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={() => setZoomOpen(false)}><button ref={zoomCloseRef} type="button" aria-label="Fechar imagem ampliada" onClick={() => setZoomOpen(false)}><X size={24} /></button><div className="nft-detail__zoom-artwork" onClick={(event) => event.stopPropagation()}><NftImage image={nft.gallery[selectedImage].image} style={galleryImageStyle(nft.gallery[selectedImage])} alt={nft.gallery[selectedImage].alt} sizes="90vw" /></div></div>}
  </section>;
}

function NftEntry() {
  const { nftId } = Route.useParams();
  const { data: nft, isPending, error, refetch } = useQuery(nftQueryOptions(nftId));
  if (isPending) return <div className="nft-detail nft-detail--loading" aria-busy="true" aria-label="Carregando NFT"><div className="shimmer" /><div><span className="skeleton-line shimmer" /><span className="skeleton-line shimmer" /></div></div>;
  if (error || !nft) return <div className="nft-detail nft-detail--error" role="alert"><Link to="/">← Voltar ao catálogo</Link><h1>{isAxiosError(error) && error.response?.status === 404 ? "NFT não encontrado" : "Não foi possível carregar o NFT"}</h1><p>{isAxiosError(error) && error.response?.status === 404 ? "Esta obra não está disponível no catálogo." : "Verifique a conexão e tente novamente."}</p>{!(isAxiosError(error) && error.response?.status === 404) && <button type="button" onClick={() => void refetch()}>Tentar novamente</button>}</div>;
  return <DetailContent key={nft.id} nft={nft} />;
}
