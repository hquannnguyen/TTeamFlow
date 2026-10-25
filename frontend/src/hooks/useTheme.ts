import { create } from 'zustand';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tteamflow-theme';

function readInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // localStorage có thể bị chặn (chế độ riêng tư) — dùng mặc định theo hệ điều hành
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // bỏ qua
  }
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: 'light',
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));

/** Gọi một lần trước khi render để không bị chớp sáng/tối khi tải trang. */
export function initTheme() {
  const theme = readInitialTheme();
  document.documentElement.dataset.theme = theme;
  useTheme.setState({ theme });
}
