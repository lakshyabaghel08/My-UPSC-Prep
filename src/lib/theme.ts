/**
 * Shared theme control.
 *
 * Every theme change — the Settings page toggles, the sidebar/topbar toggles
 * and the Night-atmosphere auto-dark behaviour — goes through `applyTheme` so
 * the settings store, the <html> attribute and localStorage can never drift.
 */

export type Theme = 'dark' | 'light';

type ThemeSetter = (patch: { theme: Theme }) => void;

/** Theme remembered while Night forces dark mode — restored when leaving Night. */
let themeBeforeNight: Theme | null = null;
/** Set when the user manually changes the theme while Night is active: their
 * explicit choice then wins — Night never restores over it. */
let manualThemeDuringNight = false;
/** Guards the atmosphere sync so forcing dark is not counted as a manual change. */
let atmosphereDriven = false;

function readDomTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** The single theme write path: settings store, <html data-theme> and the
 * pre-paint `mup.theme` key always move together. */
export function applyTheme(theme: Theme, updateSettings?: ThemeSetter): void {
  if (!atmosphereDriven && themeBeforeNight !== null) manualThemeDuringNight = true;
  updateSettings?.({ theme });
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('mup.theme', theme);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Keep the app theme in sync with the Study Timer atmosphere. Night is the
 * native dark app + sky, so selecting it switches the whole app to dark mode
 * through the same code path as the toggles. Switching back to Woodland/Rain
 * restores the theme the user had before Night — unless they manually changed
 * the theme while Night was active (their choice wins). Idempotent: safe to run
 * on every environment change, including on app load when the saved atmosphere
 * is already Night.
 */
export function syncThemeToEnvironment(
  environment: 'woodland' | 'night' | 'rain',
  updateSettings?: ThemeSetter,
): void {
  atmosphereDriven = true;
  try {
    if (environment === 'night') {
      if (themeBeforeNight === null) {
        themeBeforeNight = readDomTheme();
        manualThemeDuringNight = false;
      }
      if (!manualThemeDuringNight) applyTheme('dark', updateSettings);
    } else if (themeBeforeNight !== null) {
      const restore = manualThemeDuringNight ? null : themeBeforeNight;
      themeBeforeNight = null;
      manualThemeDuringNight = false;
      if (restore) applyTheme(restore, updateSettings);
    }
  } finally {
    atmosphereDriven = false;
  }
}
