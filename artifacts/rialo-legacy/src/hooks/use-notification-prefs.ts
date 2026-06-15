import { useState, useCallback } from "react";

const STORAGE_KEY = "rl:notification_prefs";

export type NotificationPrefs = {
  whatsapp: string;
  telegram: string;
  discord: string;
};

const DEFAULT: NotificationPrefs = { whatsapp: "", telegram: "", discord: "" };

function load(): NotificationPrefs {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function useNotificationPrefs() {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(load);

  const savePrefs = useCallback((next: Partial<NotificationPrefs>) => {
    setPrefsState((prev) => {
      const updated = { ...prev, ...next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  return { prefs, savePrefs };
}

const GUARDIAN_TG_KEY = "rl:guardian_tg";

export function loadGuardianTelegram(): Record<string, string> {
  try {
    const raw = localStorage.getItem(GUARDIAN_TG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveGuardianTelegram(guardianEmail: string, handle: string) {
  try {
    const map = loadGuardianTelegram();
    map[guardianEmail] = handle;
    localStorage.setItem(GUARDIAN_TG_KEY, JSON.stringify(map));
  } catch {}
}

export function getGuardianTelegram(guardianEmail: string): string {
  return loadGuardianTelegram()[guardianEmail] ?? "";
}
