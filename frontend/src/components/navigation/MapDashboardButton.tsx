import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

interface MapDashboardButtonProps {
  onPress: () => void;
  visible?: boolean;
  animatedStyle?: any;
}

export const MapDashboardButton: React.FC<MapDashboardButtonProps> = ({
  onPress,
  visible = true,
  animatedStyle,
}) => {
  // Pulsing animation for the "live" indicator dot
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!visible) return null;

  const content = (
    <TouchableOpacity
      style={styles.buttonContainer}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Live Glowing Pulse Indicator */}
      <View style={styles.pulseDotWrapper}>
        <Animated.View
          style={[
            styles.pulseHalo,
            {
              transform: [{ scale: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [1, 1.8] }) }],
              opacity: pulseAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.6, 0] }),
            },
          ]}
        />
        <View style={styles.pulseCore} />
      </View>

      {/* Stylized Eco-Map Icon */}
      <View style={styles.iconContainer}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          {/* Folded map representation */}
          <Path
            d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9 3V18"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <Path
            d="M15 6V21"
            stroke="#FFFFFF"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Button Label */}
      <View style={styles.textContainer}>
        <Text style={styles.buttonTitle}>Map Dashboard</Text>
      </View>

      {/* Eye-catching "Explore" badge */}
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>Explore ›</Text>
      </View>
    </TouchableOpacity>
  );

  if (animatedStyle) {
    return (
      <Animated.View style={[styles.wrapper, animatedStyle]}>
        {content}
      </Animated.View>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E4A2F', // Rich, deep forest eco-green
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    ...shadows.card,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 22px rgba(18, 48, 28, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        cursor: 'pointer',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s',
      },
    }),
  },
  pulseDotWrapper: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pulseHalo: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6EE7B7', // Bright mint glow
  },
  pulseCore: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399', // Vivid emerald green
  },
  iconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginRight: 10,
  },
  buttonTitle: {
    color: '#FAF7F2',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radii.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    color: '#FAF7F2',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
