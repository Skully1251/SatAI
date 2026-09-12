import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { colors } from '../../theme/colors';

export const BotanicalBackground: React.FC = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Bottom Left Leaf Silhouette */}
      <View style={styles.bottomLeftContainer}>
        <Svg width={380} height={420} viewBox="0 0 380 420" fill="none">
          <G opacity={0.22}>
            {/* Main stem curving upward */}
            <Path
              d="M-40 460 C 20 380, 80 260, 110 80"
              stroke={colors.leafSilhouette}
              strokeWidth={4.5}
              strokeLinecap="round"
            />
            {/* Leaf pairs radiating outward */}
            <Path
              d="M30 400 C 60 360, 120 370, 150 410 C 100 430, 50 420, 30 400 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M50 340 C 90 310, 160 315, 190 350 C 140 370, 80 365, 50 340 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M68 280 C 110 240, 190 245, 230 285 C 170 305, 100 300, 68 280 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M85 220 C 130 180, 210 185, 250 225 C 190 245, 120 240, 85 220 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M98 150 C 140 110, 215 115, 255 155 C 195 175, 130 170, 98 150 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M108 90 C 135 60, 190 65, 220 95 C 175 110, 130 105, 108 90 Z"
              fill={colors.leafSilhouette}
            />
            {/* Left side offshoots */}
            <Path
              d="M20 360 C -10 320, -50 330, -70 365 C -30 380, 5 375, 20 360 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M40 300 C 5 265, -30 270, -60 305 C -20 320, 20 315, 40 300 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M60 230 C 25 190, -10 200, -35 235 C 0 250, 40 245, 60 230 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M78 165 C 45 130, 10 135, -10 170 C 20 185, 60 180, 78 165 Z"
              fill={colors.leafSilhouette}
            />
            {/* Terminal tip leaf */}
            <Path
              d="M110 80 C 115 30, 135 10, 140 -10 C 130 20, 120 50, 110 80 Z"
              fill={colors.leafSilhouette}
            />
          </G>
        </Svg>
      </View>

      {/* Top Right Leaf Silhouette */}
      <View style={styles.topRightContainer}>
        <Svg width={320} height={320} viewBox="0 0 320 320" fill="none">
          <G opacity={0.18}>
            {/* Stem arching down from top right */}
            <Path
              d="M340 -20 C 280 40, 220 120, 140 220"
              stroke={colors.leafSilhouette}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <Path
              d="M290 30 C 260 70, 200 70, 170 35 C 220 15, 270 20, 290 30 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M250 90 C 210 130, 150 130, 120 95 C 170 75, 230 80, 250 90 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M200 150 C 160 190, 100 190, 70 155 C 120 135, 180 140, 200 150 Z"
              fill={colors.leafSilhouette}
            />
            <Path
              d="M150 210 C 120 240, 70 240, 45 210 C 85 195, 135 200, 150 210 Z"
              fill={colors.leafSilhouette}
            />
          </G>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomLeftContainer: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    zIndex: 0,
  },
  topRightContainer: {
    position: 'absolute',
    top: -20,
    right: -20,
    zIndex: 0,
  },
});
