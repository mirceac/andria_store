export type Theme = "light" | "dark";

const THEME_KEY = "gallery-theme";

export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch (error) {
    console.warn("Unable to read theme preference", error);
    return "light";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function saveTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn("Unable to save theme preference", error);
  }
}
