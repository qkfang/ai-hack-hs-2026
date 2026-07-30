"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import DynamicRenderer from "./components/DynamicRenderer";
import ChatFlyout from "./components/ChatFlyout";
import Header from "./components/Header";
import { useUser } from "./contexts/UserContext";

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    tsx: "tsx", ts: "typescript", jsx: "jsx", js: "javascript",
    json: "json", css: "css", html: "html", md: "markdown",
  };
  return langMap[ext || ""] || "typescript";
}

function HomeContent() {
  const { user, isLoading: isUserLoading, isLockedUser } = useUser();
  const searchParams = useSearchParams();
  const ideaId = searchParams.get("ideaId");
  const [code, setCode] = useState<string>("");
  const [files, setFiles] = useState<Record<string, string>>({});
  const [entrypoint, setEntrypoint] = useState<string>("index.html");
  const [selectedFile, setSelectedFile] = useState<string>("index.html");
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [version, setVersion] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sampleName, setSampleName] = useState<string>("");
  const [showHowTo, setShowHowTo] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    fetch("/api/schema")
      .then((res) => res.json())
      .then((data) => setSampleName(data.sample || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.id) {
      if (isLockedUser) {
        syncFromBlob(user.id, ideaId).then(() => loadCode(user.id, ideaId));
      } else {
        loadCode(user.id, ideaId);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    const handleUserSwitched = (event: CustomEvent<{ userId: string }>) => {
      const userId = event.detail?.userId;
      if (userId) {
        setIsLoading(true);
        loadCode(userId, ideaId);
      }
    };
    window.addEventListener("user-switched", handleUserSwitched as EventListener);
    return () => window.removeEventListener("user-switched", handleUserSwitched as EventListener);
  }, []);

  useEffect(() => {
    const handleCodeUpdate = (event: CustomEvent<{ code: string }>) => {
      const newCode = event.detail.code;
      setCode(newCode);
      setFiles(prev => ({ ...prev, [entrypoint]: newCode }));
      if (user?.id) saveCode(newCode, user.id);
    };
    window.addEventListener("dynamic-code-update", handleCodeUpdate as EventListener);
    return () => window.removeEventListener("dynamic-code-update", handleCodeUpdate as EventListener);
  }, [user?.id, entrypoint]);

  const syncFromBlob = async (userId: string, idea: string | null) => {
    try {
      const url = `/api/sync?userId=${encodeURIComponent(userId)}${idea ? `&ideaId=${encodeURIComponent(idea)}` : ""}`;
      await fetch(url, { method: "POST" });
    } catch (err) {
      console.error("Failed to sync from blob:", err);
    }
  };

  const loadCode = async (userId: string, idea: string | null = null) => {
    try {
      const url = `/api/code?userId=${encodeURIComponent(userId)}&all=true${idea ? `&ideaId=${encodeURIComponent(idea)}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();
      setFiles(data.files || {});
      setEntrypoint(data.entrypoint || "index.tsx");
      setSelectedFile(data.entrypoint || "index.tsx");
      const entrypointCode = data.files?.[data.entrypoint] || "";
      setCode(entrypointCode);
      setVersion(data.version || 0);
    } catch (err) {
      console.error("Failed to load code:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCode = async (newCode: string, userId: string) => {
    try {
      const url = `/api/code?userId=${encodeURIComponent(userId)}${ideaId ? `&ideaId=${encodeURIComponent(ideaId)}` : ""}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode }),
      });
      const data = await response.json();
      if (data.success) setVersion(data.version);
    } catch (err) {
      console.error("Failed to save code:", err);
    }
  };

  const resetCode = async () => {
    if (!confirm("Reset to default code? This will lose your changes.")) return;
    if (!user?.id) return;
    try {
      const delUrl = `/api/code?userId=${encodeURIComponent(user.id)}${ideaId ? `&ideaId=${encodeURIComponent(ideaId)}` : ""}`;
      await fetch(delUrl, { method: "DELETE" });
      await loadCode(user.id, ideaId);
      setLastError(null);
      window.dispatchEvent(new CustomEvent("clear-chat-session"));
      setIsChatOpen(false);
    } catch (err) {
      console.error("Failed to reset code:", err);
    }
  };

  const handleCompileError = useCallback((error: string) => { setLastError(error); }, []);
  const handleCompileSuccess = useCallback(() => { setLastError(null); }, []);

  const handleSave = async () => {
    if (!user?.id || isSaving) return;
    setIsSaving(true);
    try {
      const url = `/api/save?userId=${encodeURIComponent(user.id)}${ideaId ? `&ideaId=${encodeURIComponent(ideaId)}` : ""}`;
      await fetch(url, { method: "POST" });
    } catch (err) {
      console.error("Failed to save to storage:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden">
      <Header
        sampleName={sampleName}
        version={version}
        showHowTo={showHowTo}
        setShowHowTo={setShowHowTo}
        showCode={showCode}
        setShowCode={setShowCode}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        onReset={resetCode}
        onSave={handleSave}
        isSaving={isSaving}
        isFullScreen={isFullScreen}
        setIsFullScreen={setIsFullScreen}
      />

      {isFullScreen && (
        <button
          onClick={() => setIsFullScreen(false)}
          className="fixed top-2 right-2 z-50 px-2 py-1 text-xs bg-gray-800/80 text-white rounded hover:bg-gray-700 transition-colors backdrop-blur-sm"
          title="Exit full screen"
        >
          ✕ Exit Full Screen
        </button>
      )}

      <main className={isFullScreen ? "h-screen p-0" : "max-w-6xl mx-auto px-4 py-2"}>
        <div className={`grid gap-6 grid-cols-1 ${isFullScreen ? "h-full" : ""}`}>
          <div className={`bg-white dark:bg-gray-800 shadow-lg ${isFullScreen ? "h-full" : "rounded-xl p-6 min-h-[calc(100vh-70px)]"}`}>
            <DynamicRenderer
              code={code}
              onError={handleCompileError}
              onSuccess={handleCompileSuccess}
            />
          </div>
        </div>
      </main>

      {showCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowCode(false)}>
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-gray-800 border-b border-gray-700 px-4 py-2 shrink-0">
              <div className="flex items-center overflow-x-auto gap-1">
                {Object.keys(files).map((filename) => (
                  <button
                    key={filename}
                    onClick={() => setSelectedFile(filename)}
                    className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-md transition-colors ${
                      selectedFile === filename
                        ? "text-blue-400 bg-gray-900"
                        : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {filename === entrypoint && <span className="text-green-400" title="Entrypoint">●</span>}
                      {filename}
                    </span>
                  </button>
                ))}
                {lastError && <span className="ml-auto px-3 text-xs text-red-400">Has errors</span>}
              </div>
              <button onClick={() => setShowCode(false)} className="ml-3 p-1 text-gray-400 hover:text-white rounded transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <SyntaxHighlighter
                language={getLanguageFromFilename(selectedFile)}
                style={oneDark}
                customStyle={{ margin: 0, padding: "1rem", background: "transparent", fontSize: "0.875rem" }}
                showLineNumbers
                lineNumberStyle={{ color: "#6b7280", minWidth: "2.5em" }}
              >
                {files[selectedFile] || "// No content"}
              </SyntaxHighlighter>
            </div>
          </div>
        </div>
      )}

      <ChatFlyout isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
