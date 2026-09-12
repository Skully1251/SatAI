import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { DrawMode } from './mapTypes';

interface MapToolbarProps {
  drawMode: DrawMode;
  hasRegion: boolean;
  onSelectMode: (mode: DrawMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClearRegion: () => void;
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  soon?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  label,
  active = false,
  soon = false,
  onPress,
  children,
}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    style={[styles.toolButton, active && styles.toolButtonActive, soon && styles.toolButtonSoon]}
    onPress={onPress}
    activeOpacity={0.75}
    disabled={soon}
  >
    {children}
    {soon && (
      <View style={styles.soonBadge}>
        <Text style={styles.soonBadgeText}>soon</Text>
      </View>
    )}
  </TouchableOpacity>
);

/** Vertical map interaction tools, bottom-right, matching the eco theme. */
export const MapToolbar: React.FC<MapToolbarProps> = ({
  drawMode,
  hasRegion,
  onSelectMode,
  onZoomIn,
  onZoomOut,
  onClearRegion,
}) => {
  const iconColor = (active: boolean) => (active ? '#FAF7F2' : colors.forestDark);

  return (
    <View style={styles.toolbar}>
      {/* Draw polygon — tap vertices on the map, double-tap to close */}
      <ToolButton
        label="Draw polygon"
        active={drawMode === 'polygon'}
        onPress={() => onSelectMode(drawMode === 'polygon' ? null : 'polygon')}
      >
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 17 L8 5 L15 7 L20 14 L11 20 L4 17 Z"
            stroke={iconColor(drawMode === 'polygon')}
            strokeWidth="2"
            strokeLinejoin="round"
            fill={drawMode === 'polygon' ? 'rgba(250,247,242,0.22)' : 'none'}
          />
          <Circle cx="8" cy="5" r="1.7" fill={iconColor(drawMode === 'polygon')} />
        </Svg>
      </ToolButton>

      {/* Draw rectangle — press and drag on the map */}
      <ToolButton
        label="Draw rectangle"
        active={drawMode === 'rect'}
        onPress={() => onSelectMode(drawMode === 'rect' ? null : 'rect')}
      >
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
          <Rect
            x="4"
            y="6"
            width="16"
            height="12"
            rx="2"
            stroke={iconColor(drawMode === 'rect')}
            strokeWidth="2"
            fill={drawMode === 'rect' ? 'rgba(250,247,242,0.22)' : 'none'}
          />
        </Svg>
      </ToolButton>

      {/* Clear drawn region (only when something is drawn) */}
      {hasRegion && (
        <ToolButton label="Clear region" onPress={onClearRegion}>
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 7 L19 7 M9 7 V5 h6 v2 M7 7 l1 12 h8 l1 -12"
              stroke={colors.terracotta}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </ToolButton>
      )}

      <View style={styles.divider} />

      {/* Zoom controls */}
      <ToolButton label="Zoom in" onPress={onZoomIn}>
        <Text style={styles.zoomText}>+</Text>
      </ToolButton>
      <ToolButton label="Zoom out" onPress={onZoomOut}>
        <Text style={styles.zoomText}>−</Text>
      </ToolButton>

      <View style={styles.divider} />

      {/* Placeholder slots — more tools thought of later */}
      <ToolButton label="Data layers" soon>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <G>
            <Path
              d="M12 3 L21 8 L12 13 L3 8 L12 3 Z"
              stroke={colors.forestDark}
              strokeWidth="1.9"
              strokeLinejoin="round"
              opacity={0.55}
            />
            <Path
              d="M3 12.5 L12 17.5 L21 12.5"
              stroke={colors.forestDark}
              strokeWidth="1.9"
              strokeLinejoin="round"
              fill="none"
              opacity={0.55}
            />
            <Path
              d="M3 17 L12 22 L21 17"
              stroke={colors.forestDark}
              strokeWidth="1.9"
              strokeLinejoin="round"
              fill="none"
              opacity={0.55}
            />
          </G>
        </Svg>
      </ToolButton>

      <ToolButton label="Locate me" soon>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Circle
            cx="12"
            cy="12"
            r="3.2"
            stroke={colors.forestDark}
            strokeWidth="1.9"
            opacity={0.55}
          />
          <Path
            d="M12 2.5 V6 M12 18 V21.5 M2.5 12 H6 M18 12 H21.5"
            stroke={colors.forestDark}
            strokeWidth="1.9"
            strokeLinecap="round"
            opacity={0.55}
          />
        </Svg>
      </ToolButton>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    backgroundColor: colors.mapZoomBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.mapZoomBorder,
    paddingVertical: 5,
    alignItems: 'center',
    zIndex: 30,
    ...shadows.card,
    ...Platform.select({
      web: { boxShadow: '0 10px 30px rgba(24, 46, 31, 0.18)' },
    }),
  },
  toolButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
      },
    }),
  },
  toolButtonActive: {
    backgroundColor: colors.forestGreen,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  toolButtonSoon: {
    opacity: 0.75,
  },
  soonBadge: {
    position: 'absolute',
    right: -2,
    bottom: 1,
    backgroundColor: colors.terracotta,
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
  },
  soonBadgeText: {
    color: colors.white,
    fontSize: 6.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  divider: {
    width: 26,
    height: 1,
    backgroundColor: colors.mapZoomBorder,
    marginVertical: 4,
  },
  zoomText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.forestDark,
    lineHeight: 22,
  },
});
