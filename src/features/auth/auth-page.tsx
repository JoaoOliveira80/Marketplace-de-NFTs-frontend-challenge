import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { Link } from "@tanstack/react-router";
import { Eye, EyeSlash, FacebookLogo, GoogleLogo } from "@phosphor-icons/react";
import { catalogCategories, catalogNfts } from "@/features/catalog/catalog-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegister, useSignIn, type ApiFormError } from "./auth-api";
import { NftImage } from "@/components/nft-image";

type Mode = "login" | "register";
type Field = "name" | "email" | "password" | "confirmPassword";

export function AuthPage({ mode, returnTo, expired }: { mode: Mode; returnTo: string; expired: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const signIn = useSignIn();
  const register = useRegister();
  const pending = signIn.isPending || register.isPending;


  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<Field, string>> = {};
    if (mode === "register" && !/^[\p{L}\p{N}_ ]{3,24}$/u.test(name.trim())) errors.name = "Use de 3 a 24 letras, números, espaços ou _.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Informe um e-mail válido.";
    if (mode === "register" && (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))) {
      errors.password = "Use 8 caracteres ou mais, com maiúscula, minúscula e número.";
    }
    if (mode === "login" && !password) errors.password = "Informe sua senha.";
    if (mode === "register" && password !== confirmPassword) errors.confirmPassword = "As senhas não coincidem.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      requestAnimationFrame(() => document.getElementById(`auth-${first}`)?.focus());
      return;
    }

    const onSuccess = () => { setPassword(""); setConfirmPassword(""); window.location.assign(returnTo); };
    const onError = (reason: unknown) => {
      const response = isAxiosError<ApiFormError>(reason) ? reason.response?.data : undefined;
      setFieldErrors(response?.fields ?? {});
      setFormError(response?.message ?? "Não foi possível concluir. Tente novamente.");
      const first = Object.keys(response?.fields ?? {})[0];
      if (first) requestAnimationFrame(() => document.getElementById(`auth-${first}`)?.focus());
    };
    if (mode === "register") register.mutate({ name: name.trim(), email: email.trim(), password, confirmPassword }, { onSuccess, onError });
    else signIn.mutate({ email: email.trim(), password }, { onSuccess, onError });
  };

  const field = (key: Field, label: string, value: string, onChange: (value: string) => void, type = "text") =>
    <div className="auth-field">
      <label htmlFor={`auth-${key}`}>{label}</label>
      <div className="auth-field__control">
        <Input
          autoFocus={key === (mode === "register" ? "name" : "email")}
          id={`auth-${key}`}
          type={type === "password" && passwordVisible ? "text" : type}
          value={value}
          onChange={(event) => { onChange(event.target.value); setFieldErrors((current) => ({ ...current, [key]: undefined })); setFormError(""); }}
          aria-invalid={Boolean(fieldErrors[key])}
          aria-describedby={fieldErrors[key] ? `auth-${key}-error` : undefined}
          autoComplete={key === "email" ? "email" : key === "name" ? "username" : key === "password" ? (mode === "register" ? "new-password" : "current-password") : "new-password"}
          placeholder={label}
        />
        {type === "password" && <button type="button" aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeSlash size={18} /> : <Eye size={18} />}</button>}
      </div>
      {fieldErrors[key] && <span id={`auth-${key}-error`} className="auth-field__error">{fieldErrors[key]}</span>}
    </div>;

  return <section className="auth-page" aria-labelledby="auth-heading">
    <div className="auth-page__preview" aria-hidden="true">
      <div className="auth-page__hero"><div><span>Bem-vindo à Kurio</span><h2>SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</h2><p>Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital verificada.</p><span className="auth-page__explore">EXPLORAR</span></div><NftImage image="/nfts/emerald-ape.png" alt="" sizes="(max-width: 640px) 40vw, 25vw" /></div>
      <div className="auth-page__catalog">
        <div className="auth-page__filters"><strong>Coleções</strong>{catalogCategories.map((category) => <span key={category}>{category}<b>({catalogNfts.filter((nft) => nft.category === category).length})</b></span>)}<strong>Faixa de preço</strong><div className="auth-page__price-track" /><small>Preço: 0,02 – 12,30 ETH</small><span className="auth-page__apply">Aplicar</span><strong>Rede</strong><span>Ethereum</span><span>Polygon</span><span>Solana</span></div>
        <div className="auth-page__catalog-main"><div className="auth-page__catalog-toolbar"><span>Todos os NFTs&nbsp; Novos lançamentos&nbsp; Em alta</span><span>Ordenar por: Listados recentemente</span></div><div className="auth-page__catalog-grid">{catalogNfts.slice(0, 9).map((nft) => <div className="auth-page__catalog-card" key={nft.id}><div><NftImage image={nft.image} alt="" sizes="(max-width: 640px) 30vw, 16vw" /></div><span>{nft.name} #{nft.tokenId}</span><strong>{nft.priceEth} ETH</strong></div>)}</div></div>
      </div>
    </div>
    <div className="auth-page__panel">
      <Link className="auth-page__close" to="/" aria-label="Fechar">×</Link>
      <Link className="auth-page__brand" to="/">KURIO</Link>
      <div className="auth-page__mode-links"><Link to="/login" search={{ returnTo, expired: false }} aria-current={mode === "login" ? "page" : undefined}>Entrar</Link><span>|</span><Link to="/register" search={{ returnTo, expired: false }} aria-current={mode === "register" ? "page" : undefined}>Criar conta</Link></div>
      <h1 id="auth-heading">{mode === "login" ? "Entrar" : "Criar perfil de colecionador"}</h1>
      <p className="auth-page__description">{mode === "login" ? "Entre para gerenciar sua carteira, coleção e perfil de criador." : "Crie seu perfil de colecionador e conecte uma carteira quando quiser."}</p>
      {expired && <p className="auth-page__expired" role="alert">Sua sessão expirou. Entre novamente para continuar.</p>}
      <form noValidate onSubmit={onSubmit}>
        {mode === "register" && field("name", "Nome de usuário", name, setName)}
        {field("email", "Digite seu e-mail", email, setEmail, "email")}
        {field("password", "Senha", password, setPassword, "password")}
        {mode === "register" && field("confirmPassword", "Confirmar senha", confirmPassword, setConfirmPassword, "password")}
        {formError && <p className="auth-page__form-error" role="alert">{formError}</p>}
        {mode === "login" && <span className="auth-page__forgot">Esqueceu a senha?</span>}
        <Button className="auth-page__submit" type="submit" disabled={pending}>{pending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</Button>
      </form>
      <div className="auth-page__social"><span>Ou continue com</span><button type="button" disabled><GoogleLogo size={17} weight="bold" />Continuar com Google</button><button type="button" disabled><FacebookLogo size={17} weight="fill" />Continuar com Facebook</button></div>
      <p className="auth-page__switch">{mode === "login" ? "Novo na Kurio?" : "Já tem uma conta?"} <Link to={mode === "login" ? "/register" : "/login"} search={{ returnTo, expired: false }}>{mode === "login" ? "Crie uma conta" : "Entre"}</Link></p>
      {mode === "login" && <p className="auth-page__demo">Demonstração: nova@kurio.dev ou sam@kurio.dev / Kurio123!</p>}
    </div>
  </section>;
}
