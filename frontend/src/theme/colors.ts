/**
 * Color tokens directly extracted from the Stitch MCP "Sat AI Unauthorized View"
 * screen (projects/13419470046750908167/screens/5552c2bbe77041178f4209d2bbfdace3).
 */
export const colors = {
  // Global Canvas / Sage theme
  sageBg: '#94B196',
  sageBgLight: '#9EBCA0',
  sageBgDark: '#85A287',
  sageBorder: 'rgba(255, 255, 255, 0.25)',
  
  // Botanical Silhouettes
  leafSilhouette: '#7D9E80',
  
  // Left Sidebar - Warm Ivory / Cream
  creamSidebar: '#FAF7F2',
  creamSidebarHover: '#F2EDE2',
  creamSidebarActive: '#E8E1D2',
  creamBorder: '#E8E2D7',
  creamCard: '#F5F1E8',
  
  // Brand & Action Buttons
  terracotta: '#C56B51',
  terracottaHover: '#B25A41',
  forestGreen: '#4E8D66',
  forestGreenHover: '#437C59',
  forestDark: '#1E3524',
  leafGreen: '#3F7A4D',
  
  // Text Colors
  textPrimary: '#19271E',
  textSecondary: '#3F5244',
  textMuted: '#687D6E',
  textLight: '#FAF7F2',
  
  // Search / Input Bar
  white: '#FFFFFF',
  inputBorder: 'rgba(255, 255, 255, 0.8)',
  inputPlaceholder: '#7A8F7F',
  
  // Suggested Prompt Chips (Frosted Glass)
  frostedChipBg: 'rgba(255, 255, 255, 0.42)',
  frostedChipBgHover: 'rgba(255, 255, 255, 0.65)',
  frostedChipBorder: 'rgba(255, 255, 255, 0.38)',
  frostedChipText: '#233827',
  
  // User & AI Messages
  userBubbleBg: '#F3EFE7',
  userBubbleText: '#1D2E21',
  aiBubbleText: '#19271E',
  
  // Organic Map Preview Card
  mapFrameBezel: '#FAF7F2',
  mapBackground: '#E8E3D8',
  mapParkGreen: '#A6CFA3',
  mapWaterBlue: '#A4D2E8',
  mapRoadColor: '#FFFFFF',
  mapPinGreen: '#245233',
  mapPinDot: '#FFFFFF',
  mapZoomBg: 'rgba(255, 255, 255, 0.9)',
  mapZoomBorder: '#E2DDD2',
};

export type ThemeColors = typeof colors;
