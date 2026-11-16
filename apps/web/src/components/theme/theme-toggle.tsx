"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "escuro" : "claro";

  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      className="h-9 w-9 rounded-md p-0"
      aria-label={`Ativar tema ${nextTheme}`}
      title={`Ativar tema ${nextTheme}`}
      onClick={toggleTheme}
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      <span className="sr-only">Ativar tema {nextTheme}</span>
    </Button>
  );
}
