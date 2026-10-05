import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CaretLeft, CheckCircle, Plugs, WarningCircle } from "@phosphor-icons/react";
import { sessionQueryOptions } from "@/features/auth/auth-api";
import { cartQueryOptions, quoteQueryOptions } from "@/features/cart/cart-api";
import type { CartQuote } from "@/features/cart/cart-types";
import { readCheckoutDraft, revalidateQuote, saveCheckoutDraft, useWalletConnection, walletsQueryOptions, type CheckoutProfile, type SavedWallet, type WalletNetwork, type WalletProvider } from "./checkout-api";
import { clearOrderIntent, createOrder, readOrderIntent, recoverOrder, saveOrderIntent, type OrderIntent } from "@/features/orders/order-api";
import { profileQueryOptions } from "@/features/account/account-api";

const providers: WalletProvider[] = ["WalletConnect", "MetaMask", "Coinbase Wallet"];
const networks: WalletNetwork[] = ["Ethereum", "Polygon", "Solana"];

function errorText(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error) ? error.response?.data?.message ?? fallback : fallback;
}

function initialProfile(user: { id: string; name: string; email: string }): CheckoutProfile {
  return {
    displayName: user.name, username: user.name.toLowerCase(), network: "", profileName: user.name,
    walletAddress: "", secondaryAddress: "", walletType: "", referralCode: "", email: user.email,
    ensName: "", useOtherWallet: false, note: "", ...readCheckoutDraft(user.id),
  };
}

function QuoteTotals({ quote }: { quote: CartQuote }) {
  return <dl className="checkout-totals">
    <div><dt>Subtotal</dt><dd>{quote.subtotalEth} ETH</dd></div>
    <div><dt>Desconto do lançamento</dt><dd>(-) {quote.discountEth}</dd></div>
    <div><dt>Taxa de rede</dt><dd>{quote.networkFeeEth} ETH<small>Taxa estimada</small></dd></div>
    <div className="checkout-totals__grand"><dt>Total</dt><dd>{quote.totalEth} ETH</dd></div>
  </dl>;
}

