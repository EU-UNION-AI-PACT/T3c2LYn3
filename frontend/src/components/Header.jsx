import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { useAuth } from "../auth";
import { Terminal, Translate, SignOut, User } from "@phosphor-icons/react";

export default function Header() {
  const { t, lang, toggle } = useI18n();
  const { user, logout } = useAuth();

  const navItems = [
    { to: "/", label: t("nav_dashboard"), testid: "nav-dashboard" },
    { to: "/sources", label: t("nav_sources"), testid: "nav-sources" },
    { to: "/timeline", label: t("nav_timeline"), testid: "nav-timeline" },
    { to: "/admin", label: t("nav_admin"), testid: "nav-admin" },
  ];

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10"
    >
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group" data-testid="brand-logo">
          <Terminal size={22} weight="bold" className="text-[#00E5FF]" />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-black text-sm tracking-tight text-white">
              SHINE_AI
            </span>
            <span className="text-[9px] tracking-[0.25em] text-white/40 uppercase">
              // ranking portal
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              end={n.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 text-xs tracking-[0.2em] uppercase transition-colors border-b-2 ${
                  isActive
                    ? "text-[#00E5FF] border-[#00E5FF]"
                    : "text-white/50 hover:text-white border-transparent"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            data-testid="language-toggle-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-white/40 hover:bg-white/5 text-xs font-mono uppercase tracking-widest"
          >
            <Translate size={14} />
            {lang.toUpperCase()}
          </button>
          {user ? (
            <>
              <span className="hidden md:flex items-center gap-1.5 px-2 py-1 border border-[#22C55E]/30 text-[#22C55E] text-[10px] tracking-widest uppercase">
                <User size={12} /> {user}
              </span>
              <button
                onClick={logout}
                data-testid="logout-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DC2626]/40 text-[#DC2626] hover:bg-[#DC2626]/10 text-xs uppercase tracking-widest"
              >
                <SignOut size={14} /> {t("logout")}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              data-testid="login-link"
              className="px-3 py-1.5 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF]/10 text-xs uppercase tracking-widest"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
