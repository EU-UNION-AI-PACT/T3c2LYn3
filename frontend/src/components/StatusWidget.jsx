import React, { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { Clock, Broadcast } from "@phosphor-icons/react";

function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

export default function StatusWidget({ status }) {
  const { t } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextTs = status?.next_refresh_iso ? new Date(status.next_refresh_iso).getTime() : 0;
  const countdown = formatCountdown(nextTs - now);

  return (
    <div
      data-testid="status-widget"
      className="bento-card p-6 flex flex-col gap-4 font-mono"
    >
      <div className="flex items-center justify-between">
        <span className="label-caps">{t("live_status")}</span>
        <span className="flex items-center gap-2 text-[#22C55E] text-[10px] tracking-widest uppercase">
          <span className="live-dot" /> LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="label-caps mb-1">{t("berlin_time")}</div>
          <div className="text-xl text-white flicker" data-testid="berlin-time">
            {status?.current_berlin_time?.split(" ")[1] || "--:--:--"}
          </div>
        </div>
        <div>
          <div className="label-caps mb-1">{t("next_refresh")}</div>
          <div className="text-xl text-[#EAB308]" data-testid="next-refresh-countdown">
            {countdown}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/60">
        <Clock size={14} weight="bold" className="text-[#00E5FF]" />
        <span>08:44 Europe/Berlin — Daily Auto-Refresh</span>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        <div>
          <div className="label-caps">TOOLS</div>
          <div className="text-2xl font-display font-black text-[#00E5FF]" data-testid="stat-tools">
            {status?.tools_count ?? "—"}
          </div>
        </div>
        <div>
          <div className="label-caps">{t("sources_scanned")}</div>
          <div className="text-2xl font-display font-black text-white" data-testid="stat-sources-active">
            {status?.sources_active ?? "—"}
          </div>
        </div>
        <div>
          <div className="label-caps">{t("catalog_total")}</div>
          <div className="text-2xl font-display font-black text-[#EAB308]" data-testid="stat-catalog">
            {status?.total_catalog ?? "—"}
          </div>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
        <Broadcast size={12} />
        {t("last_generated")}: {status?.last_generated_berlin || "—"}
      </div>
    </div>
  );
}
