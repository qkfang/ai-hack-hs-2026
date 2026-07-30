"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUser, User } from "../contexts/UserContext";

const ADMIN_PASSCODE = "9999";

const RANDOM_NAMES = [
  "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Henry",
  "Iris", "Jack", "Kate", "Leo", "Maya", "Noah", "Olivia", "Paul",
  "Quinn", "Ruby", "Sam", "Tara", "Uma", "Victor", "Wendy", "Xavier", "Yara", "Zack"
];

function getRandomName(): string {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const suffix = Math.floor(Math.random() * 1000);
  return `${name}${suffix}`;
}

function dispatchClearChat() {
  window.dispatchEvent(new CustomEvent("clear-chat-session"));
}

export default function UserProfile() {
  const { user, isLoading, isLockedUser, setUserName, switchUser, createUser, listUsers } = useUser();
  const searchParams = useSearchParams();
  const ideaId = searchParams.get("ideaId");
  const ideaTitle = searchParams.get("ideaTitle");
  const [isEditing, setIsEditing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsEditing(false);
        setIsSwitchUserOpen(false);
        setShowPasscodePrompt(false);
        setPasscode("");
        setPasscodeError("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isSwitchUserOpen && isAdminMode) {
      setIsLoadingUsers(true);
      listUsers()
        .then((users) => setAllUsers(users))
        .finally(() => setIsLoadingUsers(false));
    }
  }, [isSwitchUserOpen, isAdminMode, listUsers]);

  const handleStartEdit = () => {
    setEditName(user?.name || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await setUserName(editName.trim());
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save name:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToUser = async (userId: string) => {
    try {
      await switchUser(userId);
      dispatchClearChat();
      setIsDropdownOpen(false);
      setIsSwitchUserOpen(false);
      window.dispatchEvent(new CustomEvent("user-switched", { detail: { userId } }));
    } catch (error) {
      console.error("Failed to switch user:", error);
    }
  };

  const handleCreateNewUser = async () => {
    try {
      const randomName = getRandomName();
      const newUser = await createUser(randomName);
      dispatchClearChat();
      setIsDropdownOpen(false);
      setIsSwitchUserOpen(false);
      if (newUser?.id) {
        window.dispatchEvent(new CustomEvent("user-switched", { detail: { userId: newUser.id } }));
      }
    } catch (error) {
      console.error("Failed to create new user:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") setIsEditing(false);
  };

  const handlePasscodeSubmit = () => {
    if (passcode === ADMIN_PASSCODE) {
      setIsAdminMode(true);
      setShowPasscodePrompt(false);
      setPasscode("");
      setPasscodeError("");
    } else {
      setPasscodeError("Incorrect passcode");
      setPasscode("");
    }
  };

  const handlePasscodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handlePasscodeSubmit();
    else if (e.key === "Escape") {
      setShowPasscodePrompt(false);
      setPasscode("");
      setPasscodeError("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
          {user?.name?.charAt(0).toUpperCase() || "?"}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">
          {user?.name || "Guest"}
        </span>
        {isAdminMode && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded-full">
            Admin
          </span>
        )}
        <svg
          className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Current User
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.name}
              </span>
            </div>
            {ideaId && (
              <div className="mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Idea</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="text-gray-400 dark:text-gray-500 mr-1">#{ideaId}</span>
                  {ideaTitle}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-2 py-1">
            {/* Admin mode: show switch user; locked mode: show Admin button */}
            {isAdminMode ? (
              <div className="relative">
                <button
                  onClick={() => setIsSwitchUserOpen(!isSwitchUserOpen)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Switch User
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${isSwitchUserOpen ? "rotate-90" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>

                {isSwitchUserOpen && (
                  <div className="absolute left-full top-0 ml-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-64 overflow-y-auto">
                    {isLoadingUsers ? (
                      <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
                        <div className="w-3 h-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                        Loading...
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleCreateNewUser}
                          className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          New User
                        </button>
                        {allUsers.length > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        )}
                        {allUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleSwitchToUser(u.id)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                              u.id === user?.id
                                ? "text-blue-600 dark:text-blue-400 font-medium"
                                : "text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                              {u.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <span className="truncate">{u.name}</span>
                            {u.id === user?.id && <span className="ml-auto text-xs">✓</span>}
                          </button>
                        ))}
                        {allUsers.length === 0 && (
                          <div className="px-4 py-2 text-xs text-gray-500">No users found</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Admin section for locked or normal users */
              <div>
                {!showPasscodePrompt ? (
                  <button
                    onClick={() => setShowPasscodePrompt(true)}
                    className="w-full text-left px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Admin
                    </span>
                  </button>
                ) : (
                  <div className="px-3 py-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Enter admin passcode:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={passcode}
                        onChange={(e) => { setPasscode(e.target.value); setPasscodeError(""); }}
                        onKeyDown={handlePasscodeKeyDown}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Passcode"
                        autoFocus
                        maxLength={10}
                      />
                      <button
                        onClick={handlePasscodeSubmit}
                        className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                      >
                        Enter
                      </button>
                    </div>
                    {passcodeError && (
                      <p className="text-xs text-red-500 mt-1">{passcodeError}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Locked user indicator */}
          {isLockedUser && !isAdminMode && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Launched from AI Hack Studio
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
