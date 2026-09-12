import { TextStyle, Platform } from 'react-native';
import { colors } from './colors';

const systemFont = Platform.select({
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'System',
});

const headlineFont = Platform.select({
  web: 'Geist, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'System',
});

export const typography: Record<string, TextStyle> = {
  displayLarge: {
    fontFamily: headlineFont,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: headlineFont,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  headlineSub: {
    fontFamily: systemFont,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodyLarge: {
    fontFamily: systemFont,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodyMedium: {
    fontFamily: systemFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.textPrimary,
  },
  bodySmall: {
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.textMuted,
  },
  labelLarge: {
    fontFamily: headlineFont,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labelMedium: {
    fontFamily: headlineFont,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipText: {
    fontFamily: systemFont,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.frostedChipText,
  },
};
