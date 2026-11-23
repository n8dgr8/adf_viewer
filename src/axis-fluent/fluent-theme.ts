import {
  BrandVariants,
  Theme,
  createDarkTheme,
  createLightTheme,
} from '@fluentui/react-components';

/**
 * Axis Communications brand color ramp (10..160) centered around Axis Yellow (#FFCC00 / #E6B800)
 * and high-contrast dark/light surfaces matching @axiscommunications/fluent-theme.
 */
export const axisBrandVariants: BrandVariants = {
  10: '#241B00',
  20: '#382B00',
  30: '#4D3B00',
  40: '#634D00',
  50: '#7A5F00',
  60: '#947300',
  70: '#B08900',
  80: '#CC9F00',
  90: '#E6B800',
  100: '#FFCC00',
  110: '#FFD426',
  120: '#FFDC4D',
  130: '#FFE373',
  140: '#FFEB99',
  150: '#FFF2BF',
  160: '#FFF9E5',
};

export const axisDarkTheme: Theme = {
  ...createDarkTheme(axisBrandVariants),
  colorBrandBackground: '#FFCC00',
  colorBrandBackgroundHover: '#FFD426',
  colorBrandBackgroundPressed: '#E6B800',
  colorBrandBackgroundSelected: '#FFCC00',
  colorNeutralForegroundOnBrand: '#141414',
  colorBrandForeground1: '#FFCC00',
  colorBrandForeground2: '#FFD426',
  colorBrandForegroundLink: '#FFCC00',
  colorBrandForegroundLinkHover: '#FFD426',
  colorCompoundBrandStroke: '#FFCC00',
  colorCompoundBrandStrokeHover: '#FFD426',
  colorCompoundBrandBackground: '#FFCC00',
  colorCompoundBrandBackgroundHover: '#FFD426',
  colorCompoundBrandForeground1: '#FFCC00',
  colorNeutralBackground1: '#181818',
  colorNeutralBackground2: '#1F1F1F',
  colorNeutralBackground3: '#262626',
  colorNeutralBackground4: '#2E2E2E',
};

export const axisLightTheme: Theme = {
  ...createLightTheme(axisBrandVariants),
  colorBrandBackground: '#FFCC00',
  colorBrandBackgroundHover: '#E6B800',
  colorBrandBackgroundPressed: '#CC9F00',
  colorBrandBackgroundSelected: '#E6B800',
  colorNeutralForegroundOnBrand: '#141414',
  colorBrandForeground1: '#8A6D00',
  colorBrandForeground2: '#634D00',
  colorCompoundBrandStroke: '#CC9F00',
  colorCompoundBrandBackground: '#FFCC00',
  colorCompoundBrandForeground1: '#8A6D00',
};
