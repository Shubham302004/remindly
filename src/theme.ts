const dark = {
  background: '#0B0F17', surface: '#121A26', surfaceAlt: '#1B2635', text: '#F2F5FF', muted: '#9AA7BD',
  border: '#2A3648', primary: '#A78BFA', primarySoft: '#28213D', accent: '#54D9C6', danger: '#FF7A90',
  dangerSoft: '#3C2631', success: '#5BD6A8', shadow: '#000000', tab: '#101722',
};
export type Palette = typeof dark;
export function usePalette(): Palette { return dark; }
