import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Terminal, LockKey } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Authenticated");
      nav("/admin");
    } catch {
      toast.error(t("login_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6 py-10 relative">
      <div
        className="absolute inset-0 -z-10 opacity-20 pointer-events-none"
        style={{
          backgroundImage: "url('https://images.pexels.com/photos/28122495/pexels-photo-28122495.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "grayscale(0.5) contrast(1.1)",
        }}
      />
      <form
        onSubmit={onSubmit}
        data-testid="login-form"
        className="bento-card p-8 w-full max-w-md relative"
      >
        <div className="terminal-header">
          <span className="terminal-dot bg-[#DC2626]" />
          <span className="terminal-dot bg-[#EAB308]" />
          <span className="terminal-dot bg-[#22C55E]" />
          <span className="ml-2 text-white/40 text-[10px] uppercase tracking-widest">
            /auth/login
          </span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Terminal size={20} weight="bold" className="text-[#00E5FF]" />
          <h1 className="font-display font-black text-2xl tracking-tighter">
            {t("login")}
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-caps block mb-2">{t("username")}</label>
            <Input
              data-testid="login-username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="bg-black border-white/10 text-white font-mono h-11 rounded-none"
              required
            />
          </div>
          <div>
            <label className="label-caps block mb-2">{t("password")}</label>
            <Input
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="bg-black border-white/10 text-white font-mono h-11 rounded-none"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit-btn"
            className="w-full h-11 rounded-none bg-[#00E5FF] hover:bg-white text-black font-mono uppercase tracking-widest text-xs"
          >
            <LockKey size={14} className="mr-2" weight="bold" />
            {loading ? "..." : t("login")}
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-[10px] uppercase tracking-widest text-white/30">
          {t("admin_only")}
        </div>
      </form>
    </div>
  );
}
