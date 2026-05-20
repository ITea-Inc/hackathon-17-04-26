import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DEThemeContext = createContext(null);

const availableThemes = [
  {
    id: 'gnome',
    label: 'GNOME',
    description: 'Классический стиль GNOME Desktop — округлые элементы, Adwaita-эстетика',
    icon: '🪟',
  },
  {
    id: 'hyprland',
    label: 'Hyprland',
    description: 'Тайловый WM — неоновые акценты, glassmorphism, vim-навигация',
    icon: '⌨',
  },
  // Future DEs:
  // { id: 'kde', label: 'KDE Plasma', description: '...', icon: '🔷' },
  // { id: 'sway', label: 'Sway', description: '...', icon: '🌊' },
];

/**
 * Parse Hyprland config to extract color values.
 * Looks for patterns like:
 *   col.active_border = rgba(7dcfffee) rgba(bb9af7ee) 45deg
 *   col.inactive_border = rgba(595959aa)
 * Also parses $variables like:
 *   $accent = rgb(7dcfff)
 */
function parseHyprlandConfig(configText) {
  const colors = {
    activeBorder: null,
    inactiveBorder: null,
    accent: null,
    accentAlpha: null,
    shadow: null,
    variables: {},
  };

  const lines = configText.split('\n');

  // First pass: extract variables
  for (const line of lines) {
    const trimmed = line.trim();
    const varMatch = trimmed.match(/^\$(\w+)\s*=\s*(.+)$/);
    if (varMatch) {
      colors.variables[varMatch[1]] = varMatch[2].trim();
    }
  }

  // Resolve a value (replace $var references)
  const resolve = (val) => {
    let resolved = val;
    for (const [key, value] of Object.entries(colors.variables)) {
      resolved = resolved.replace(new RegExp(`\\$${key}\\b`, 'g'), value);
    }
    return resolved;
  };

  // Parse rgba(RRGGBBAA) or rgb(RRGGBB) into CSS hex
  const parseHyprColor = (str) => {
    const rgbaMatch = str.match(/rgba\(([0-9a-fA-F]{6,8})\)/);
    if (rgbaMatch) {
      const hex = rgbaMatch[1];
      if (hex.length === 8) {
        return '#' + hex.slice(0, 6); // drop alpha for CSS variable usage
      }
      return '#' + hex;
    }
    const rgbMatch = str.match(/rgb\(([0-9a-fA-F]{6})\)/);
    if (rgbMatch) {
      return '#' + rgbMatch[1];
    }
    // Might be a plain hex
    if (str.match(/^#?[0-9a-fA-F]{6,8}$/)) {
      const clean = str.replace('#', '');
      return '#' + clean.slice(0, 6);
    }
    return null;
  };

  // Second pass: extract specific settings
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.length === 0) continue;

    const resolved = resolve(trimmed);

    // col.active_border
    if (resolved.includes('col.active_border')) {
      const match = resolved.match(/col\.active_border\s*=\s*(.+)/);
      if (match) {
        const firstColor = parseHyprColor(match[1].trim().split(/\s+/)[0]);
        if (firstColor) colors.activeBorder = firstColor;

        // If there's a second color, use as secondary accent
        const parts = match[1].trim().split(/\s+/);
        if (parts.length > 1) {
          const secondColor = parseHyprColor(parts[1]);
          if (secondColor) colors.accentAlpha = secondColor;
        }
      }
    }

    // col.inactive_border
    if (resolved.includes('col.inactive_border')) {
      const match = resolved.match(/col\.inactive_border\s*=\s*(.+)/);
      if (match) {
        const c = parseHyprColor(match[1].trim().split(/\s+/)[0]);
        if (c) colors.inactiveBorder = c;
      }
    }

    // col.shadow
    if (resolved.includes('col.shadow') && !resolved.includes('col.shadow_inactive')) {
      const match = resolved.match(/col\.shadow\s*=\s*(.+)/);
      if (match) {
        const c = parseHyprColor(match[1].trim().split(/\s+/)[0]);
        if (c) colors.shadow = c;
      }
    }

    // $accent variable specifically
    if (trimmed.match(/^\$accent\s*=/i)) {
      const match = resolved.match(/=\s*(.+)/);
      if (match) {
        const c = parseHyprColor(match[1].trim());
        if (c) colors.accent = c;
      }
    }
  }

  // Determine the primary accent from parsed values
  const primary = colors.accent || colors.activeBorder || '#7dcfff';
  const secondary = colors.accentAlpha || colors.inactiveBorder || '#bb9af7';

  return { primary, secondary };
}

