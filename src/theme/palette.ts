// Theme data: base palettes, accent overlays, streak heat colors, and resolver

export const PALETTE = {
  light: {
    brand: '#10B981',
    brandDeep: '#065F46',
    brandTint: '#D1FAE5',
    brandTintSoft: '#ECFDF5',
    accent: '#2563EB',
    accentDeep: '#1E40AF',
    accentText: '#2563EB',
    accentTint: '#DBEAFE',
    accentCard: '#EFF6FF',
    error: '#B91C1C',
    errorTint: '#FEF2F2',
    amber: '#F59E0B',
    amberTint: '#FEF3C7',
    amberText: '#92400E',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    page: '#F3F4F6',
    tile: '#F9FAFB',
    border: '#E5E7EB',
    white: '#FFFFFF',
    onBrand: '#FFFFFF',
    inputBg: '#FAFAFA',
    pillBg: '#F3F4F6',
    pillText: '#374151',
    pillWalkingBg: '#ECFDF5',
    pillWalkingText: '#065F46',
    pillCyclingBg: '#DBEAFE',
    pillCyclingText: '#1E40AF',
  },
  dark: {
    brand: '#10B981',
    brandDeep: '#34D399',
    brandTint: '#065F46',
    brandTintSoft: '#064E3B',
    accent: '#3B82F6',
    accentDeep: '#93C5FD',
    accentText: '#93C5FD',
    accentTint: '#1E3A8A',
    accentCard: '#1E3A8A',
    error: '#FCA5A5',
    errorTint: '#7F1D1D',
    amber: '#F59E0B',
    amberTint: '#78350F',
    amberText: '#FCD34D',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    page: '#0B1220',
    tile: '#111827',
    border: '#374151',
    white: '#1F2937',
    onBrand: '#FFFFFF',
    inputBg: '#111827',
    pillBg: '#374151',
    pillText: '#D1D5DB',
    pillWalkingBg: '#064E3B',
    pillWalkingText: '#6EE7B7',
    pillCyclingBg: '#1E3A8A',
    pillCyclingText: '#93C5FD',
  },
};

export const ACCENTS: Record<string, any> = {
  green: {
    label: 'Green',
    light: {
      primary: '#10B981', primaryOnTint: '#FFFFFF', primarySoft: '#D1FAE5',
      primarySoftAlt: '#ECFDF5', primaryText: '#10B981', primaryTextOnSoft: '#065F46',
    },
    dark: {
      primary: '#10B981', primaryOnTint: '#FFFFFF', primarySoftDark: '#065F46',
      primarySoftAltDark: '#064E3B', primaryText: '#34D399', primaryTextOnSoft: '#34D399',
    },
  },
  blue: {
    label: 'Blue',
    light: {
      primary: '#2563EB', primaryOnTint: '#FFFFFF', primarySoft: '#DBEAFE',
      primarySoftAlt: '#EFF6FF', primaryText: '#2563EB', primaryTextOnSoft: '#1E40AF',
    },
    dark: {
      primary: '#60A5FA', primaryOnTint: '#0B1220', primarySoftDark: '#1E3A8A',
      primarySoftAltDark: '#172554', primaryText: '#93C5FD', primaryTextOnSoft: '#93C5FD',
    },
  },
  orange: {
    label: 'Orange',
    light: {
      primary: '#EA580C', primaryOnTint: '#FFFFFF', primarySoft: '#FFEDD5',
      primarySoftAlt: '#FFF7ED', primaryText: '#EA580C', primaryTextOnSoft: '#9A3412',
    },
    dark: {
      primary: '#FB923C', primaryOnTint: '#0B1220', primarySoftDark: '#7C2D12',
      primarySoftAltDark: '#431407', primaryText: '#FDBA74', primaryTextOnSoft: '#FDBA74',
    },
  },
  violet: {
    label: 'Violet',
    light: {
      primary: '#7C3AED', primaryOnTint: '#FFFFFF', primarySoft: '#EDE9FE',
      primarySoftAlt: '#F5F3FF', primaryText: '#7C3AED', primaryTextOnSoft: '#5B21B6',
    },
    dark: {
      primary: '#A78BFA', primaryOnTint: '#0B1220', primarySoftDark: '#4C1D95',
      primarySoftAltDark: '#2E1065', primaryText: '#C4B5FD', primaryTextOnSoft: '#C4B5FD',
    },
  },
  rose: {
    label: 'Rose',
    light: {
      primary: '#DB2777', primaryOnTint: '#FFFFFF', primarySoft: '#FCE7F3',
      primarySoftAlt: '#FDF2F8', primaryText: '#DB2777', primaryTextOnSoft: '#9D174D',
    },
    dark: {
      primary: '#F472B6', primaryOnTint: '#0B1220', primarySoftDark: '#831843',
      primarySoftAltDark: '#500724', primaryText: '#F9A8D4', primaryTextOnSoft: '#F9A8D4',
    },
  },
  teal: {
    label: 'Teal',
    light: {
      primary: '#0D9488', primaryOnTint: '#FFFFFF', primarySoft: '#CCFBF1',
      primarySoftAlt: '#F0FDFA', primaryText: '#0D9488', primaryTextOnSoft: '#115E59',
    },
    dark: {
      primary: '#2DD4BF', primaryOnTint: '#0B1220', primarySoftDark: '#134E4A',
      primarySoftAltDark: '#042F2E', primaryText: '#5EEAD4', primaryTextOnSoft: '#5EEAD4',
    },
  },
  coral: {
    label: 'Coral',
    light: {
      primary: '#E25D4E', primaryOnTint: '#FFFFFF', primarySoft: '#FCE3DC',
      primarySoftAlt: '#FEF2EF', primaryText: '#E25D4E', primaryTextOnSoft: '#9D3225',
    },
    dark: {
      primary: '#F4836E', primaryOnTint: '#0B1220', primarySoftDark: '#6E2517',
      primarySoftAltDark: '#40130A', primaryText: '#F9AB95', primaryTextOnSoft: '#F9AB95',
    },
  },
};

export const ACCENT_NAMES = ['green', 'blue', 'orange', 'violet', 'rose', 'teal', 'coral'];

export const RING_COLORS: Record<'light' | 'dark', Record<string | number, string>> = {
  light: { 0: '#E5E7EB', 1: '#A7F3D0', 2: '#6EE7B7', 3: '#10B981', hollowBorder: '#D1D5DB' },
  dark: { 0: '#1F2937', 1: '#065F46', 2: '#059669', 3: '#34D399', hollowBorder: '#374151' },
};

export function makePalette(modeName: string, accentName: string) {
  const base = (PALETTE as any)[modeName] || PALETTE.light;
  const accent = ACCENTS[accentName] || ACCENTS.green;
  if (modeName === 'dark') {
    const { primarySoftDark, primarySoftAltDark, ...rest } = accent.dark;
    return {
      ...base,
      ...rest,
      primarySoft: primarySoftDark,
      primarySoftAlt: primarySoftAltDark,
    };
  }
  return { ...base, ...accent.light };
}
