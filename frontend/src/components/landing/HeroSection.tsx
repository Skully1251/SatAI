import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

interface HeroSectionProps {
  onGetStarted: () => void;
  onScrollHowToUse: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onScrollHowToUse,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const [zoom, setZoom] = useState(1);

  return (
    <View style={styles.sectionContainer}>
      <View style={[styles.gridContainer, !isDesktop && styles.gridStacked]}>
        {/* Left: Punchy Hero Content */}
        <View style={styles.contentColumn}>
          <Text style={styles.heroHeadline}>
            Explore Nature.{'\n'}
            Analyze Climate.{'\n'}
            <Text style={styles.heroHeadlineAccent}>Synthesize with AI.</Text>
          </Text>

          <Text style={styles.heroSubtitle}>
            Sat AI bridges spatial GIS intelligence with conversational generative models. Chat
            with environmental datasets and query regional satellite eco-metrics in real-time.
          </Text>

          {/* Action CTAs */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={styles.getStartedBtn}
              onPress={onGetStarted}
              activeOpacity={0.88}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M13.5 4.5L21 12M21 12L13.5 19.5M21 12H3"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.howToUseBtn}
              onPress={onScrollHowToUse}
              activeOpacity={0.8}
            >
              <Text style={styles.howToUseText}>How to Use</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right: Signature Curved Map Card */}
        <View style={styles.visualColumn}>
          <View style={styles.cardBezel}>
            {/* Inner Map View */}
            <View style={styles.mapInner}>
              <Svg width="100%" height="100%" viewBox="0 0 340 320" preserveAspectRatio="xMidYMid slice">
                {/* Background Base */}
                <Rect x="0" y="0" width="340" height="320" fill="#E4DFD7" />

                {/* Street Grid */}
                <Line x1="0" y1="80" x2="340" y2="80" stroke="#FFFFFF" strokeWidth="6" />
                <Line x1="0" y1="200" x2="340" y2="200" stroke="#FFFFFF" strokeWidth="6" />
                <Line x1="80" y1="0" x2="80" y2="320" stroke="#FFFFFF" strokeWidth="6" />
                <Line x1="260" y1="0" x2="260" y2="320" stroke="#FFFFFF" strokeWidth="6" />
                <Line x1="0" y1="130" x2="340" y2="100" stroke="#BED3BE" strokeWidth="3" />

                {/* Nature Reserve Polygon */}
                <Path
                  d="M40 50 C120 40, 280 60, 300 130 C310 200, 260 260, 180 270 C100 280, 40 230, 30 150 C25 90, 35 60, 40 50 Z"
                  fill="#B9D3BB"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />

                {/* Lake / Water Body */}
                <Path
                  d="M220 120 C250 130, 270 160, 260 190 C240 210, 210 200, 200 170 C195 140, 210 115, 220 120 Z"
                  fill="#96C4E0"
                  opacity={0.88}
                />

                {/* Sanctuary Walking Trail */}
                <Path
                  d="M50 170 C90 120, 140 140, 180 200"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeDasharray="4, 4"
                  fill="none"
                />

                {/* Location Pin */}
                <Circle cx="160" cy="155" r="16" fill={colors.forestDark} stroke="#FFFFFF" strokeWidth="2" />
                <Circle cx="160" cy="155" r="5" fill="#FFFFFF" />
              </Svg>

              {/* Floating Zoom Controls */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom((z) => Math.min(z + 0.15, 1.4))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.zoomBtnText}>+</Text>
                </TouchableOpacity>
                <View style={styles.zoomDivider} />
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={() => setZoom((z) => Math.max(z - 0.15, 0.85))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.zoomBtnText}>−</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Clean Card Footer */}
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.cardFooterTitle}>Eco-Spatial Map Matrix</Text>
                <Text style={styles.cardFooterSubtitle}>GIS overlays & regional satellite data</Text>
              </View>
              <View style={styles.interactiveBadge}>
                <Text style={styles.interactiveBadgeText}>Interactive</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    minHeight: Platform.select<any>({ web: '100vh', default: 750 }),
    justifyContent: 'center',
    paddingTop: 96,
    paddingBottom: 40,
    zIndex: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 48,
  },
  gridStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 40,
  },
  contentColumn: {
    flex: 1,
    maxWidth: 600,
  },
  heroHeadline: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.8,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  heroHeadlineAccent: {
    fontWeight: '400',
    color: colors.forestDark,
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 28,
    color: 'rgba(25, 39, 30, 0.85)',
    marginTop: 20,
    marginBottom: 32,
    maxWidth: 520,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.terracotta,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radii.full,
    ...shadows.card,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s, background-color 0.2s',
      },
    }),
  },
  getStartedText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  howToUseBtn: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      },
    }),
  },
  howToUseText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  visualColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBezel: {
    backgroundColor: colors.creamSidebar,
    borderRadius: 48,
    borderTopLeftRadius: 100,
    padding: 20,
    width: 380,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    ...shadows.card,
  },
  mapInner: {
    height: 280,
    borderRadius: 36,
    borderTopLeftRadius: 80,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E4DFD7',
    borderWidth: 1,
    borderColor: '#D6CFC5',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2DDD2',
    width: 28,
    overflow: 'hidden',
    ...shadows.subtle,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E2DDD2',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  cardFooterTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardFooterSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  interactiveBadge: {
    backgroundColor: 'rgba(163, 184, 153, 0.4)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  interactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.forestDark,
  },
});
