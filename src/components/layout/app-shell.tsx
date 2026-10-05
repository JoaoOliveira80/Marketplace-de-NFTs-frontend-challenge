import {
  FacebookLogo,
  Heart,
  House,
  InstagramLogo,
  LinkedinLogo,
  MagnifyingGlass,
  Scan,
  SignIn,
  SlidersHorizontal,
  ShoppingCart,
  TwitterLogo,
  UserCircle,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { sessionQueryOptions, useSignOut } from "@/features/auth/auth-api";
import { cartQueryOptions, guestId } from "@/features/cart/cart-api";

const primarySections = ["Mercado", "Criadores", "Aprenda"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const isHome = pathname === "/";
  const isDetail = pathname.startsWith("/nft/");
  const isAuth = pathname === "/login" || pathname === "/register";
  const isFavorites = pathname === "/favorites";
  const isCart = pathname === "/cart";
  const isCheckout = pathname === "/checkout";
  const isOrder = pathname.startsWith("/orders/");
  const isAccount = pathname === "/profile" || pathname === "/wallets";
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState("");
  const session = useQuery(sessionQueryOptions);
  const cartScope = session.data?.user ? `user-${session.data.user.id}` : `guest-${guestId()}`;
  const cart = useQuery({ ...cartQueryOptions(cartScope), enabled: !session.isPending });
  const cartCount = cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const signOut = useSignOut();
  useEffect(() => {
    if (isAuth) return;
    const expired = () => {
      const returnTo = window.location.pathname + window.location.search;
      void navigate({ to: "/login", search: { returnTo, expired: true } });
    };
    window.addEventListener("kurio:session-expired", expired);
    return () => window.removeEventListener("kurio:session-expired", expired);
  }, [isAuth, navigate]);
  const goToLogin = () => void navigate({ to: "/login", search: { returnTo: window.location.pathname + window.location.search, expired: false } });
  const leaveAccount = () => {
    setSignOutError("");
    signOut.mutate(undefined, {
      onSuccess: () => { if (isFavorites || isCheckout || isOrder || isAccount) void navigate({ to: "/" }); },
      onError: () => setSignOutError("Não foi possível sair. Tente novamente."),
    });
  };
  const mobileQuery = new URLSearchParams(searchStr).get("q") ?? "";

  return (
    <div className={`app-shell${isDetail ? " app-shell--detail" : ""}${isAuth ? " app-shell--auth" : ""}${isCart ? " app-shell--cart" : ""}${isCheckout ? " app-shell--checkout" : ""}${isOrder ? " app-shell--order" : ""}`}>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" to="/" aria-label="Kurio — início">
            KURIO
          </Link>

          <nav className="desktop-nav" aria-label="Navegação principal">
            <Link className="desktop-nav__link" to="/" activeOptions={{ exact: true }} aria-current={isHome || isAccount ? "page" : undefined}>
              Início
            </Link>
            {primarySections.map((section) => section === "Mercado" ? <a className="desktop-nav__link" href="/#catalogo" key={section} aria-current={isDetail || isCart || isCheckout ? "page" : undefined}>Mercado</a> : <span className="desktop-nav__link" key={section}>{section}</span>)}
          </nav>

          <div className="desktop-actions" aria-label="Ações da conta">
            <button className="icon-button" type="button" aria-label="Buscar" onClick={() => window.dispatchEvent(new Event("kurio:catalog-search-focus"))}>
              <MagnifyingGlass aria-hidden="true" size={23} weight="regular" />
            </button>
            <Link className="icon-button cart-button" to="/cart" aria-label={`Carrinho: ${cartCount} ${cartCount === 1 ? "item" : "itens"}`}>
              <ShoppingCart aria-hidden="true" size={23} weight="regular" />
              {cartCount > 0 && <span className="cart-count" aria-hidden="true">{cartCount}</span>}
            </Link>
            {session.data?.user && <Link className="icon-button" to="/profile" aria-label="Meu perfil"><UserCircle aria-hidden="true" size={23} /></Link>}
            <button className="sign-in-button" type="button" onClick={session.data?.user ? leaveAccount : goToLogin} disabled={signOut.isPending}>
              <SignIn aria-hidden="true" size={18} weight="regular" />
              {session.data?.user ? "Sair" : "Entrar"}
            </button>
          </div>

          <div className="mobile-search" role="search">
            <label className="mobile-search__field">
              <MagnifyingGlass aria-hidden="true" size={18} />
              <input
                aria-label="Explorar coleções"
                onChange={(event) => window.dispatchEvent(new CustomEvent("kurio:catalog-search", { detail: event.target.value }))}
                placeholder="Explorar coleções"
                type="search"
                value={mobileQuery}
              />
            </label>
            <button className="mobile-search__filter" type="button" aria-label="Filtros" onClick={() => window.dispatchEvent(new Event("kurio:catalog-filter-toggle"))}>
              <SlidersHorizontal aria-hidden="true" size={20} />
            </button>
          </div>
        </div>
      </header>
      {signOutError && <p className="app-shell__account-error" role="alert">{signOutError}</p>}

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="footer-highlights">
            <section className="footer-highlight">
              <span className="footer-highlight__mark" aria-hidden="true">W</span>
              <h2>Segurança da carteira</h2>
              <p>Proteja sua carteira e colecione arte digital verificada com confiança.</p>
            </section>
            <section className="footer-highlight">
              <span className="footer-highlight__mark" aria-hidden="true">C</span>
              <h2>Criadores em destaque</h2>
              <p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p>
            </section>
            <section className="footer-highlight">
              <span className="footer-highlight__mark" aria-hidden="true">D</span>
              <h2>Alertas de lançamentos</h2>
              <p>Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.</p>
            </section>
            <section className="footer-newsletter" aria-labelledby="newsletter-title">
              <h2 id="newsletter-title">Antecipe-se ao próximo lançamento</h2>
              <form className="footer-newsletter__form">
                <label className="sr-only" htmlFor="newsletter-email">Seu e-mail</label>
                <input id="newsletter-email" type="email" placeholder="digite seu e-mail..." disabled />
                <button type="submit" disabled>Enviar</button>
              </form>
              <p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
            </section>
          </div>

          <div className="footer-contact">
            <Link className="brand" to="/" aria-label="Kurio — início">KURIO</Link>
            <p>Feito para colecionadores,<br />criadores e cultura</p>
            <a href="mailto:contato@email.com">contato@email.com</a>
            <a href="tel:+551140028922">+55 11 4002 8922</a>
          </div>

          <div className="footer-links">
            <section className="footer-link-group">
              <h2>Meu perfil</h2>
              <Link to="/profile">Meu perfil</Link>
              <span>Minha coleção</span>
              <span>Atividade</span>
              <span>Estúdio do criador</span>
              <span>Lista de interesse</span>
            </section>
            <section className="footer-link-group">
              <h2>Central de ajuda</h2>
              <span>Central de ajuda</span>
              <span>Como comprar NFTs</span>
              <span>Carteira e segurança</span>
              <span>Política do mercado</span>
              <span>Denunciar item</span>
            </section>
            <section className="footer-link-group">
              <h2>Coleções</h2>
              <span>Arte digital</span>
              <span>Fotografia</span>
              <span>Música</span>
              <span>Arte 3D</span>
              <span>Utilidade</span>
            </section>
            <section className="footer-link-group footer-social">
              <h2>Redes sociais</h2>
              <div className="footer-social__icons" aria-label="Redes sociais">
                <button type="button" disabled aria-label="Facebook"><FacebookLogo aria-hidden="true" size={18} weight="fill" /></button>
                <button type="button" disabled aria-label="Instagram"><InstagramLogo aria-hidden="true" size={18} weight="regular" /></button>
                <button type="button" disabled aria-label="Twitter"><TwitterLogo aria-hidden="true" size={18} weight="fill" /></button>
                <button type="button" disabled aria-label="LinkedIn"><LinkedinLogo aria-hidden="true" size={18} weight="fill" /></button>
                <button type="button" disabled aria-label="YouTube"><YoutubeLogo aria-hidden="true" size={18} weight="fill" /></button>
              </div>
              <h2 className="footer-social__wallet-heading">Carteiras compatíveis</h2>
              <span className="footer-wallets">METAMASK&nbsp; · &nbsp;WALLETCONNECT&nbsp; · &nbsp;COINBASE</span>
            </section>
          </div>

          <small className="footer-copyright">© 2026 Kurio. Propriedade digital para todos.</small>
        </div>
      </footer>

      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        <Link className={`mobile-bottom-nav__item${isHome ? " is-active" : ""}`} to="/" activeOptions={{ exact: true }} aria-label="Início" aria-current={isHome ? "page" : undefined}>
          <House aria-hidden="true" size={22} weight="fill" />
        </Link>
        <Link className={`mobile-bottom-nav__item${isFavorites ? " is-active" : ""}`} to="/favorites" aria-label="Favoritos" aria-current={isFavorites ? "page" : undefined}>
          <Heart aria-hidden="true" size={22} weight="regular" />
        </Link>
        <button className="mobile-bottom-nav__item mobile-bottom-nav__scanner" type="button" disabled aria-label="Ler código">
          <Scan aria-hidden="true" size={30} weight="regular" />
        </button>
        <Link className={`mobile-bottom-nav__item${isCart ? " is-active" : ""}`} to="/cart" aria-label={`Carrinho: ${cartCount} ${cartCount === 1 ? "item" : "itens"}`} aria-current={isCart ? "page" : undefined}>
          <ShoppingCart aria-hidden="true" size={22} weight="regular" />
        </Link>
        {session.data?.user ? <Link className={`mobile-bottom-nav__item${isAccount ? " is-active" : ""}`} to="/profile" aria-label="Meu perfil" aria-current={isAccount ? "page" : undefined}><UserCircle aria-hidden="true" size={22} weight="regular" /></Link> :
          <button className="mobile-bottom-nav__item" type="button" aria-label="Entrar na conta" onClick={goToLogin}><UserCircle aria-hidden="true" size={22} weight="regular" /></button>}
      </nav>
    </div>
  );
}
