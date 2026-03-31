import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text: string;
  source?: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Small ? icon that reveals a tooltip on hover / focus.
 * Positioned with a portal-like approach to avoid clipping.
 */
export function Tooltip({ text, source, className = "", side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setVisible(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  const sideClass = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full  left-1/2 -translate-x-1/2 mt-1.5",
    left:   "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right:  "left-full  top-1/2 -translate-y-1/2 ml-1.5",
  }[side];

  const arrowClass = {
    top:    "absolute top-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900",
    bottom: "absolute bottom-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-slate-900",
    left:   "absolute left-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-slate-900",
    right:  "absolute right-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-slate-900",
  }[side];

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={() => setVisible((v) => !v)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-slate-400 hover:text-primary-500 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-400"
        aria-label="More info"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div
          ref={tipRef}
          role="tooltip"
          className={`absolute z-50 w-56 ${sideClass}`}
        >
          <div className="bg-slate-900 text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-xl">
            {text}
            {source && (
              <p className="mt-1 text-slate-400 text-[10px]">Source: {source}</p>
            )}
          </div>
          <div className={arrowClass} />
        </div>
      )}
    </span>
  );
}

/**
 * Inline tooltip wrapper for a labelled number row.
 * Usage: <LabelWithTooltip label="Per Visit" tooltip="Labor + overhead + margin, per cleaning" />
 */
export function LabelWithTooltip({
  label, tooltip, source, className = "", labelClass = "",
}: {
  label: string; tooltip: string; source?: string; className?: string; labelClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={labelClass}>{label}</span>
      <Tooltip text={tooltip} source={source} />
    </span>
  );
}
