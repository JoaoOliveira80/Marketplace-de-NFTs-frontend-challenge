import { useEffect, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { X } from "@phosphor-icons/react";
import { useSignIn } from "./auth-api";

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const signIn = useSignIn();
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    emailRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const dialog = emailRef.current?.closest('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
      if (!focusable?.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    signIn.mutate({ email, password }, {
      onSuccess: () => { setPassword(""); onClose(); },
      onError: (reason) => setError(isAxiosError(reason) && reason.response?.status === 401 ? "E-mail ou senha inválidos." : "Não foi possível entrar. Tente novamente."),
    });
  };
  return <div className="auth-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-dialog__close" type="button" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
      <h2 id="auth-title">Entrar</h2>
      <p>Entre para salvar seus NFTs favoritos.</p>
      <form onSubmit={submit}>
        <label>E-mail<input ref={emailRef} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>
        {error && <p className="auth-dialog__error" role="alert">{error}</p>}
        <button type="submit" disabled={signIn.isPending}>{signIn.isPending ? "Entrando..." : "Entrar"}</button>
      </form>
      <p className="auth-dialog__demo">Acesso de demonstração: nova@kurio.dev / Kurio123!</p>
    </section>
  </div>;
}
