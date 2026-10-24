"use client";
import { useCopy } from "@/hooks/use-copy";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { THEMES, THEME_COPY } from "@/lib/theme-config";

export function ThemeToggle() {
  const t = useCopy();
  const { theme, toggleTheme } = useTheme();
  const label = theme === THEMES.dark ? t(THEME_COPY.light) : t(THEME_COPY.dark);
  return <Button size="icon" variant="outline" aria-label={label} title={label} onClick={toggleTheme}>
    {theme === THEMES.dark ? <SunIcon /> : <MoonIcon />}
  </Button>;
}
