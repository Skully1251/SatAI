import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

export const HowToUseSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<any>(null);

  const togglePlay = () => {
    if (Platform.OS === 'web' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.headerBlock}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Intuitive Interface</Text>
          </View>
          <Text style={styles.sectionTitle}>How to Use Sat AI</Text>
          <Text style={styles.sectionSubtitle}>
            Seamlessly toggle between conversational prompts and spatial map exploration.
          </Text>
        </View>

        {/* 3-Column Grid: Steps Left + Center Video Mockup + Steps Right */}
        <View style={[styles.grid, !isDesktop && styles.gridStacked]}>
          {/* Left Column Steps (1 & 2) */}
          <View style={styles.stepsColumn}>
            {/* Step 1 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#E4EAE1' }]}>
                <Text style={[styles.stepNumberText, { color: colors.forestDark }]}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Conversational Query</Text>
              <Text style={styles.stepDesc}>
                Ask natural language questions about canopy cover, biodiversity, and regional climate trends.
              </Text>
            </View>

            {/* Step 2 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.stepNumberText, { color: '#92400E' }]}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Prompt Suggestions</Text>
              <Text style={styles.stepDesc}>
                Choose curated quick-prompts like "Analyze climate data for my region" to instantly inspect zones.
              </Text>
            </View>
          </View>

          {/* Center Column: Repeating Silent Video / GIF Showcase */}
          <View style={styles.videoColumn}>
            <View style={styles.videoWindow}>

              {/* Video Screen Container */}
              <View style={styles.screenContent}>
                {Platform.OS === 'web' ? (
                  // Web HTML5 Video element (sample video looping without audio)
                  // Using createElement / JSX directly for web
                  <video
                    ref={videoRef}
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 22,
                    }}
                  />
                ) : (
                  <View style={styles.fallbackVideoBox}>
                    <Text style={styles.fallbackText}>Sample Video Walkthrough</Text>
                  </View>
                )}

                {/* Central Play/Pause Toggle Button */}
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlay}
                  activeOpacity={0.85}
                >
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.forestDark}>
                    {isPlaying ? (
                      <Path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    ) : (
                      <Path d="M8 5v14l11-7z" />
                    )}
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Right Column Steps (3 & 4) */}
          <View style={styles.stepsColumn}>
            {/* Step 3 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepNumberBadge, { backgroundColor: colors.forestDark }]}>
                <Text style={[styles.stepNumberText, { color: colors.white }]}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Interactive Map Card</Text>
              <Text style={styles.stepDesc}>
                Click into the curved eco-map to explore coordinate layers and zoom into green sanctuaries.
              </Text>
            </View>

            {/* Step 4 */}
            <View style={styles.stepCard}>
              <View style={[styles.stepNumberBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.stepNumberText, { color: '#065F46' }]}>4</Text>
              </View>
              <Text style={styles.stepTitle}>Export & Plan</Text>
              <Text style={styles.stepDesc}>
                Synthesize actionable reports, download GIS shapefiles, and share ecological master plans.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionWrapper: {
    backgroundColor: colors.creamSidebar,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    paddingHorizontal: 24,
    minHeight: Platform.select<any>({ web: '100vh', default: 800 }),
    justifyContent: 'center',
    paddingTop: 88,
    paddingBottom: 48,
  },
  container: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 44,
  },
  badge: {
    backgroundColor: 'rgba(163, 184, 153, 0.35)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forestDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  sectionSubtitle: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 580,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  gridStacked: {
    flexDirection: 'column',
    gap: 32,
  },
  stepsColumn: {
    flex: 1,
    gap: 16,
    maxWidth: 310,
    width: '100%',
  },
  stepCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(228, 223, 220, 0.8)',
    ...shadows.subtle,
  },
  stepNumberBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 5,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  videoColumn: {
    flex: 1.65,
    width: '100%',
  },
  videoWindow: {
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(228, 223, 220, 0.9)',
    ...shadows.card,
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE5',
  },
  windowDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  windowTitle: {
    fontSize: 10.5,
    fontFamily: Platform.select({ web: 'monospace', default: 'Courier' }),
    color: colors.textMuted,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  screenContent: {
    height: 270,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1C2D22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackVideoBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: colors.white,
    fontSize: 14,
  },
  telemetryOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
  },
  telemetryBadge: {
    backgroundColor: 'rgba(20, 35, 24, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  telemetryPromptText: {
    color: '#FAF7F2',
    fontSize: 11,
    fontWeight: '600',
  },
  telemetrySyncText: {
    color: '#6EE7B7',
    fontSize: 9.5,
    marginTop: 2,
  },
  playButton: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: radii.full,
    backgroundColor: 'rgba(250, 247, 242, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform 0.2s' },
    }),
  },
  videoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  videoFooterText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  videoDurationText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.forestDark,
  },
});
