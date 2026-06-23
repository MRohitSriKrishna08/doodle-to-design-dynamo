import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  Upload,
  Sparkles,
  Download,
  Copy,
  Check,
  Loader2,
  Image as ImageIcon,
  AlertTriangle,
  Code2,
  Monitor,
  RefreshCw,
} from "lucide-react";

import { generateSite, type GeneratedSite } from "@/lib/generate.functions";
import { buildPreviewDoc, buildIndexHtml } from "@/lib/preview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ink2Interface — Sketch to Website" },
      {
        name: "description",
        content:
          "Upload a hand-drawn UI sketch and instantly generate a working HTML, CSS, and JavaScript website with Ink2Interface.",
      },
      { property: "og:title", content: "Ink2Interface — Sketch to Website" },
      {
        property: "og:description",
        content: "Turn hand-drawn UI sketches into production-ready websites in seconds.",
      },
    ],
  }),
  component: Index,
});

type Tab = "preview" | "html" | "css" | "js";

function Index() {
  const router = useRouter();
  const generate = useServerFn(generateSite);
  const fileRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/png");
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<GeneratedSite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState<string | null>(null);

  const previewSrcDoc = useMemo(
    () => (result ? buildPreviewDoc(result) : ""),
    [result],
  );

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image too large (max 8MB).");
      return;
    }
    setError(null);
    setFileName(file.name);
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onGenerate = async () => {
    if (!imageDataUrl) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64 = imageDataUrl.split(",")[1] ?? imageDataUrl;
      const out = await generate({ data: { image: base64, mimeType: imageMime } });
      setResult(out);
      setTab("preview");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const downloadZip = async () => {
    if (!result) return;
    const zip = new JSZip();
    zip.file("index.html", buildIndexHtml(result));
    zip.file("style.css", result.css);
    zip.file("script.js", result.js || "");
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ink2interface-site.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setImageDataUrl(null);
    setFileName("");
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Ink2Interface</h1>
              <p className="text-xs text-muted-foreground">Sketch → Website</p>
            </div>
          </div>
          <a
            href="https://lovable.dev"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            powered by Lovable AI
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left: Upload + actions */}
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              Upload sketch
            </h2>

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="block cursor-pointer rounded-lg border-2 border-dashed border-border hover:border-primary/60 transition-colors p-6 text-center"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {imageDataUrl ? (
                <div className="space-y-3">
                  <img
                    src={imageDataUrl}
                    alt="sketch preview"
                    className="mx-auto max-h-56 rounded-md border border-border object-contain bg-muted"
                  />
                  <p className="text-xs text-muted-foreground truncate">{fileName}</p>
                </div>
              ) : (
                <div className="space-y-2 py-6">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  <p className="text-sm">
                    Drop image here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WebP · up to 8MB</p>
                </div>
              )}
            </label>

            <div className="mt-4 flex gap-2">
              <button
                onClick={onGenerate}
                disabled={!imageDataUrl || loading}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Generate
                  </>
                )}
              </button>
              {imageDataUrl && !loading && (
                <button
                  onClick={reset}
                  className="rounded-md border border-border px-3 py-2.5 text-sm hover:bg-accent transition"
                  title="Reset"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-medium">Export</h2>
              <button
                onClick={downloadZip}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground text-sm font-medium px-4 py-2.5 hover:bg-accent/80 transition"
              >
                <Download className="w-4 h-4" /> Download ZIP
              </button>
              <p className="text-xs text-muted-foreground">
                Includes <code className="text-foreground">index.html</code>,{" "}
                <code className="text-foreground">style.css</code>,{" "}
                <code className="text-foreground">script.js</code>.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-card/40 p-5 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">Tips</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Use a clear photo or scan with good contrast.</li>
              <li>Label sections (e.g. "Hero", "Form") for better results.</li>
              <li>Generated output is vanilla HTML/CSS/JS — no frameworks.</li>
            </ul>
          </div>
        </section>

        {/* Right: Output */}
        <section className="rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-[70vh]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-card/80">
            <div className="flex gap-1">
              <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
                <Monitor className="w-3.5 h-3.5" /> Preview
              </TabButton>
              <TabButton active={tab === "html"} onClick={() => setTab("html")}>
                <Code2 className="w-3.5 h-3.5" /> HTML
              </TabButton>
              <TabButton active={tab === "css"} onClick={() => setTab("css")}>
                <Code2 className="w-3.5 h-3.5" /> CSS
              </TabButton>
              <TabButton active={tab === "js"} onClick={() => setTab("js")}>
                <Code2 className="w-3.5 h-3.5" /> JS
              </TabButton>
            </div>
            {result && tab !== "preview" && (
              <button
                onClick={() =>
                  copy(tab, tab === "html" ? result.html : tab === "css" ? result.css : result.js)
                }
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-border hover:bg-accent transition"
              >
                {copied === tab ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 relative bg-background">
            {!result && !loading && (
              <EmptyState />
            )}
            {loading && <LoadingState />}
            {result && tab === "preview" && (
              <iframe
                key={previewSrcDoc.length}
                title="Generated website preview"
                srcDoc={previewSrcDoc}
                sandbox="allow-scripts allow-forms allow-same-origin"
                className="w-full h-full min-h-[60vh] bg-white"
              />
            )}
            {result && tab !== "preview" && (
              <pre className="p-4 text-xs overflow-auto h-full max-h-[75vh] font-mono leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                {tab === "html" ? result.html : tab === "css" ? result.css : result.js || "// (no JS)"}
              </pre>
            )}
          </div>
        </section>
      </main>
      <footer className="max-w-7xl mx-auto px-6 py-6 text-xs text-muted-foreground">
        Ink2Interface · {new Date().getFullYear()} · {router.state.location.pathname}
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition ${
        active
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[60vh] grid place-items-center text-center px-6">
      <div className="max-w-sm space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Your generated website will appear here</h3>
        <p className="text-sm text-muted-foreground">
          Upload a hand-drawn UI sketch on the left, then hit <strong>Generate</strong>.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-full min-h-[60vh] grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>Analyzing sketch and building site…</p>
        <p className="text-xs">This usually takes 10–25 seconds.</p>
      </div>
    </div>
  );
}
