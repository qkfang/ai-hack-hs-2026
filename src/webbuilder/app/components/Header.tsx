"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CopilotIcon } from "./CopilotIcon";
import UserProfile from "./UserProfile";

interface HeaderProps {
  sampleName: string | null;
  version: number;
  showHowTo: boolean;
  setShowHowTo: (show: boolean) => void;
  showCode: boolean;
  setShowCode: (show: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  onReset: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;
}

export default function Header({
  sampleName,
  version,
  showHowTo,
  setShowHowTo,
  showCode,
  setShowCode,
  isChatOpen,
  setIsChatOpen,
  onReset,
  onSave,
  isSaving,
  isFullScreen,
  setIsFullScreen,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (isFullScreen) return null;

  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  aria-label="Menu"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">View</span>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setShowHowTo(true); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2.5"
                      >
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How to Use
                      </button>
                      <button
                        onClick={() => { setShowCode(true); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2.5"
                      >
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        View Code
                      </button>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700" />
                    <div className="py-1">
                      <button
                        onClick={() => { onReset(); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Reset to Default
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                Web Builder
              </h1>
              {sampleName && (
                <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                  {sampleName}
                </span>
              )}
              <span className="hidden sm:inline text-[10px] text-gray-400 dark:text-gray-500">v{version}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* <Link
                href="/gallery"
                className="px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-colors"
              >
                Gallery
              </Link> */}
              <button
                onClick={() => setIsFullScreen(true)}
                className="hidden sm:inline-flex px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Full screen"
              >
                ⛶
              </button>
              <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
              {onSave && (
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Save to storage"
                >
                  {isSaving ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  {isSaving ? "Saving..." : <><span className="hidden sm:inline">Save</span><span className="sm:hidden">💾</span></>}
                </button>
              )}
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  isChatOpen
                    ? "bg-green-600 text-white"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                <CopilotIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isChatOpen ? "Close Chat" : "Copilot"}</span>
              </button>
              <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {showHowTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowHowTo(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">How to Use</h2>
              <button onClick={() => setShowHowTo(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">●</span>
                  Click <strong className="text-gray-900 dark:text-white">&quot;Copilot&quot;</strong> to open the chat panel
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">●</span>
                  Ask Copilot to build or modify your page (e.g., &quot;Add a contact form&quot;)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-purple-500">●</span>
                  Copilot generates a complete HTML page and applies it instantly
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-amber-500">●</span>
                  Use <strong className="text-gray-900 dark:text-white">&quot;View Code&quot;</strong> from the menu to see the source
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-red-500">●</span>
                  Use <strong className="text-gray-900 dark:text-white">&quot;Reset&quot;</strong> to go back to the default page
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-cyan-500">●</span>
                  You can paste images into the chat for Copilot to analyze
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
