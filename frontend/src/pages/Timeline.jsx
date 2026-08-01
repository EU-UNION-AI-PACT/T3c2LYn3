import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useI18n } from "../i18n";
import { Clock } from "@phosphor-icons/react";

export default function Timeline() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["timeline"], queryFn: () => api.timeline().then((r) => r.data) });
  const items = q.data?.items || [];
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="label-caps text-[#00E5FF]">TIMELINE</div>
      <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tighter mt-1 mb-6">
        {t("timeline_title")}
      </h1>

      <div className="relative pl-8">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />
        {items.length === 0 && (
          <div className="text-white/40 text-sm">No history yet. First refresh runs on portal startup.</div>
        )}
        {items.map((it, i) => (
          <div key={it.id || i} className="relative mb-4 bento-card p-4" data-testid={`timeline-item-${i}`}>
            <span className="absolute -left-6 top-6 w-3 h-3 rounded-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
              <Clock size={12} className="text-[#EAB308]" />
              {it.generated_at_berlin}
            </div>
            <div className="mt-2 flex gap-6 text-xs font-mono">
              <span><span className="label-caps">{t("tools_count")}:</span> <span className="text-white">{it.tools_count}</span></span>
              <span><span className="label-caps">{t("sources_scanned")}:</span> <span className="text-[#22C55E]">{it.sources_active}</span></span>
              <span><span className="label-caps">{t("catalog_total")}:</span> <span className="text-[#EAB308]">{it.total_catalog}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
