import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useI18n } from "../i18n";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, MagnifyingGlass } from "@phosphor-icons/react";

export default function Sources() {
  const { t } = useI18n();
  const [activeOnly, setActiveOnly] = useState(false);
  const [q, setQ] = useState("");

  const catalog = useQuery({
    queryKey: ["sources-full", activeOnly],
    queryFn: () => api.sourcesCatalog({ limit: 1200, active_only: activeOnly }).then((r) => r.data),
  });

  const items = (catalog.data?.items || []).filter((s) =>
    !q ? true : (s.name + " " + s.category).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="label-caps text-[#00E5FF]">{t("sources_catalog")}</div>
        <h1 className="font-display font-black text-4xl lg:text-5xl tracking-tighter mt-1">
          {catalog.data?.total || 1111} <span className="text-[#EAB308]">SOURCES</span>
        </h1>
        <p className="text-white/60 text-sm mt-2">{t("catalog_desc")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <Input
            data-testid="sources-search"
            placeholder={t("search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-10 bg-black border-white/10 text-white font-mono text-xs rounded-none"
          />
        </div>
        <Button
          data-testid="toggle-active-only"
          onClick={() => setActiveOnly((p) => !p)}
          variant="outline"
          className={`rounded-none h-10 text-xs uppercase tracking-widest ${activeOnly ? "border-[#22C55E] text-[#22C55E] bg-[#22C55E]/5" : "border-white/10 text-white/60 bg-transparent"}`}
        >
          {activeOnly ? t("show_all") : t("show_active")}
        </Button>
        <span className="label-caps ml-auto">
          {items.length} · {catalog.data?.active} active · {catalog.data?.total} total
        </span>
      </div>

      <div className="bento-card">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 label-caps">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Source</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-2 hidden md:block">URL</div>
          <div className="col-span-1 text-right">Status</div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {items.map((s, i) => (
            <div key={i} className="data-row grid grid-cols-12 gap-4 px-6 py-2 items-center text-xs font-mono">
              <div className="col-span-1 text-white/40">{String(i + 1).padStart(4, "0")}</div>
              <div className="col-span-5 text-white truncate">{s.name}</div>
              <div className="col-span-3"><span className="tag">{s.category}</span></div>
              <div className="col-span-2 hidden md:block text-white/40 truncate">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#00E5FF]">
                  {s.url.replace(/^https?:\/\//, "").slice(0, 30)}
                </a>
              </div>
              <div className="col-span-1 text-right">
                {s.active ? (
                  <CheckCircle size={14} weight="fill" className="text-[#22C55E] inline" />
                ) : (
                  <XCircle size={14} weight="fill" className="text-white/20 inline" />
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-8 text-center text-white/40 text-sm">No matches.</div>
          )}
        </div>
      </div>
    </div>
  );
}
