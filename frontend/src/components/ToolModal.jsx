import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Copy, Download, CheckCircle, GithubLogo, ArrowSquareOut } from "@phosphor-icons/react";
import { useI18n } from "../i18n";
import { toast } from "sonner";
import { API } from "../api";

export default function ToolModal({ tool, open, onClose, lang }) {
  const { t } = useI18n();
  const [copiedFmt, setCopiedFmt] = useState("");
  if (!tool) return null;
  const scripts = tool.install_scripts || {};

  const doCopy = async (fmt) => {
    try {
      await navigator.clipboard.writeText(scripts[fmt] || "");
      setCopiedFmt(fmt);
      toast.success(t("copied"));
      setTimeout(() => setCopiedFmt(""), 1600);
    } catch {
      toast.error("Clipboard blocked");
    }
  };

  const summary = lang === "de" ? tool.ai_summary_de : tool.ai_summary_en;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="tool-modal"
        className="max-w-4xl bg-[#0A0A0A] border-white/10 text-white p-0 max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader className="p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rank-badge">#{tool.rank}</div>
              <div>
                <DialogTitle className="font-display font-black text-2xl tracking-tight text-white" data-testid="tool-modal-title">
                  {tool.name}
                </DialogTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="tag badge-cyan">{tool.category}</span>
                  {tool.language && <span className="tag">{tool.language}</span>}
                  <span className={`tag ${tool.validated ? "badge-success" : "badge-danger"}`}>
                    {tool.validated ? t("validated") : t("unvalidated")}
                  </span>
                  {(tool.sources || [tool.source]).slice(0, 4).map((s) => (
                    <span key={s} className="tag badge-yellow">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div>
            <div className="label-caps mb-2">DESCRIPTION</div>
            <p className="text-sm text-white/80 leading-relaxed">{tool.description || "—"}</p>
          </div>

          {summary && (
            <div className="border border-[#00E5FF]/20 bg-[#00E5FF]/5 p-4">
              <div className="label-caps text-[#00E5FF] mb-2">{t("ai_summary")} · CLAUDE SONNET</div>
              <p className="text-sm text-white/90 leading-relaxed">{summary}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="tool-url-link"
              className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 hover:bg-white hover:text-black text-xs uppercase tracking-widest transition-colors"
            >
              <ArrowSquareOut size={14} /> {t("view_repo")}
            </a>
            {tool.repo && tool.repo !== tool.url && (
              <a
                href={tool.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 hover:bg-white hover:text-black text-xs uppercase tracking-widest transition-colors"
              >
                <GithubLogo size={14} /> Repo
              </a>
            )}
          </div>

          <div>
            <div className="label-caps mb-3">{t("install_scripts")}</div>
            <Tabs defaultValue="bash" className="w-full">
              <TabsList className="bg-black border border-white/10 h-auto p-1 rounded-none">
                <TabsTrigger data-testid="tab-bash" value="bash" className="rounded-none text-xs uppercase tracking-widest data-[state=active]:bg-[#00E5FF]/10 data-[state=active]:text-[#00E5FF]">
                  bash
                </TabsTrigger>
                <TabsTrigger data-testid="tab-docker" value="docker" className="rounded-none text-xs uppercase tracking-widest data-[state=active]:bg-[#00E5FF]/10 data-[state=active]:text-[#00E5FF]">
                  docker
                </TabsTrigger>
                <TabsTrigger data-testid="tab-kubernetes" value="kubernetes" className="rounded-none text-xs uppercase tracking-widest data-[state=active]:bg-[#00E5FF]/10 data-[state=active]:text-[#00E5FF]">
                  kubernetes
                </TabsTrigger>
              </TabsList>

              {["bash", "docker", "kubernetes"].map((fmt) => (
                <TabsContent key={fmt} value={fmt} className="mt-3">
                  <div className="relative">
                    <div className="terminal-header">
                      <span className="terminal-dot bg-[#DC2626]" />
                      <span className="terminal-dot bg-[#EAB308]" />
                      <span className="terminal-dot bg-[#22C55E]" />
                      <span className="ml-2 text-white/40 text-[10px] uppercase tracking-widest">
                        {fmt} · {scripts.slug || tool.name}
                      </span>
                    </div>
                    <pre className="terminal max-h-[350px] overflow-auto" data-testid={`install-terminal-${fmt}`}>
                      {scripts[fmt] || "# not available"}
                    </pre>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => doCopy(fmt)}
                        data-testid={`copy-install-${fmt}-btn`}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-white/20 hover:bg-white hover:text-black text-xs uppercase tracking-widest transition-colors"
                      >
                        {copiedFmt === fmt ? <CheckCircle size={14} weight="fill" className="text-[#22C55E]" /> : <Copy size={14} />}
                        {copiedFmt === fmt ? t("copied") : t("copy")}
                      </button>
                      <a
                        href={`${API}/tools/${encodeURIComponent(tool.id || tool.name)}/install/${fmt}`}
                        download
                        data-testid={`download-install-${fmt}-btn`}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black text-xs uppercase tracking-widest transition-colors"
                      >
                        <Download size={14} /> {t("download")}
                      </a>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
