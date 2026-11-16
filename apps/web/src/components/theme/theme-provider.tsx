"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "qagent-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const rootTheme = document.documentElement.dataset.theme;
    let initialTheme: Theme = rootTheme === "dark" ? "dark" : "light";

    try {
      const savedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") initialTheme = savedTheme;
    } catch {
      // The application still works when browser storage is unavailable.
    }

    document.documentElement.dataset.theme = initialTheme;
    setTheme(initialTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        document.documentElement.dataset.theme = nextTheme;
        try {
          window.localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch {
          // Keep the current selection for this page session.
        }
        setTheme(nextTheme);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme precisa ser usado dentro de ThemeProvider.");
  return context;
}
