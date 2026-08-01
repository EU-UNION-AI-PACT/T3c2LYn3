import React, { useState } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { api } from "../api";
import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowClockwise, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function Admin() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  if (!user) return <Navigate to="/login" replace />;

  const trigger = async () => {
    setBusy(true);
    try {
      const r = await api.adminRefresh();
      toast.success(`OK · ${r.data.tools_count} tools · ${r.data.generated_at_berlin}`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Refresh failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      <div className="label-caps text-[#00E5FF]">/admin</div>
      <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tighter mt-1 mb-6">
        Admin Control
      </h1>

      <div className="bento-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={20} weight="fill" className="text-[#22C55E]" />
          <span className="font-mono text-sm text-white">{user}</span>
          <span className="tag badge-success">AUTHENTICATED</span>
        </div>
        <p className="text-white/60 text-sm mb-6">
          Der Feed wird automatisch täglich um 08:44 Uhr (Europe/Berlin) aktualisiert.
          Zusätzlich kannst du hier eine manuelle Neu-Aggregation aus allen aktiven Quellen anstoßen.
        </p>

        <Button
          onClick={trigger}
          disabled={busy}
          data-testid="admin-refresh-btn"
          className="rounded-none h-12 px-6 bg-[#EAB308] hover:bg-white text-black font-mono uppercase tracking-widest text-xs"
        >
          <ArrowClockwise size={16} className={`mr-2 ${busy ? "animate-spin" : ""}`} weight="bold" />
          {busy ? t("refreshing") : t("trigger_refresh")}
        </Button>
      </div>
    </div>
  );
}
