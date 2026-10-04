import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CaretLeft, Minus, Plus, Trash } from "@phosphor-icons/react";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { catalogQueryOptions } from "@/features/catalog/catalog-api";
import { defaultCatalogSearch } from "@/features/catalog/catalog-search";
import { cartQueryOptions, guestId, quoteQueryOptions, useCartActions } from "./cart-api";
import type { QuotedItem } from "./cart-types";

function apiMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;
}

export function CartPage() {
  const navigate = useNavigate();
  const session = useQuery(sessionQueryOptions);
  const scope = session.data?.user ? `user-${session.data.user.id}` : `guest-${guestId()}`;
  const cart = useQuery({ ...cartQueryOptions(scope), enabled: !session.isPending });
  const quote = useQuery({ ...quoteQueryOptions(scope), enabled: !session.isPending && cart.isSuccess });
  const recommendations = useQuery(catalogQueryOptions(defaultCatalogSearch));
  const actions = useCartActions();
  const [couponInput, setCouponInput] = useState("");
  const [actionError, setActionError] = useState("");
  const [couponError, setCouponError] = useState("");
  const busy = actions.add.isPending || actions.update.isPending || actions.remove.isPending || actions.applyCoupon.isPending || actions.removeCoupon.isPending;

  const changeQuantity = (item: QuotedItem, quantity: number) => {
    setActionError("");
    if (quantity < 1) return;
    actions.update.mutate({ nftId: item.nftId, editionId: item.editionId, quantity }, { onError: (error) => setActionError(apiMessage(error, "Não foi possível alterar a quantidade.")) });
  };
  const removeItem = (item: QuotedItem) => {
    setActionError("");
    actions.remove.mutate({ nftId: item.nftId, editionId: item.editionId }, { onError: (error) => setActionError(apiMessage(error, "Não foi possível remover o NFT.")) });
  };
  const submitCoupon = (event: FormEvent) => {
    event.preventDefault();
    setCouponError("");
    actions.applyCoupon.mutate(couponInput, {
      onSuccess: () => setCouponInput(""),
      onError: (error) => setCouponError(apiMessage(error, "Não foi possível aplicar o cupom.")),
    });
  };
  const removeCoupon = () => {
    setCouponError("");
    actions.removeCoupon.mutate(undefined, { onError: (error) => setCouponError(apiMessage(error, "Não foi possível remover o cupom.")) });
  };
  const quoteReady = cart.isSuccess && quote.isSuccess;
  const items = quoteReady ? quote.data.items : [];
  const suggested = recommendations.data?.items.filter((item) => !items.some((inCart) => inCart.nftId === item.id)).slice(0, 5) ?? [];

  return <div className="cart-page">
    <div className="cart-page__mobile-heading"><Link to="/" aria-label="Voltar ao mercado"><CaretLeft size={20} /></Link><h1>Carrinho de NFTs</h1></div>
    <nav className="cart-page__breadcrumb" aria-label="Caminho"><Link to="/">Início</Link><span>/</span><Link to="/">Mercado</Link><span>/</span><span>Carrinho</span></nav>
    <div className="cart-page__columns">
      <section className="cart-page__items" aria-label="NFTs no carrinho">
        <h1 className="sr-only cart-page__desktop-title">Carrinho de NFTs</h1>
        <div className="cart-page__table-head"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span className="sr-only">Remover</span></div>
        {(cart.isPending || quote.isPending) && <div className="cart-page__loading" aria-busy="true"><div className="shimmer" /><div className="shimmer" /><div className="shimmer" /></div>}
        {(cart.isError || quote.isError) && <div className="cart-page__state" role="alert"><h2>Não foi possível carregar o carrinho</h2><p>Verifique a conexão e tente novamente.</p><button type="button" onClick={() => { void cart.refetch(); void quote.refetch(); }}>Tentar novamente</button></div>}
        {quoteReady && items.length === 0 && <div className="cart-page__state"><h2>Seu carrinho está vazio</h2><p>Escolha uma obra para começar sua coleção.</p><Link to="/">Explorar NFTs</Link></div>}
        {quoteReady && items.map((item) => <article className="cart-page__item" key={`${item.nftId}:${item.editionId}`}>
          <Link className="cart-page__art" to="/nft/$nftId" params={{ nftId: item.nftId }}><img src={item.image} alt={`${item.name} #${item.tokenId}`} /></Link>
          <div className="cart-page__item-name"><Link to="/nft/$nftId" params={{ nftId: item.nftId }}>{item.name} #{item.tokenId}</Link><small className="cart-page__desktop-token">ID do token: #{item.tokenId}</small><small className="cart-page__mobile-edition">Edição: {item.edition}</small><strong className="cart-page__mobile-price">{item.lineTotalEth} ETH</strong></div>
          <span className="cart-page__unit-price">{item.unitPriceEth} ETH</span>
          <div className="cart-page__quantity" role="group" aria-label={`Quantidade de ${item.name} #${item.tokenId}`}><button type="button" onClick={() => changeQuantity(item, item.quantity - 1)} disabled={busy || item.quantity <= 1} aria-label={`Diminuir ${item.name}`}><Minus size={13} weight="bold" /></button><span aria-live="polite">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item, item.quantity + 1)} disabled={busy || item.quantity >= item.available} aria-label={`Aumentar ${item.name}`}><Plus size={13} weight="bold" /></button></div>
          <strong className="cart-page__line-total">{item.lineTotalEth} ETH</strong>
          <button className="cart-page__remove" type="button" onClick={() => removeItem(item)} disabled={busy} aria-label={`Remover ${item.name} #${item.tokenId}`}><Trash size={21} /></button>
        </article>)}
        {actionError && <p className="cart-page__action-error" role="alert">{actionError}</p>}
        {quoteReady && quote.data.issues.map((issue) => <p className="cart-page__action-error" role="alert" key={issue}>{issue}</p>)}
      </section>
      <aside className="cart-page__summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">Resumo da carteira</h2>
        <form className="cart-page__coupon" onSubmit={submitCoupon}><label htmlFor="coupon-code">Código promocional</label><div><input id="coupon-code" type="text" value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Digite o código promocional..." disabled={busy || items.length === 0} /><button type="submit" disabled={busy || !couponInput.trim() || items.length === 0}>Aplicar</button></div></form>
        {couponError && <p className="cart-page__coupon-error" role="alert">{couponError}</p>}
        {cart.data?.coupon && <div className="cart-page__applied"><span>Cupom {cart.data.coupon} aplicado</span><button type="button" onClick={removeCoupon} disabled={busy}>Remover</button></div>}
        {quoteReady ? <dl className="cart-page__totals"><div><dt>Subtotal</dt><dd>{quote.data.subtotalEth} ETH</dd></div><div><dt>Desconto do lançamento</dt><dd>(-) {quote.data.discountEth} ETH</dd></div><div><dt>Taxa de rede</dt><dd>{quote.data.networkFeeEth} ETH<small>Taxa estimada</small></dd></div><div className="cart-page__grand-total"><dt>Total</dt><dd>{quote.data.totalEth} ETH</dd></div></dl> : <p className="cart-page__quote-unavailable" role="status">Valores indisponíveis até a cotação ser carregada.</p>}
        {session.data?.user ? <button className="cart-page__checkout" type="button" disabled title="Pagamento disponível na próxima etapa">Conectar e finalizar</button> : <button className="cart-page__checkout" type="button" disabled={busy || cart.isFetching || quote.isFetching || !quoteReady || items.length === 0 || !quote.data.valid} onClick={() => void navigate({ to: "/login", search: { returnTo: "/cart", expired: false } })}>Conectar e finalizar</button>}
        <Link className="cart-page__continue" to="/">Continuar explorando</Link>
      </aside>
    </div>
    {suggested.length > 0 && <section className="cart-page__suggestions" aria-labelledby="cart-suggestions-title"><h2 id="cart-suggestions-title">Colecionadores também viram</h2><div>{suggested.map((nft) => <Link to="/nft/$nftId" params={{ nftId: nft.id }} key={nft.id}><span><img src={nft.image} alt="" /></span><strong>{nft.name} #{nft.tokenId}</strong><b>{nft.priceEth} ETH</b></Link>)}</div><div className="cart-page__dots" aria-hidden="true"><i /><i /><i /></div></section>}
  </div>;
}
