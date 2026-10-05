import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeSlash, Image as ImageIcon } from "@phosphor-icons/react";
import { sessionQueryOptions, type ApiFormError } from "@/features/auth/auth-api";
import { AccountShell } from "./account-shell";
import { profileQueryOptions, useProfileActions, type CollectorProfile, type PasswordInput } from "./account-api";

function ProfileForm({ userId, initial }: { userId: string; initial: CollectorProfile }) {
  const [profile, setProfile] = useState(initial);
  const savedProfile = useRef(initial);
  const [password, setPassword] = useState<PasswordInput>({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const actions = useProfileActions(userId);

  const change = (key: keyof CollectorProfile) => (event: ChangeEvent<HTMLInputElement>) => {
    setProfile((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setMessage("");
  };
  const field = (key: "displayName" | "username" | "email" | "ensName" | "walletNickname", label: string, required = false) =>
    <label className="account-field" htmlFor={`profile-${key}`}><span>{label}{required && <b> *</b>}</span><input id={`profile-${key}`} type={key === "email" ? "email" : "text"} value={profile[key]} onChange={change(key)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `profile-${key}-error` : undefined} autoComplete={key === "email" ? "email" : undefined} />{errors[key] && <small id={`profile-${key}-error`}>{errors[key]}</small>}</label>;

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setMessageError(false);
    const profileChanged = JSON.stringify(profile) !== JSON.stringify(savedProfile.current);
    const passwordChanged = Object.values(password).some(Boolean);
    if (!profileChanged && !passwordChanged) { setMessage("Nenhuma alteração para salvar."); return; }
    const fields: Record<string, string> = {};
    if (profileChanged) {
      if (profile.displayName.trim().length < 2) fields.displayName = "Informe o nome de exibição.";
      if (!/^[\p{L}\p{N}_]{3,24}$/u.test(profile.username.trim())) fields.username = "Use de 3 a 24 letras, números ou _.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) fields.email = "Informe um e-mail válido.";
      if (!/^[a-z0-9.-]{3,63}$/i.test(profile.ensName.trim())) fields.ensName = "Informe um nome ENS válido, sem .eth.";
      if (profile.walletNickname.trim().length < 2) fields.walletNickname = "Informe o apelido da carteira.";
    }
    if (passwordChanged) {
      if (!password.currentPassword) fields.currentPassword = "Informe a senha atual.";
      if (!password.newPassword) fields.newPassword = "Informe a nova senha.";
      if (password.newPassword !== password.confirmPassword) fields.confirmPassword = "As senhas não coincidem.";
    }
    if (Object.keys(fields).length) { setErrors(fields); document.getElementById(`profile-${Object.keys(fields)[0]}`)?.focus(); return; }
    if (profileChanged) {
      try {
        const data = await actions.update.mutateAsync(profile);
        savedProfile.current = data;
        setProfile(data);
      } catch (error) {
        const data = isAxiosError<ApiFormError>(error) ? error.response?.data : undefined;
        setErrors(data?.fields ?? {}); setMessage(data?.message ?? "Não foi possível salvar o perfil."); setMessageError(true);
        const first = Object.keys(data?.fields ?? {})[0];
        if (first) requestAnimationFrame(() => document.getElementById(`profile-${first}`)?.focus());
        return;
      }
    }
    if (passwordChanged) {
      try {
        await actions.changePassword.mutateAsync(password);
        setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (error) {
        const data = isAxiosError<ApiFormError>(error) ? error.response?.data : undefined;
        setErrors(data?.fields ?? {});
        setMessage(`${profileChanged ? "Perfil salvo, mas a senha não foi alterada. " : ""}${data?.message ?? "Não foi possível alterar a senha."}`);
        setMessageError(true);
        const first = Object.keys(data?.fields ?? {})[0];
        if (first) requestAnimationFrame(() => document.getElementById(`profile-${first}`)?.focus());
        return;
      }
    }
    setErrors({});
    setMessage(profileChanged && passwordChanged ? "Perfil e senha salvos." : profileChanged ? "Perfil salvo." : "Senha alterada.");
  };
  const onAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type)) || file.size > 500_000) {
      setErrors((current) => ({ ...current, avatar: "Use PNG, JPG ou WebP de até 500 KB." })); return;
    }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") { setProfile((current) => ({ ...current, avatar: reader.result as string })); setErrors((current) => ({ ...current, avatar: "" })); } };
    reader.readAsDataURL(file);
  };

  return <AccountShell section="profile"><h2>Perfil do colecionador</h2>
    <form className="account-profile-editor" onSubmit={(event) => void onSave(event)} noValidate>
      <div className="account-form account-profile-form">
      {field("displayName", "Nome de exibição", true)}{field("username", "Nome de usuário", true)}
      {field("email", "E-mail", true)}
      <label className="account-field" htmlFor="profile-ensName"><span>Nome ENS <b>*</b></span><div className="account-field__ens"><span>.eth</span><input id="profile-ensName" value={profile.ensName} onChange={change("ensName")} aria-invalid={Boolean(errors.ensName)} aria-describedby={errors.ensName ? "profile-ensName-error" : undefined} /></div>{errors.ensName && <small id="profile-ensName-error">{errors.ensName}</small>}</label>
      {field("walletNickname", "Apelido da carteira", true)}
      <div className="account-avatar"><span>Avatar</span><div><span className="account-avatar__preview">{profile.avatar ? <img src={profile.avatar} alt="Avatar atual" /> : <ImageIcon size={22} />}</span><label htmlFor="profile-avatar">Alterar<input id="profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} /></label><button type="button" onClick={() => { setProfile((current) => ({ ...current, avatar: null })); setMessage(""); }}>Remover</button></div>{errors.avatar && <small>{errors.avatar}</small>}</div>
      </div>
      <div className="account-password"><h2>Alterar senha</h2>
        {(["currentPassword", "newPassword", "confirmPassword"] as const).map((key) => <label className="account-field" key={key} htmlFor={`profile-${key}`}><span>{key === "currentPassword" ? "Senha atual" : key === "newPassword" ? "Nova senha" : "Confirmar nova senha"}</span><div className="account-field__password"><input id={`profile-${key}`} type={showPassword ? "text" : "password"} value={password[key]} onChange={(event) => { setPassword((current) => ({ ...current, [key]: event.target.value })); setErrors((current) => ({ ...current, [key]: "" })); setMessage(""); }} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `profile-${key}-error` : undefined} autoComplete={key === "currentPassword" ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}</button></div>{errors[key] && <small id={`profile-${key}-error`}>{errors[key]}</small>}</label>)}
      </div>
      {message && <p className={messageError ? "account-feedback is-error" : "account-feedback"} role="status">{message}</p>}
      <button className="account-submit" type="submit" disabled={actions.update.isPending || actions.changePassword.isPending}>{actions.update.isPending || actions.changePassword.isPending ? "Salvando..." : "Salvar"}</button>
    </form>
  </AccountShell>;
}

export function ProfilePage() {
  const session = useQuery(sessionQueryOptions);
  const userId = session.data?.user?.id ?? "";
  const profile = useQuery({ ...profileQueryOptions(userId), enabled: Boolean(userId) });
  if (profile.isPending) return <div className="account-page" role="status">Carregando perfil...</div>;
  if (profile.isError) return <div className="account-page" role="alert">Não foi possível carregar o perfil. <button onClick={() => void profile.refetch()}>Tentar novamente</button></div>;
  return <ProfileForm key={userId} userId={userId} initial={profile.data} />;
}
