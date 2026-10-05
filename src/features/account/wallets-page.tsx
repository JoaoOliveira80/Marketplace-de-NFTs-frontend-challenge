import { useState, type ChangeEvent, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { sessionQueryOptions, type ApiFormError } from "@/features/auth/auth-api";
import { walletsQueryOptions, type SavedWallet, type WalletNetwork, type WalletProvider, type WalletState } from "@/features/checkout/checkout-api";
import { AccountShell } from "./account-shell";
import { profileQueryOptions, useSecondaryPreference, useWalletSave, type CollectorProfile, type WalletFormInput } from "./account-api";

const networks: WalletNetwork[] = ["Ethereum", "Polygon", "Solana"];
const providers: WalletProvider[] = ["MetaMask", "WalletConnect", "Coinbase Wallet"];

function initialForm(wallet: SavedWallet | undefined, profile: CollectorProfile): WalletFormInput {
  return {
    displayName: wallet?.displayName ?? profile.displayName,
    nickname: wallet?.name ?? profile.walletNickname,
    network: wallet?.network ?? "", profileName: wallet?.profileName ?? profile.displayName,
    address: wallet?.address ?? "", secondaryAddress: wallet?.secondaryAddress ?? "",
    provider: wallet?.provider ?? "", referralCode: wallet?.referralCode ?? "",
    email: wallet?.email ?? profile.email, ensName: wallet?.ensName ?? profile.ensName,
  };
}

function WalletEditor({ slot, wallet, profile, userId, onSaved }: { slot: "primary" | "secondary"; wallet?: SavedWallet; profile: CollectorProfile; userId: string; onSaved?: () => void }) {
  const [form, setForm] = useState<WalletFormInput>(() => initialForm(wallet, profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const save = useWalletSave(userId);
  const prefix = `wallet-${slot}-`;
  const change = (key: keyof WalletFormInput) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" })); setMessage("");
  };
  const input = (key: keyof WalletFormInput, label: string, placeholder = "") =>
    <label className="account-field" htmlFor={`${prefix}${key}`}><span>{label} <b>*</b></span><input id={`${prefix}${key}`} value={form[key]} onChange={change(key)} placeholder={placeholder} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${prefix}${key}-error` : undefined} />{errors[key] && <small id={`${prefix}${key}-error`}>{errors[key]}</small>}</label>;
  const select = (key: "network" | "provider", label: string, options: string[], placeholder: string) =>
    <label className="account-field" htmlFor={`${prefix}${key}`}><span>{label} <b>*</b></span><select id={`${prefix}${key}`} value={form[key]} onChange={change(key)} aria-invalid={Boolean(errors[key])}><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select>{errors[key] && <small>{errors[key]}</small>}</label>;
  const onSubmit = (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    const fields: Record<string, string> = {};
    for (const key of ["displayName", "nickname", "network", "profileName", "address", "provider", "referralCode", "email", "ensName"] as const) {
      if (!form[key].trim()) fields[key] = "Campo obrigatório.";
    }
    if (Object.keys(fields).length) { setErrors(fields); document.getElementById(`${prefix}${Object.keys(fields)[0]}`)?.focus(); return; }
    save.mutate({ slot, input: form }, {
      onSuccess: () => { setErrors({}); setMessage("Carteira salva."); onSaved?.(); },
      onError: (error) => {
        const data = isAxiosError<ApiFormError>(error) ? error.response?.data : undefined;
        setErrors(data?.fields ?? {}); setMessage(data?.message ?? "Não foi possível salvar a carteira.");
        const first = Object.keys(data?.fields ?? {})[0];
        if (first) requestAnimationFrame(() => document.getElementById(`${prefix}${first}`)?.focus());
      },
    });
  };

  return <form className="account-form account-wallet-form" onSubmit={onSubmit} noValidate>
    {input("displayName", "Nome de exibição")}{input("nickname", "Apelido da carteira")}
    {select("network", "Rede", networks, "Selecione uma rede")}{input("profileName", "Nome do perfil")}
    {input("address", "Endereço da carteira", "Endereço 0x da carteira")}
    <label className="account-field" htmlFor={`${prefix}secondaryAddress`}><span>Endereço secundário (opcional)</span><input id={`${prefix}secondaryAddress`} value={form.secondaryAddress} onChange={change("secondaryAddress")} placeholder="ENS ou carteira secundária (opcional)" aria-invalid={Boolean(errors.secondaryAddress)} />{errors.secondaryAddress && <small>{errors.secondaryAddress}</small>}</label>
    {select("provider", "Tipo de carteira", providers, "Selecione uma carteira")}{input("referralCode", "Código de indicação")}
    {input("email", "E-mail")}
    <label className="account-field" htmlFor={`${prefix}ensName`}><span>Nome ENS <b>*</b></span><div className="account-field__ens"><span>.eth</span><input id={`${prefix}ensName`} value={form.ensName} onChange={change("ensName")} aria-invalid={Boolean(errors.ensName)} /></div>{errors.ensName && <small>{errors.ensName}</small>}</label>
    {message && <p className={save.isError ? "account-feedback is-error" : "account-feedback"} role="status">{message}</p>}
    <button className="account-submit" type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar carteira"}</button>
  </form>;
}

function WalletsContent({ userId, profile, wallets }: { userId: string; profile: CollectorProfile; wallets: WalletState }) {
  const preference = useSecondaryPreference(userId);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const primary = wallets.wallets.find((wallet) => wallet.id === "primary");
  const secondary = wallets.wallets.find((wallet) => wallet.id !== "primary");
  return <AccountShell section="wallets">
    <section className="account-wallet-section"><div className="account-section-heading"><h2>Carteira principal</h2><button type="button" onClick={() => document.getElementById("wallet-primary-displayName")?.focus()}>{primary ? "Editar" : "Adicionar"}</button></div>
      <p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
      <WalletEditor key={`primary-${primary?.id ?? "new"}`} slot="primary" wallet={primary} profile={profile} userId={userId} />
    </section>
    <section className="account-wallet-section account-wallet-section--secondary"><div className="account-section-heading"><h2>Carteira secundária</h2><div className="account-secondary-actions"><label className="account-wallet-same"><input type="checkbox" checked={Boolean(wallets.secondaryUsesPrimary)} disabled={preference.isPending} onChange={(event) => preference.mutate(event.target.checked)} />Igual à carteira principal</label><button type="button" onClick={() => setSecondaryOpen((value) => !value)}>{secondaryOpen ? "Fechar" : secondary ? "Editar" : "Adicionar"}</button></div></div>
      <p>{secondary ? `${secondary.name} · ${secondary.address} · ${secondary.network}` : "Você ainda não adicionou uma carteira secundária."}</p>
      {preference.isError && <p className="account-feedback is-error" role="alert">Não foi possível atualizar a preferência.</p>}
      {secondaryOpen && <WalletEditor key={`secondary-${secondary?.id ?? "new"}`} slot="secondary" wallet={secondary} profile={profile} userId={userId} onSaved={() => setSecondaryOpen(false)} />}
    </section>
  </AccountShell>;
}

export function WalletsPage() {
  const session = useQuery(sessionQueryOptions);
  const userId = session.data?.user?.id ?? "";
  const profile = useQuery({ ...profileQueryOptions(userId), enabled: Boolean(userId) });
  const wallets = useQuery({ ...walletsQueryOptions(userId), enabled: Boolean(userId) });
  if (profile.isPending || wallets.isPending) return <div className="account-page" role="status">Carregando carteiras...</div>;
  if (profile.isError) return <div className="account-page" role="alert">Não foi possível carregar o perfil. <button onClick={() => void profile.refetch()}>Tentar novamente</button></div>;
  if (wallets.isError) return <div className="account-page" role="alert">Não foi possível carregar as carteiras. <button onClick={() => void wallets.refetch()}>Tentar novamente</button></div>;
  return <WalletsContent userId={userId} profile={profile.data} wallets={wallets.data} />;
}
