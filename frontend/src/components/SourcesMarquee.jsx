import React from "react";
import Marquee from "react-fast-marquee";
import { useI18n } from "../i18n";

export default function SourcesMarquee({ items = [], catalogTotal = 1111 }) {
  const { t } = useI18n();
  const sample = items.length ? items : Array.from({ length: 25 }).map((_, i) => ({
    name: `LOADING #${i + 1}`, active: false,
  }));
  return (
    <div
      data-testid="sources-marquee"
      className="bg-black border-y border-white/10 py-2 relative overflow-hidden"
    >
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-4 bg-black border-r border-white/10">
        <span className="live-dot" />
        <span className="ml-2 text-[10px] tracking-[0.3em] uppercase text-[#00E5FF] font-mono">
          {catalogTotal} / {t("sources")}
        </span>
      </div>
      <Marquee gradient={false} speed={38} pauseOnHover>
        {sample.map((s, idx) => (
          <span
            key={idx}
            className={`marquee-item ${s.active ? "active" : ""}`}
          >
            [{String(idx + 1).padStart(4, "0")}] {s.name} · {s.category || "—"}
          </span>
        ))}
      </Marquee>
    </div>
  );
}
