export const THEMES = Object.freeze({ light: "light", dark: "dark" });
export const THEME_COPY = Object.freeze({ light: "Switch to light mode", dark: "Switch to dark mode" });
export const THEME_COOKIE = Object.freeze({
  name: "erp-fish-theme",
  separator: ";",
  attributes: "Path=/; Max-Age=31536000; SameSite=Lax",
});
export const THEME_BOOTSTRAP = `document.documentElement.classList.toggle(${JSON.stringify(THEMES.dark)}, document.cookie.split(${JSON.stringify(THEME_COOKIE.separator)}).some(function(cookie) { return cookie.trim() === ${JSON.stringify(`${THEME_COOKIE.name}=${THEMES.dark}`)}; }));`;
