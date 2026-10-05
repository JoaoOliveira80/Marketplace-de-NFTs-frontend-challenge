import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClockCounterClockwise, DownloadSimple, Heart, SignOut, Tag, UserCircle, Wallet, WarningCircle } from "@phosphor-icons/react";
import { useSignOut } from "@/features/auth/auth-api";

export function AccountShell({ section, children }: { section: "profile" | "wallets"; children: ReactNode }) {
  const navigate = useNavigate();
  const signOut = useSignOut();
  return <div className="account-page">
    <aside className="account-sidebar" aria-label="Meu perfil">
      <h1>Meu perfil</h1>
      <nav aria-label="Seções da conta">
        <Link className={section === "profile" ? "is-active" : ""} to="/profile" aria-current={section === "profile" ? "page" : undefined}><UserCircle size={20} />Dados do perfil</Link>
        <Link className={section === "wallets" ? "is-active" : ""} to="/wallets" aria-current={section === "wallets" ? "page" : undefined}><Wallet size={20} />Carteiras</Link>
        <span aria-disabled="true"><ClockCounterClockwise size={20} />Atividade</span>
        <Link to="/favorites"><Heart size={20} />Lista de interesse</Link>
        <span aria-disabled="true"><Tag size={20} />Ofertas</span>
        <span aria-disabled="true"><DownloadSimple size={20} />Arquivos baixados</span>
        <span aria-disabled="true"><WarningCircle size={20} />Suporte</span>
        <button type="button" onClick={() => signOut.mutate(undefined, { onSuccess: () => void navigate({ to: "/" }) })} disabled={signOut.isPending}><SignOut size={20} />Sair</button>
      </nav>
      {signOut.isError && <p role="alert">Não foi possível sair. Tente novamente.</p>}
    </aside>
    <div className="account-content">{children}</div>
  </div>;
}
