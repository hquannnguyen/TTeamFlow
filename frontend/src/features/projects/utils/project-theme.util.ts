export interface ProjectTheme {
  id: string;
  name: string;
  accentGradient: string;
  badgeBg: string;
  badgeColor: string;
  softBg: string;
  textAccent: string;
  progressGradient: string;
}

export const PROJECT_THEMES: ProjectTheme[] = [
  {
    id: 'indigo',
    name: 'Tím Indigo',
    accentGradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
    badgeBg: '#4f46e5',
    badgeColor: '#ffffff',
    softBg: '#eef2ff',
    textAccent: '#4f46e5',
    progressGradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
  },
  {
    id: 'teal',
    name: 'Xanh ngọc',
    accentGradient: 'linear-gradient(90deg, #0d9488 0%, #10b981 100%)',
    badgeBg: '#0d9488',
    badgeColor: '#ffffff',
    softBg: '#f0fdfa',
    textAccent: '#0d9488',
    progressGradient: 'linear-gradient(90deg, #0d9488 0%, #10b981 100%)',
  },
  {
    id: 'orange',
    name: 'Cam hổ phách',
    accentGradient: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
    badgeBg: '#ea580c',
    badgeColor: '#ffffff',
    softBg: '#fff7ed',
    textAccent: '#c2410c',
    progressGradient: 'linear-gradient(90deg, #f59e0b 0%, #ea580c 100%)',
  },
  {
    id: 'rose',
    name: 'Hồng sen',
    accentGradient: 'linear-gradient(90deg, #f43f5e 0%, #ec4899 100%)',
    badgeBg: '#e11d48',
    badgeColor: '#ffffff',
    softBg: '#fff1f2',
    textAccent: '#e11d48',
    progressGradient: 'linear-gradient(90deg, #f43f5e 0%, #ec4899 100%)',
  },
  {
    id: 'sky',
    name: 'Xanh da trời',
    accentGradient: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)',
    badgeBg: '#0284c7',
    badgeColor: '#ffffff',
    softBg: '#f0f9ff',
    textAccent: '#0369a1',
    progressGradient: 'linear-gradient(90deg, #0284c7 0%, #2563eb 100%)',
  },
  {
    id: 'purple',
    name: 'Tím mận',
    accentGradient: 'linear-gradient(90deg, #9333ea 0%, #c026d3 100%)',
    badgeBg: '#7e22ce',
    badgeColor: '#ffffff',
    softBg: '#faf5ff',
    textAccent: '#7e22ce',
    progressGradient: 'linear-gradient(90deg, #9333ea 0%, #c026d3 100%)',
  },
  {
    id: 'emerald',
    name: 'Xanh lá tươi',
    accentGradient: 'linear-gradient(90deg, #16a34a 0%, #65a30d 100%)',
    badgeBg: '#15803d',
    badgeColor: '#ffffff',
    softBg: '#f0fdf4',
    textAccent: '#15803d',
    progressGradient: 'linear-gradient(90deg, #16a34a 0%, #65a30d 100%)',
  },
  {
    id: 'cyan',
    name: 'Xanh lơ biển',
    accentGradient: 'linear-gradient(90deg, #06b6d4 0%, #0284c7 100%)',
    badgeBg: '#0891b2',
    badgeColor: '#ffffff',
    softBg: '#ecfeff',
    textAccent: '#0e7490',
    progressGradient: 'linear-gradient(90deg, #06b6d4 0%, #0284c7 100%)',
  },
];

/**
 * Tạo theme màu sắc nhận diện tự động dựa trên mã dự án (projectKey) hoặc id.
 * Đảm bảo các dự án khác nhau có màu sắc khác nhau, dễ nhận diện trực quan.
 */
export function getProjectTheme(keyOrId?: string): ProjectTheme {
  if (!keyOrId) return PROJECT_THEMES[0];
  let hash = 0;
  for (let i = 0; i < keyOrId.length; i++) {
    hash = keyOrId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROJECT_THEMES.length;
  return PROJECT_THEMES[index];
}
