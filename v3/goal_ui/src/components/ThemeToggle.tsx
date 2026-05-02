/**
 * ThemeToggle (ADR-103) — sun/moon button that flips light ↔ dark via
 * next-themes. The `mounted` guard suppresses SSR/CSR hydration
 * mismatches: on the first render the html class isn't synced yet, so
 * we render a transparent placeholder of the same size to keep layout
 * stable and avoid a className/icon flicker.
 */

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Layout placeholder — same dimensions as the real button so the
    // header doesn't reflow once the theme resolves.
    return (
      <Button
        variant="outline"
        size="icon"
        aria-hidden="true"
        className="opacity-0 pointer-events-none"
        tabIndex={-1}
      >
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};
