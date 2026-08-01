import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { useI18n } from "../i18n";
import StatusWidget from "../components/StatusWidget";
import SourcesMarquee from "../components/SourcesMarquee";
import ToolModal from "../components/ToolModal";
import { MagnifyingGlass, CaretRight, Sparkle, ArrowClockwise } from "@phosphor-icons/react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function Dashboard() {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");

  const feed = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.feedLatest().then((r) => r.data),
    refetchInterval: 60_000,
  });
  const status = useQuery({
    queryKey: ["status"],
    queryFn: () => api.feedStatus().then((r) => r.data),
    refetchInterval: 30_000,
  });
  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories().then((r) => r.data),
    refetchInterval: 120_000,
  });
  const catalog = useQuery({
    queryKey: ["catalog-preview"],
    queryFn: () => api.sourcesCatalog({ limit: 60 }).then((r) => r.data),
  });

  const tools = feed.data?.tools || [];
  const filtered = useMemo(() => {
    let r = tools;
    if (cat !== "all") r = r.filter((x) => x.category === cat);
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((x) => (x.name + " " + x.description).toLowerCase().includes(q));
    }
    return r;
  }, [tools, cat, query]);

  return (
    <div className="min-h-screen">
      <SourcesMarquee items={catalog.data?.items || []} catalogTotal={status.data?.total_catalog || 1111} />

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 bento-card p-8">
            <div className="label-caps text-[#00E5FF] mb-3">{t("top_of_top")}</div>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-none">
              {t("tools_top50")}
            </h1>
            <p className="mt-3 text-white/60 text-sm">{t("thousand_eleven")}</p>
            <p className="mt-1 text-white/40 text-xs">{t("portal_subtitle")}</p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button
                data-testid="filter-cat-all"
                onClick={() => setCat("all")}
                variant="outline"
                className={`rounded-none border text-xs uppercase tracking-widest h-8 ${cat === "all" ? "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5" : "border-white/10 text-white/60 bg-transparent hover:bg-white/5 hover:text-white"}`}
              >
                {t("all_categories")} · {tools.length}
              </Button>
              {(cats.data?.categories || []).map((c) => (
                <Button
                  key={c.name}
                  data-testid={`filter-cat-${c.name}`}
                  onClick={() => setCat(c.name)}
                  variant="outline"
                  className={`rounded-none border text-xs uppercase tracking-widest h-8 ${cat === c.name ? "border-[#EAB308] text-[#EAB308] bg-[#EAB308]/5" : "border-white/10 text-white/60 bg-transparent hover:bg-white/5 hover:text-white"}`}
                >
                  {c.name} · {c.count}
                </Button>
              ))}
            </div>
          </div>
          <StatusWidget status={status.data} />
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input
              data-testid="search-input"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 bg-black border-white/10 text-white font-mono text-xs rounded-none focus-visible:ring-1 focus-visible:ring-[#00E5FF]"
            />
          </div>
          <span className="label-caps">
            {filtered.length} / {tools.length}
          </span>
        </div>

        {/* Tools Table */}
        <div className="bento-card overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 label-caps">
            <div className="col-span-1">#{t("rank")}</div>
            <div className="col-span-4">Tool</div>
            <div className="col-span-2">{t("category")}</div>
            <div className="col-span-3 hidden md:block">{t("sources")}</div>
            <div className="col-span-1 text-right">{t("score")}</div>
            <div className="col-span-1"></div>
          </div>

          {feed.isLoading || tools.length === 0 ? (
            <div className="p-10 text-center text-white/50 text-sm font-mono" data-testid="loading-feed">
              <ArrowClockwise className="inline animate-spin mr-2" size={16} />
              {t("no_tools")}
            </div>
          ) : (
            filtered.map((tool, i) => (
              <motion.div
                key={tool.id || tool.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.3 }}
                data-testid={`tool-row-${tool.rank}`}
                onClick={() => setSelected(tool)}
                className="data-row grid grid-cols-12 gap-4 px-6 py-4 cursor-pointer items-center"
              >
                <div className="col-span-1 rank-badge">{String(tool.rank).padStart(2, "0")}</div>
                <div className="col-span-4">
                  <div className="font-mono text-sm text-white font-medium truncate flex items-center gap-2">
                    {tool.validated && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />}
                    {tool.name}
                  </div>
                  <div className="text-xs text-white/40 truncate mt-0.5">
                    {(lang === "de" ? tool.ai_summary_de : tool.ai_summary_en) || tool.description || "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="tag badge-cyan">{tool.category}</span>
                </div>
                <div className="col-span-3 hidden md:flex flex-wrap gap-1">
                  {(tool.sources || [tool.source]).slice(0, 2).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                  {(tool.sources || []).length > 2 && (
                    <span className="tag">+{(tool.sources || []).length - 2}</span>
                  )}
                </div>
                <div className="col-span-1 text-right font-mono text-sm text-[#EAB308]">
                  {Math.round(tool.normalized_score || 0)}
                </div>
                <div className="col-span-1 text-right">
                  <CaretRight size={14} className="inline text-white/40" />
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-8 flex items-center justify-between text-[10px] tracking-widest uppercase text-white/40">
          <span className="flex items-center gap-2">
            <Sparkle size={12} className="text-[#EAB308]" weight="fill" />
            {t("footer_text")}
          </span>
          <span data-testid="footer-generated">
            {t("last_generated")}: {feed.data?.generated_at_berlin || "—"}
          </span>
        </div>
      </div>

      <ToolModal tool={selected} open={!!selected} onClose={() => setSelected(null)} lang={lang} />
    </div>
  );
}
