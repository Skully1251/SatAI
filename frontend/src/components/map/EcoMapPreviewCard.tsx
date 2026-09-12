import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, ClipPath } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

interface EcoMapPreviewCardProps {
  onPressExplore?: () => void;
}

export const EcoMapPreviewCard: React.FC<EcoMapPreviewCardProps> = ({ onPressExplore }) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setZoomLevel((z) => Math.min(z + 0.15, 1.4));
  };

  const handleZoomOut = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setZoomLevel((z) => Math.max(z - 0.15, 0.85));
  };

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity
        style={styles.cardBezel}
        onPress={onPressExplore}
        activeOpacity={0.92}
      >
        <View style={styles.mapViewport}>
          <Svg width="100%" height="100%" viewBox="0 0 320 380" preserveAspectRatio="xMidYMid slice">
            <Defs>
              <ClipPath id="mapCardClip">
                <Rect x="0" y="0" width="320" height="380" rx="20" ry="20" />
              </ClipPath>
            </Defs>

            <G clipPath="url(#mapCardClip)">
              {/* City Urban Background Grid */}
              <Rect x="0" y="0" width="320" height="380" fill="#EAE5DB" />

              {/* Diagonal and Orthogonal City Blocks */}
              <G stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity={0.95}>
                <Path d="M-20 40 L340 320" />
                <Path d="M30 -20 L350 240" />
                <Path d="M-20 180 L340 -40" />
                <Path d="M-20 320 L340 100" />
                <Path d="M80 0 L80 380" strokeWidth="5" />
                <Path d="M240 0 L240 380" strokeWidth="5" />
                <Path d="M0 120 L320 120" strokeWidth="5" />
                <Path d="M0 260 L320 260" strokeWidth="5" />
              </G>

              {/* Subtle Urban Buildings Blocks */}
              <G fill="#E0DAD0" opacity={0.6}>
                <Rect x="15" y="15" width="45" height="35" rx="3" />
                <Rect x="15" y="60" width="45" height="40" rx="3" />
                <Rect x="20" y="135" width="40" height="45" rx="3" />
                <Rect x="20" y="275" width="45" height="45" rx="3" />
                <Rect x="255" y="15" width="50" height="40" rx="3" />
                <Rect x="255" y="65" width="50" height="45" rx="3" />
                <Rect x="255" y="275" width="50" height="50" rx="3" />
              </G>

              {/* Central Ecological Nature Reserve Polygon */}
              <G transform={`scale(${zoomLevel})`} origin="160, 190">
                {/* Outer Eco-zone buffer */}
                <Path
                  d="M160 70 C220 75, 270 120, 260 190 C250 250, 210 295, 150 290 C95 285, 65 240, 75 175 C82 120, 115 65, 160 70 Z"
                  fill="#9CC59A"
                  stroke="#FFFFFF"
                  strokeWidth="4"
                />

                {/* Inner Core Conservation Forest */}
                <Path
                  d="M160 85 C205 90, 245 130, 238 185 C230 235, 198 272, 150 268 C105 264, 82 225, 90 170 C96 125, 122 80, 160 85 Z"
                  fill="#A8D1A6"
                />

                {/* Organic Water Body / Lake inside Nature Reserve */}
                <Path
                  d="M205 160 C215 170, 222 195, 215 210 C208 222, 195 220, 192 205 C189 192, 198 178, 195 165 C198 155, 202 152, 205 160 Z"
                  fill="#99CDE6"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                
                <Circle cx="150" cy="140" r="5" fill="#99CDE6" />

                {/* Scenic Park Walking Trails */}
                <G stroke="#FBF8F2" strokeWidth="2" strokeDasharray="3, 3" fill="none" opacity={0.9}>
                  <Path d="M110 220 C130 200, 140 180, 160 185 C180 190, 190 230, 210 240" />
                  <Path d="M140 120 C155 140, 165 170, 160 210" />
                  <Path d="M120 160 C140 170, 175 165, 190 145" />
                </G>

                {/* Primary Location Pin Marker */}
                <G transform="translate(160, 185)">
                  <Circle cx="0" cy="5" r="7" fill="rgba(25, 45, 30, 0.25)" />
                  <Path
                    d="M0 2 C-9 2, -12 -8, -12 -15 C-12 -23, -5 -29, 0 -29 C5 -29, 12 -23, 12 -15 C12 -8, 9 2, 0 2 Z"
                    fill={colors.mapPinGreen}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <Circle cx="0" cy="-15" r="4.5" fill={colors.mapPinDot} />
                </G>
              </G>
            </G>
          </Svg>

          {/* Bottom Explore Hint Pill */}
          <View style={styles.explorePill}>
            <View style={styles.exploreDot} />
            <Text style={styles.exploreText}>Open Map Dashboard ›</Text>
          </View>

          {/* Floating Zoom Controls (+ / -) in bottom-right corner */}
          <View style={styles.zoomControlContainer}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <Text style={styles.zoomText}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBezel: {
    backgroundColor: colors.mapFrameBezel,
    padding: 16,
    borderTopLeftRadius: radii.archedCardTL,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: radii.archedCardBR,
    width: 320,
    height: 380,
    ...shadows.card,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 36px rgba(24, 46, 31, 0.16)',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      },
    }),
  },
  mapViewport: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EAE5DB',
  },
  explorePill: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(25, 48, 32, 0.85)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...shadows.subtle,
  },
  exploreDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6EE7B7',
  },
  exploreText: {
    color: '#FAF7F2',
    fontSize: 11,
    fontWeight: '600',
  },
  zoomControlContainer: {
    position: 'absolute',
    right: 12,
    bottom: 16,
    backgroundColor: colors.mapZoomBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.mapZoomBorder,
    alignItems: 'center',
    width: 28,
    overflow: 'hidden',
    ...shadows.subtle,
    zIndex: 10,
  },
  zoomButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  zoomDivider: {
    width: 20,
    height: 1,
    backgroundColor: colors.mapZoomBorder,
  },
});
