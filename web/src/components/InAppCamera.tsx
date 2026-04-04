import { useEffect, useRef, useState } from "react";
import { X, Camera, Image, RefreshCw } from "lucide-react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function InAppCamera({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"starting" | "live" | "denied" | "unavailable">("starting");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);

  const startCamera = async (facing: "environment" | "user") => {
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setStatus("live");
        };
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setStatus("unavailable");
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || status !== "live") return;

    setFlash(true);
    setTimeout(() => setFlash(false), 180);

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror if using front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  };

  const handleFlip = () => {
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  };

  // Gallery fallback — file picker, no capture attribute
  const handleGallery = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={S.overlay}>
      <style>{`@keyframes shutterFlash{0%{opacity:0.85}100%{opacity:0}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Hidden file input for gallery fallback */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      {/* Camera viewfinder or error state */}
      {(status === "starting" || status === "live") && (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              background: "#000",
            }}
          />
          {status === "starting" && (
            <div style={S.loadingOverlay}>
              <div style={S.spinner} />
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 12 }}>Starting camera...</p>
            </div>
          )}
          {/* Shutter flash */}
          {flash && <div style={S.shutterFlash} />}
        </>
      )}

      {status === "denied" && (
        <div style={S.errorState}>
          <div style={S.errorIcon}>
            <Camera size={36} color="#fff" strokeWidth={1.5} />
          </div>
          <h3 style={S.errorTitle}>Camera access required</h3>
          <p style={S.errorBody}>
            Please allow camera access for this site in your browser settings,
            then reload the page.
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 28px", textAlign: "center" as const }}>
            iOS: Settings → Safari → Camera → Allow
          </p>
          <button style={S.galleryBtn} onClick={handleGallery}>
            <Image size={18} />
            Choose from Library
          </button>
        </div>
      )}

      {status === "unavailable" && (
        <div style={S.errorState}>
          <div style={S.errorIcon}>
            <Camera size={36} color="#fff" strokeWidth={1.5} />
          </div>
          <h3 style={S.errorTitle}>Camera not available</h3>
          <p style={S.errorBody}>Your browser doesn't support in-app camera. Choose a photo from your library instead.</p>
          <button style={S.galleryBtn} onClick={handleGallery}>
            <Image size={18} />
            Choose from Library
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Controls */}
      <div style={S.controls}>
        {/* Close */}
        <button style={S.iconBtn} onClick={onClose}>
          <X size={24} color="#fff" />
        </button>

        {/* Shutter */}
        <button
          style={{ ...S.shutter, opacity: status === "live" ? 1 : 0.35 }}
          onClick={handleCapture}
          disabled={status !== "live"}
        />

        {/* Flip / Gallery */}
        {status === "live" ? (
          <button style={S.iconBtn} onClick={handleFlip}>
            <RefreshCw size={22} color="#fff" />
          </button>
        ) : (
          <button style={S.iconBtn} onClick={handleGallery}>
            <Image size={22} color="#fff" />
          </button>
        )}
      </div>

      {/* Gallery hint when live */}
      {status === "live" && (
        <button style={S.galleryHint} onClick={handleGallery}>
          <Image size={14} color="rgba(255,255,255,0.7)" />
          <span>Library</span>
        </button>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const, inset: 0, zIndex: 300,
    background: "#000",
    display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
    animation: "fadeIn 0.2s ease",
  },
  loadingOverlay: {
    position: "absolute" as const, inset: 0, zIndex: 2,
    display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
    background: "#000",
  },
  spinner: {
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.85)",
    animation: "spin 0.8s linear infinite",
  },
  shutterFlash: {
    position: "absolute" as const, inset: 0, zIndex: 10,
    background: "white", animation: "shutterFlash 0.18s ease forwards", pointerEvents: "none" as const,
  },
  errorState: {
    display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center",
    padding: "40px 32px", flex: 1,
  },
  errorIcon: {
    width: 80, height: 80, borderRadius: "50%",
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  errorTitle: { fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 10px", textAlign: "center" as const },
  errorBody: { fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 1.55, margin: "0 0 16px", textAlign: "center" as const },
  galleryBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff", borderRadius: 14, padding: "13px 24px", fontSize: 15, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", backdropFilter: "blur(8px)",
  },
  controls: {
    position: "absolute" as const,
    bottom: "calc(32px + env(safe-area-inset-bottom, 16px))",
    left: 0, right: 0,
    display: "flex", alignItems: "center", justifyContent: "space-around",
    paddingInline: 24,
    zIndex: 10,
  },
  iconBtn: {
    width: 52, height: 52, borderRadius: "50%",
    background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", backdropFilter: "blur(8px)",
  },
  shutter: {
    width: 76, height: 76, borderRadius: "50%",
    background: "transparent",
    border: "4px solid rgba(255,255,255,0.9)",
    boxShadow: "0 0 0 3px rgba(255,255,255,0.3) inset",
    cursor: "pointer",
    transition: "transform 0.08s, opacity 0.15s",
  },
  galleryHint: {
    position: "absolute" as const,
    bottom: "calc(96px + env(safe-area-inset-bottom, 16px))",
    right: 28, zIndex: 10,
    display: "flex", alignItems: "center", gap: 5,
    background: "rgba(0,0,0,0.4)", border: "none",
    color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600,
    borderRadius: 20, padding: "5px 10px", cursor: "pointer",
    backdropFilter: "blur(8px)",
  },
};
