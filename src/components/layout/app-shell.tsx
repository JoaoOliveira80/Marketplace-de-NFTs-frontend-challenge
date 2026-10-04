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
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const primarySections = ["Mercado", "Criadores", "Aprenda"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const isHome = pathname === "/";
  const mobileQuery = new URLSearchParams(searchStr).get("q") ?? "";

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" to="/" aria-label="Kurio — início">
            KURIO
          </Link>

          <nav className="desktop-nav" aria-label="Navegação principal">
            <Link className="desktop-nav__link" to="/" aria-current={isHome ? "page" : undefined}>
              Início
            </Link>
            {primarySections.map((section) => (
              <span className="desktop-nav__link" key={section}>
                {section}
              </span>
            ))}
          </nav>

          <div className="desktop-actions" aria-label="Ações da conta">
            <button className="icon-button" type="button" aria-label="Buscar" onClick={() => window.dispatchEvent(new Event("kurio:catalog-search-focus"))}>
              <MagnifyingGlass aria-hidden="true" size={23} weight="regular" />
            </button>
            <button className="icon-button cart-button" type="button" disabled aria-label="Carrinho: 6 itens no exemplo">
              <ShoppingCart aria-hidden="true" size={23} weight="regular" />
              <span className="cart-count" aria-hidden="true">6</span>
            </button>
            <button className="sign-in-button" type="button" disabled>
              <SignIn aria-hidden="true" size={18} weight="regular" />
              Entrar
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
              <span>Meu perfil</span>
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
        <Link className="mobile-bottom-nav__item is-active" to="/" aria-label="Início" aria-current={isHome ? "page" : undefined}>
          <House aria-hidden="true" size={22} weight="fill" />
        </Link>
        <button className="mobile-bottom-nav__item" type="button" disabled aria-label="Favoritos">
          <Heart aria-hidden="true" size={22} weight="regular" />
        </button>
        <button className="mobile-bottom-nav__item mobile-bottom-nav__scanner" type="button" disabled aria-label="Ler código">
          <Scan aria-hidden="true" size={30} weight="regular" />
        </button>
        <button className="mobile-bottom-nav__item" type="button" disabled aria-label="Carrinho">
          <ShoppingCart aria-hidden="true" size={22} weight="regular" />
        </button>
        <button className="mobile-bottom-nav__item" type="button" disabled aria-label="Conta">
          <UserCircle aria-hidden="true" size={22} weight="regular" />
        </button>
      </nav>
    </div>
  );
}
