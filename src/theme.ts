import { useColorScheme } from 'react-native';

const light = {
  background: '#F4F6F1', surface: '#FFFFFF', surfaceAlt: '#EAEFE8', text: '#202820', muted: '#6F7B71',
  border: '#E1E7DE', primary: '#527A67', primarySoft: '#E1ECE4', accent: '#D6A05B', danger: '#B5564B',
  dangerSoft: '#F7E6E3', success: '#4D8063', shadow: '#1F3628', tab: '#FFFFFF',
};
const dark = {
  background: '#141A16', surface: '#1D2520', surfaceAlt: '#26312A', text: '#EFF4EF', muted: '#A8B5AA',
  border: '#344239', primary: '#9CC5A8', primarySoft: '#273B2F', accent: '#E0B16F', danger: '#E1978E',
  dangerSoft: '#422C29', success: '#9CC5A8', shadow: '#000000', tab: '#1D2520',
};
export type Palette = typeof light;
export function usePalette(): Palette { return useColorScheme() === 'dark' ? dark : light; }
