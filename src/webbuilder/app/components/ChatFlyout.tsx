"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import ChatMessage, { Message, ToolExecution } from "./ChatMessage";
import ChatInput, { ImageAttachment } from "./ChatInput";
import { CopilotIcon } from "./CopilotIcon";
import { useUser } from "../contexts/UserContext";

const STORAGE_KEY = "webbuilder-chat-messages";

function extractDynamicCode(content: string): string | null {
  const match = content.match(/<dynamic-code>([\s\S]*?)<\/dynamic-code>/);
  return match ? match[1].trim() : null;
}

function dispatchCodeUpdate(code: string) {
  window.dispatchEvent(new CustomEvent("dynamic-code-update", { detail: { code } }));
}

interface ChatFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatFlyout({ isOpen, onClose }: ChatFlyoutProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentCode, setCurrentCode] = useState<string>("");
  const [flyoutWidth, setFlyoutWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isDynamicMode = pathname === "/" || pathname === "/dynamic";
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 800;

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setFlyoutWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
  }, [isResizing]);

  useEffect(() => {
    if (isDynamicMode && user?.id) {
      fetch(`/api/code?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => setCurrentCode(data.code || ""))
        .catch((err) => console.error("Failed to load code:", err));
    }
  }, [isDynamicMode, user?.id]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Message[];
        const seenIds = new Set<string>();
        const fixedMessages = parsed.map((msg, index) => {
          let id = msg.id;
          if (!id || id === "msg-" || seenIds.has(id)) {
            id = `migrated-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`;
          }
          seenIds.add(id);
          return { ...msg, id };
        });
        setMessages(fixedMessages);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, isHydrated]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const handleExternalClear = async () => {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      try {
        await fetch("/api/chat", { method: "DELETE" });
      } catch (e) {
        console.error("Failed to reset session:", e);
      }
    };
    window.addEventListener("clear-chat-session", handleExternalClear);
    return () => window.removeEventListener("clear-chat-session", handleExternalClear);
  }, []);

  const handleClearSession = async () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    try {
      await fetch("/api/chat", { method: "DELETE" });
    } catch (e) {
      console.error("Failed to reset session:", e);
    }
  };

  const handleSend = async (content: string, images: ImageAttachment[]) => {
    const displayContent = images.length > 0
      ? `${content}${content ? "\n\n" : ""}[${images.length} image${images.length > 1 ? "s" : ""} attached]`
      : content;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: displayContent,
      imageAttachments: images.map(img => img.preview),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const toolExecutions: Map<string, ToolExecution> = new Map();
    let toolEventMessageId: string | null = null;
    const streamingMessageId = `response-${Date.now()}`;
    let streamingContent = "";
    let reasoningContent = "";
    let currentStage: "starting" | "planning" | "working" | "complete" = "starting";

    setMessages((prev) => [...prev, {
      id: streamingMessageId,
      role: "assistant",
      content: "",
      stage: "starting",
      isStreaming: true,
    }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role === "event" ? "assistant" : m.role,
            content: m.content,
          })),
          dynamicMode: isDynamicMode,
          currentCode: isDynamicMode ? currentCode : undefined,
          images: images.map(img => ({ base64: img.base64, mimeType: img.mimeType })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case "tool.start":
                toolExecutions.set(data.toolId, {
                  id: data.toolId, name: data.toolName, status: "running",
                  arguments: data.arguments, startTime: new Date().toISOString(),
                });
                if (!toolEventMessageId) {
                  toolEventMessageId = `tools-${Date.now()}`;
                  setMessages((prev) => {
                    const streamingIdx = prev.findIndex(m => m.id === streamingMessageId);
                    if (streamingIdx > 0) {
                      const before = prev.slice(0, streamingIdx);
                      const after = prev.slice(streamingIdx);
                      return [...before, {
                        id: toolEventMessageId!,
                        role: "event" as const,
                        content: "",
                        toolExecutions: Array.from(toolExecutions.values()),
                      }, ...after];
                    }
                    return prev;
                  });
                } else {
                  setMessages((prev) => prev.map(m => m.id === toolEventMessageId
                    ? { ...m, toolExecutions: Array.from(toolExecutions.values()) } : m));
                }
                break;
              case "tool.complete": {
                const tool = toolExecutions.get(data.toolId);
                if (tool) {
                  tool.status = "complete"; tool.success = data.success;
                  tool.result = data.result; tool.endTime = new Date().toISOString();
                  setMessages((prev) => prev.map(m => m.id === toolEventMessageId
                    ? { ...m, toolExecutions: Array.from(toolExecutions.values()) } : m));
                }
                break;
              }
              case "reasoning":
                reasoningContent += data.content || "";
                currentStage = "planning";
                setMessages((prev) => prev.map(m => m.id === streamingMessageId
                  ? { ...m, stage: "planning" as const, reasoning: reasoningContent } : m));
                break;
              case "working":
                if (currentStage !== "working") {
                  currentStage = "working";
                  setMessages((prev) => prev.map(m => m.id === streamingMessageId
                    ? { ...m, stage: "working" as const } : m));
                }
                break;
              case "delta":
                streamingContent += data.content || "";
                break;
              case "done": {
                const finalContent = data.content || streamingContent;
                const dynamicCode = extractDynamicCode(finalContent);
                const previousCodeSnapshot = dynamicCode && isDynamicMode ? currentCode : undefined;
                if (dynamicCode && isDynamicMode) {
                  setCurrentCode(dynamicCode);
                  dispatchCodeUpdate(dynamicCode);
                }
                setMessages((prev) => prev.map(m => m.id === streamingMessageId
                  ? {
                      ...m, content: finalContent, stage: "complete" as const,
                      reasoning: reasoningContent || undefined, isStreaming: false,
                      previousCode: previousCodeSnapshot && previousCodeSnapshot !== dynamicCode ? previousCodeSnapshot : undefined,
                    }
                  : m));
                break;
              }
              case "error":
                throw new Error(data.message || "Unknown error");
            }
          } catch (parseErr) {
            console.error("Failed to parse SSE data:", parseErr, line);
          }
        }
      }
    } catch (error) {
      const errorContent = `Error: ${error instanceof Error ? error.message : "Failed to get response"}`;
      setMessages((prev) => {
        const hasStreamingMsg = prev.some(m => m.id === streamingMessageId);
        if (hasStreamingMsg) {
          return prev.map(m => m.id === streamingMessageId
            ? { ...m, content: errorContent, stage: "complete" as const, isStreaming: false } : m);
        }
        return [...prev, {
          id: streamingMessageId, role: "assistant" as const, content: errorContent,
          stage: "complete" as const, isStreaming: false,
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={flyoutRef}
      style={{ width: Math.min(flyoutWidth, typeof window !== "undefined" ? window.innerWidth : flyoutWidth) }}
      className={`fixed right-0 top-[80px] z-50 flex h-[calc(100vh-77px)] max-w-[100vw] flex-col bg-slate-800 border-l border-t border-slate-600/50 shadow-xl transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full invisible"
      }`}
    >
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-green-500/50 active:bg-green-500"
      />
      <div className="flex items-center justify-between bg-slate-900 px-4 h-8">
        <div className="flex items-center gap-2">
          <CopilotIcon className="w-4 h-4 text-green-400" />
          <h2 className="text-xs font-medium text-gray-200">Copilot Chat</h2>
        </div>
        <button
          onClick={handleClearSession}
          disabled={isLoading}
          className="text-xs px-2 py-0.5 rounded text-gray-400 hover:text-gray-200 hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          New Session
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            <CopilotIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">Describe the HTML page you want to build</p>
            <p className="text-xs text-gray-500 mt-2">Try: &quot;Add a contact form&quot; or &quot;Make the background dark blue&quot;</p>
          </div>
        ) : (
          <>
            {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
