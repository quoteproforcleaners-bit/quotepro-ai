import { useEffect, useRef } from"react";
import QRCode from"qrcode";

const APP_STORE_URL =
"https://apps.apple.com/us/app/quotepro-ai-cleaning-quotes/id6758575812";

export default function AppStoreQR() {
 const canvasRef = useRef<HTMLCanvasElement>(null);

 useEffect(() => {
 if (!canvasRef.current) return;
 QRCode.toCanvas(canvasRef.current, APP_STORE_URL, {
 width: 120,
 margin: 1,
 color: { dark:"#000000", light:"#ffffff"},
 });
 }, []);

 return (
 <div className="mx-3 mb-2">
 <a
 href={APP_STORE_URL}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-black border border-slate-700 hover:opacity-85 transition-opacity"
 >
 <svg viewBox="0 0 24 24"width="15"height="15"fill="white"style={{ flexShrink: 0 }}>
 <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
 </svg>
 <div className="min-w-0">
 <p className="text-[8px] text-slate-400 leading-none mb-0.5">Download on the</p>
 <p className="text-[11px] font-semibold text-white leading-none">App Store</p>
 </div>
 </a>
 <div className="mt-1.5 flex flex-col items-center gap-1 px-1">
 <a
 href={APP_STORE_URL}
 target="_blank"
 rel="noopener noreferrer"
 title="Scan to download on iPhone"
 className="rounded-xl overflow-hidden border border-slate-200 hover:opacity-85 transition-opacity"
 >
 <canvas ref={canvasRef} style={{ display:"block", borderRadius: 10 }} />
 </a>
 <p className="text-[9px] text-slate-500 leading-none">Scan to download on iPhone</p>
 </div>
 </div>
 );
}