function CheckoutContent({ user }: { user: { id: string; name: string; email: string } }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sendingRef = useRef(false);
  const scope = `user-${user.id}`;
  const cart = useQuery(cartQueryOptions(scope));
  const quote = useQuery({ ...quoteQueryOptions(scope), enabled: cart.isSuccess });
  const wallets = useQuery(walletsQueryOptions(user.id));
  const collectorProfile = useQuery(profileQueryOptions(user.id));
  const hadDraftAtMount = useRef(Boolean(window.sessionStorage.getItem(`kurio-checkout-draft-${user.id}`)));
  const walletActions = useWalletConnection(user.id);
  const orderSubmission = useMutation({ mutationFn: createOrder });
  const [profile, setProfile] = useState<CheckoutProfile>(() => initialProfile(user));
  const [selectedWalletId, setSelectedWalletId] = useState(() => window.sessionStorage.getItem(`kurio-checkout-wallet-${user.id}`) ?? "");
  const [providerChoice, setProviderChoice] = useState<WalletProvider | "">(() => readCheckoutDraft(user.id).walletType ?? "");
  const [fieldError, setFieldError] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [walletError, setWalletError] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [reviewedRevision, setReviewedRevision] = useState<string | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<OrderIntent | null>(() => readOrderIntent(user.id));
  const [orderError, setOrderError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const selectedWallet = wallets.data?.wallets.find((wallet) => wallet.id === selectedWalletId) ?? wallets.data?.wallets[0];
  const connected = Boolean(selectedWallet && wallets.data?.connectedWalletId === selectedWallet.id &&
    (providerChoice || profile.walletType || selectedWallet.provider) === (wallets.data?.connectedProvider ?? selectedWallet.provider) &&
    (profile.network || selectedWallet.network) === selectedWallet.network &&
    (profile.walletAddress || selectedWallet.address) === selectedWallet.address);
  const stale = Boolean(reviewedRevision && quote.data && reviewedRevision !== quote.data.revision);
  const ready = Boolean(quote.data?.valid && quote.data.items.length && connected);

  useEffect(() => { saveCheckoutDraft(user.id, profile); }, [profile, user.id]);
  useEffect(() => {
    if (collectorProfile.data && !hadDraftAtMount.current) {
      const saved = collectorProfile.data;
      setProfile((current) => ({ ...current, displayName: saved.displayName, username: saved.username,
        email: saved.email, ensName: saved.ensName }));
      hadDraftAtMount.current = true;
    }
  }, [collectorProfile.data]);
  useEffect(() => { window.sessionStorage.setItem(`kurio-checkout-wallet-${user.id}`, selectedWalletId); }, [selectedWalletId, user.id]);
  useEffect(() => {
    const intent = readOrderIntent(user.id);
    if (!intent) return;
    let active = true;
    void recoverOrder(intent.key).then((order) => {
      if (active) { void navigate({ to: "/orders/$orderId", params: { orderId: order.id } }); }
    }).catch(() => { if (active) setOrderError("O envio anterior foi interrompido. Você pode recuperar ou reenviar a mesma tentativa."); });
    return () => { active = false; };
  }, [navigate, user.id]);

  const patchProfile = (patch: Partial<CheckoutProfile>) => {
    setProfile((current) => ({ ...current, ...patch }));
    setReviewedRevision(null);
    setReviewConfirmed(false);
    setFieldError("");
    setInvalidField("");
  };
  const changeField = (key: keyof CheckoutProfile) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => patchProfile({ [key]: event.target.value });
  const chooseWallet = (wallet: SavedWallet) => {
    setSelectedWalletId(wallet.id);
    setProviderChoice(wallet.provider);
    const receiver = wallets.data?.secondaryUsesPrimary ? wallets.data.wallets.find((entry) => entry.id === "primary") : wallets.data?.wallets.find((entry) => entry.id !== "primary");
    patchProfile({ network: wallet.network, walletAddress: wallet.address, walletType: wallet.provider,
      profileName: wallet.profileName ?? profile.profileName, referralCode: wallet.referralCode ?? profile.referralCode,
      email: wallet.email ?? profile.email, secondaryAddress: receiver?.address ?? wallet.secondaryAddress ?? profile.secondaryAddress,
      ensName: wallet.ensName ?? (wallet.address.endsWith(".eth") ? wallet.address.slice(0, -4) : profile.ensName) });
    setWalletError("");
  };
  const chooseProvider = (provider: WalletProvider) => {
    setProviderChoice(provider);
    patchProfile({ walletType: provider });
    setWalletError("");
  };
  const connection = () => {
    if (!selectedWallet) return;
    setWalletError("");
    walletActions.connect.mutate({ walletId: selectedWallet.id, provider: providerChoice || profile.walletType || selectedWallet.provider, network: profile.network || selectedWallet.network }, {
      onError: (error) => setWalletError(errorText(error, "Não foi possível conectar a carteira.")),
    });
  };
  const disconnection = () => {
    setWalletError("");
    setReviewedRevision(null);
    setReviewConfirmed(false);
    walletActions.disconnect.mutate(undefined, { onError: (error) => setWalletError(errorText(error, "Não foi possível desconectar.")) });
  };
  const showFieldError = (message: string, focusId: string) => {
    setFieldError(message);
    setInvalidField(focusId);
    requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  };
  const fieldA11y = (id: string) => ({ id, "aria-invalid": invalidField === id, "aria-describedby": invalidField === id ? "checkout-field-error" : undefined });
  const validate = () => {
    if (!profile.displayName.trim() || !profile.username.trim() || !profile.profileName.trim() || !profile.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      const first = !profile.displayName.trim() ? "checkout-display-name" : !profile.username.trim() ? "checkout-username" : !profile.profileName.trim() ? "checkout-profile-name" : "checkout-email";
      showFieldError("Preencha o nome de exibição, usuário, nome do perfil e um e-mail válido.", first);
      return false;
    }
    if (!profile.referralCode.trim() || !/^[a-z0-9.-]{3,63}$/i.test(profile.ensName.trim())) {
      showFieldError("Informe o código de indicação e um nome ENS válido (sem .eth).", !profile.referralCode.trim() ? "checkout-referral" : "checkout-ens");
      return false;
    }
    if (!selectedWallet || !(profile.network || selectedWallet.network) || !(profile.walletAddress || selectedWallet.address).trim() || !(profile.walletType || providerChoice || selectedWallet.provider)) {
      showFieldError("Selecione uma carteira, rede e aplicativo de carteira.", !selectedWallet ? "checkout-saved-wallets" : !profile.network ? "checkout-network" : !profile.walletAddress.trim() ? "checkout-wallet-address" : "checkout-wallet-type");
      return false;
    }
    if (profile.useOtherWallet && !profile.secondaryAddress.trim()) {
      showFieldError("Informe o endereço da carteira secundária ou desmarque 'Usar outra carteira'.", "checkout-secondary");
      return false;
    }
    if (!connected) {
      showFieldError("Conecte a carteira selecionada para revisar a compra.", "checkout-connect-button");
      return false;
    }
    setFieldError("");
    setInvalidField("");
    return true;
  };
  const revalidation = useMutation({ mutationFn: revalidateQuote });
  const checkQuote = async (revision: string) => {
    try {
      const result = await revalidation.mutateAsync(revision);
      queryClient.setQueryData(["cart-quote", scope], result.quote);
      if (!result.quote.valid || !result.quote.items.length) {
        setReviewedRevision(null);
        setReviewConfirmed(false);
        setQuoteError(result.quote.issues.join(" ") || "Seu carrinho está vazio ou indisponível.");
        requestAnimationFrame(() => document.getElementById("checkout-quote-message")?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return false;
      }
      if (result.changed) {
        setReviewedRevision(null);
        setReviewConfirmed(false);
        setQuoteError("A cotação mudou. Confira os novos valores e revise novamente antes de confirmar.");
        requestAnimationFrame(() => document.getElementById("checkout-quote-message")?.scrollIntoView({ behavior: "smooth", block: "center" }));
        return false;
      }
      setQuoteError("");
      return true;
    } catch (error) {
      setQuoteError(errorText(error, "Não foi possível revalidar a cotação. Tente novamente."));
      requestAnimationFrame(() => document.getElementById("checkout-quote-message")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return false;
    }
  };
  const startReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || !quote.data) return;
    if (await checkQuote(quote.data.revision)) {
      setReviewedRevision(quote.data.revision);
      setReviewConfirmed(false);
      requestAnimationFrame(() => document.getElementById("checkout-review-title")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };
  const confirmReview = async () => {
    if (!validate() || !quote.data || !reviewedRevision || stale) return;
    if (await checkQuote(reviewedRevision)) setReviewConfirmed(true);
  };
  const submitOrder = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setIsSending(true);
    setOrderError("");
    try {
      let intent = pendingIntent;
      if (!intent) {
        if (!reviewConfirmed || !reviewedRevision || !quote.data || stale || !validate() || !selectedWallet) return;
        if (!await checkQuote(reviewedRevision)) return;
        intent = {
          key: crypto.randomUUID(),
          input: { quoteRevision: reviewedRevision, walletId: selectedWallet.id,
            provider: providerChoice || profile.walletType || selectedWallet.provider,
            network: profile.network || selectedWallet.network, profile },
        };
        saveOrderIntent(user.id, intent);
        setPendingIntent(intent);
      }
      let order;
      try { order = await orderSubmission.mutateAsync(intent); }
      catch (error) {
        if (isAxiosError(error) && error.response?.status === 504) order = await recoverOrder(intent.key);
        else throw error;
      }
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["cart-quote"] });
      await navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.code === "QUOTE_CHANGED") {
        clearOrderIntent(user.id);
        setPendingIntent(null);
        setReviewedRevision(null);
        setReviewConfirmed(false);
        void queryClient.invalidateQueries({ queryKey: ["cart-quote", scope] });
      }
      setOrderError(errorText(error, "Não foi possível enviar o pedido. Tente novamente com a mesma tentativa."));
    } finally { sendingRef.current = false; setIsSending(false); }
  };

  return <div className="checkout-page">
    <nav className="checkout-page__breadcrumb" aria-label="Caminho"><Link to="/">Início</Link><span>/</span><Link to="/">Mercado</Link><span>/</span><span>Pagamento</span></nav>
    <div className="checkout-page__mobile-title"><Link to="/cart" aria-label="Voltar ao carrinho"><CaretLeft size={20} /></Link><h1>Pagamento com carteira</h1></div>
    <div className="checkout-page__columns">
      <form className="checkout-form" id="checkout-form" onSubmit={(event) => void startReview(event)} noValidate>
        <h1>Perfil do colecionador</h1>
        <div className="checkout-form__grid">
          <label>Nome de exibição <b>*</b><input {...fieldA11y("checkout-display-name")} value={profile.displayName} onChange={changeField("displayName")} autoComplete="name" required /></label>
          <label>Nome de usuário <b>*</b><input {...fieldA11y("checkout-username")} value={profile.username} onChange={changeField("username")} required /></label>
          <label>Rede <b>*</b><select {...fieldA11y("checkout-network")} value={profile.network || selectedWallet?.network || ""} onChange={(event) => patchProfile({ network: event.target.value as WalletNetwork })} required><option value="">Selecione uma rede</option>{networks.map((network) => <option key={network} value={network}>{network}</option>)}</select></label>
          <label>Nome do perfil <b>*</b><input {...fieldA11y("checkout-profile-name")} value={profile.profileName} onChange={changeField("profileName")} required /></label>
          <label>Endereço da carteira <b>*</b><input {...fieldA11y("checkout-wallet-address")} value={profile.walletAddress || selectedWallet?.address || ""} onChange={changeField("walletAddress")} placeholder="Endereço 0x da carteira" required /></label>
          <label className="checkout-form__secondary"><span>Carteira secundária</span><input {...fieldA11y("checkout-secondary")} value={profile.secondaryAddress} onChange={changeField("secondaryAddress")} placeholder="ENS ou carteira secundária (opcional)" /></label>
          <label>Tipo de carteira <b>*</b><select {...fieldA11y("checkout-wallet-type")} value={profile.walletType || providerChoice || selectedWallet?.provider || ""} onChange={(event) => chooseProvider(event.target.value as WalletProvider)} required><option value="">Selecione uma carteira</option>{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select></label>
          <label>Código de indicação <b>*</b><input {...fieldA11y("checkout-referral")} value={profile.referralCode} onChange={changeField("referralCode")} required /></label>
          <label>E-mail <b>*</b><input {...fieldA11y("checkout-email")} type="email" value={profile.email} onChange={changeField("email")} autoComplete="email" required /></label>
          <label>Nome ENS <b>*</b><div className="checkout-form__ens"><span>.eth</span><input {...fieldA11y("checkout-ens")} value={profile.ensName} onChange={changeField("ensName")} placeholder="Nome ENS" required /></div></label>
        </div>
        <label className="checkout-form__alternate"><input type="checkbox" checked={profile.useOtherWallet} onChange={(event) => patchProfile({ useOtherWallet: event.target.checked })} />Usar outra carteira para receber os NFTs?</label>
        <label className="checkout-form__note">Observação do colecionador (opcional)<textarea value={profile.note} onChange={changeField("note")} rows={6} /></label>
        {fieldError && <p className="checkout-message checkout-message--error" id="checkout-field-error" role="alert">{fieldError}</p>}
      </form>
      <aside className="checkout-summary" aria-label="Pagamento">
        <section className="checkout-summary__items"><h2>Seus NFTs</h2><div className="checkout-summary__table-head"><span>NFTs</span><span>Subtotal</span></div>
          {(cart.isPending || quote.isPending) && <p role="status">Carregando cotação...</p>}
          {(cart.isError || quote.isError) && <div role="alert"><p>Não foi possível carregar a cotação.</p><button type="button" onClick={() => { void cart.refetch(); void quote.refetch(); }}>Tentar novamente</button></div>}
          {quote.data?.items.map((item) => <div className="checkout-summary__item" key={`${item.nftId}:${item.editionId}`}><img src={item.image} alt="" /><div><strong>{item.name} #{item.tokenId}</strong><small>ID do token: #{item.tokenId}</small></div><span>(x {item.quantity})</span><b>{item.lineTotalEth} ETH</b></div>)}
          {quote.data?.items.length === 0 && <p>Seu carrinho está vazio. <Link to="/">Explorar NFTs</Link></p>}
          {cart.data?.coupon && <p className="checkout-summary__coupon">Cupom {cart.data.coupon} aplicado</p>}
          {quote.data && <QuoteTotals quote={quote.data} />}
          {quote.data?.issues.map((issue) => <p className="checkout-message checkout-message--error" key={issue} role="alert">{issue}</p>)}
        </section>
        <section className="checkout-wallets"><div className="checkout-wallets__heading"><h2>Carteira conectada</h2><button type="button" onClick={() => document.getElementById("checkout-saved-wallets")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Trocar carteira</button></div>
          {wallets.isPending && <p role="status">Carregando carteiras...</p>}
          {wallets.isError && <div role="alert"><p>Não foi possível carregar as carteiras.</p><button type="button" onClick={() => void wallets.refetch()}>Tentar novamente</button></div>}
          <div className="checkout-wallets__saved" id="checkout-saved-wallets" tabIndex={-1}>{wallets.data?.wallets.map((wallet) => <button className={`checkout-wallets__saved-option${selectedWallet?.id === wallet.id ? " is-selected" : ""}`} type="button" key={wallet.id} aria-pressed={selectedWallet?.id === wallet.id} onClick={() => chooseWallet(wallet)}><span className="checkout-wallets__radio" aria-hidden="true" /><span><strong>{wallet.name}</strong><small>{wallet.address}</small><small>Rede {wallet.network === "Ethereum" ? "principal Ethereum" : wallet.network}</small></span>{wallets.data.connectedWalletId === wallet.id && <CheckCircle size={20} aria-label="Conectada" />}</button>)}</div>
          <h2>Carteira e rede</h2><div className="checkout-wallets__providers">{providers.map((provider) => <button type="button" className={`checkout-wallets__provider${(providerChoice || selectedWallet?.provider) === provider ? " is-selected" : ""}`} key={provider} aria-pressed={(providerChoice || selectedWallet?.provider) === provider} onClick={() => chooseProvider(provider)}><span className="checkout-wallets__provider-icon" aria-hidden="true">{provider === "Coinbase Wallet" ? "C" : provider.charAt(0)}</span>{provider}<span className="checkout-wallets__radio" aria-hidden="true" /></button>)}</div>
          <div className="checkout-wallets__connection">{connected ? <><span><CheckCircle size={18} /> {selectedWallet?.name} conectada</span><button type="button" onClick={disconnection} disabled={walletActions.disconnect.isPending}>Desconectar</button></> : <button id="checkout-connect-button" type="button" onClick={connection} disabled={!selectedWallet || walletActions.connect.isPending}>{walletActions.connect.isPending ? "Conectando..." : <><Plugs size={17} /> Conectar carteira</>}</button>}</div>
          {walletError && <p className="checkout-message checkout-message--error" role="alert">{walletError}</p>}
        </section>
        {quote.data && <div className="checkout-summary__mobile-total"><strong>Total:</strong><b>{quote.data.totalEth} ETH</b></div>}
        {quoteError && <p className="checkout-message checkout-message--error" id="checkout-quote-message" role="alert"><WarningCircle size={17} /> {quoteError}</p>}
        {stale && <p className="checkout-message checkout-message--error" role="alert">A cotação mudou durante a revisão. Confira os valores e revise novamente.</p>}
        {orderError && <p className="checkout-message checkout-message--error" role="alert">{orderError}</p>}
        <button className="checkout-summary__primary" type="submit" form="checkout-form" disabled={!ready || revalidation.isPending || Boolean(pendingIntent)}>{revalidation.isPending ? "Revalidando cotação..." : pendingIntent ? "Pedido em andamento" : reviewedRevision && !stale ? "Revisar novamente" : "Confirmar compra"}</button>
        {reviewedRevision && !stale && quote.data && <section className="checkout-review" aria-labelledby="checkout-review-title"><h2 id="checkout-review-title">Revisão da compra</h2><p>{quote.data.items.reduce((sum, item) => sum + item.quantity, 0)} NFT(s) · {quote.data.totalEth} ETH</p><p>Carteira: {selectedWallet?.name} · Rede {profile.network || selectedWallet?.network}</p><p>Colecionador: {profile.displayName}</p>{profile.useOtherWallet && <p>Receber em: {profile.secondaryAddress}</p>}{reviewConfirmed ? <button type="button" onClick={() => void submitOrder()} disabled={isSending || revalidation.isPending}>{isSending ? "Enviando pedido..." : "Enviar pedido"}</button> : <button type="button" onClick={() => void confirmReview()} disabled={revalidation.isPending}>Confirmar revisão</button>}</section>}
        {pendingIntent && <button className="checkout-review__retry" type="button" onClick={() => void submitOrder()} disabled={isSending}>{isSending ? "Recuperando pedido..." : "Recuperar ou reenviar pedido"}</button>}
      </aside>
    </div>
  </div>;
}

export function CheckoutPage() {
  const session = useQuery(sessionQueryOptions);
  if (!session.data?.user) return <div className="checkout-page" role="status">Verificando sessão...</div>;
  return <CheckoutContent key={session.data.user.id} user={session.data.user} />;
}