function readHyprlandColors() {
  const defaults = { primary: '#7dcfff', secondary: '#bb9af7' };

  try {
    if (!window.require) return defaults;

    const fs = window.require('fs');
    const path = window.require('path');
    const os = window.require('os');

    const configPaths = [
      path.join(os.homedir(), '.config/hypr/hyprland.conf'),
      path.join(os.homedir(), '.config/hypr/colors.conf'),
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');

        // Also try to read sourced files for color definitions
        let fullContent = content;
        const sourceMatches = content.matchAll(/source\s*=\s*(.+)/g);
        for (const sm of sourceMatches) {
          let sourcePath = sm[1].trim();
          sourcePath = sourcePath.replace(/^~/, os.homedir());
          try {
            if (fs.existsSync(sourcePath)) {
              fullContent += '\n' + fs.readFileSync(sourcePath, 'utf8');
            }
          } catch (e) { /* skip unreadable sources */ }
        }

        const parsed = parseHyprlandConfig(fullContent);
        if (parsed.primary !== defaults.primary || parsed.secondary !== defaults.secondary) {
          return parsed;
        }
        return parsed; // return even defaults if we found a config
      }
    }
  } catch (e) {
    console.warn('Could not read Hyprland config:', e);
  }

  return defaults;
}

export function DEThemeProvider({ children }) {
  const [deTheme, setDEThemeState] = useState(
    () => localStorage.getItem('app-de-theme') || 'gnome'
  );
  const [hyprColors, setHyprColors] = useState({ primary: '#7dcfff', secondary: '#bb9af7' });

  // Read Hyprland colors on mount and when switching to hyprland
  useEffect(() => {
    if (deTheme === 'hyprland') {
      const colors = readHyprlandColors();
      setHyprColors(colors);
    }
  }, [deTheme]);

  const setDETheme = useCallback((newTheme) => {
    setDEThemeState(newTheme);
    localStorage.setItem('app-de-theme', newTheme);
  }, []);

  const cycleTheme = useCallback(() => {
    const currentIndex = availableThemes.findIndex(t => t.id === deTheme);
    const nextIndex = (currentIndex + 1) % availableThemes.length;
    setDETheme(availableThemes[nextIndex].id);
  }, [deTheme, setDETheme]);

  // Apply data-de attribute and Hyprland CSS variables
  useEffect(() => {
    document.documentElement.setAttribute('data-de', deTheme);

    if (deTheme === 'hyprland') {
      document.documentElement.style.setProperty('--hypr-accent', hyprColors.primary);
      document.documentElement.style.setProperty('--hypr-accent2', hyprColors.secondary);
    } else {
      document.documentElement.style.removeProperty('--hypr-accent');
      document.documentElement.style.removeProperty('--hypr-accent2');
    }
  }, [deTheme, hyprColors]);

  const value = {
    deTheme,
    setDETheme,
    cycleTheme,
    availableThemes,
    hyprColors,
    isHyprland: deTheme === 'hyprland',
  };

  return (
    <DEThemeContext.Provider value={value}>
      {children}
    </DEThemeContext.Provider>
  );
}

export function useDETheme() {
  const ctx = useContext(DEThemeContext);
  if (!ctx) {
    throw new Error('useDETheme must be used within DEThemeProvider');
  }
  return ctx;
}

export default DEThemeContext;
