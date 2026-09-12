import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

export const FeaturesSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 640;
  const isDesktop = width >= 1024;

  const features = [
    {
      id: '1',
      title: 'Satellite Feeds',
      desc: 'Connect directly with multispectral imagery to examine vegetation index (NDVI) changes in near real-time.',
      badgeBg: 'rgba(163, 184, 153, 0.35)',
      badgeColor: colors.forestDark,
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={colors.forestDark} strokeWidth="1.8" />
          <Path d="M3.6 9h16.8M3.6 15h16.8" stroke={colors.forestDark} strokeWidth="1.8" />
          <Path d="M12 3a14.5 14.5 0 0 0 0 18 14.5 14.5 0 0 0 0-18z" stroke={colors.forestDark} strokeWidth="1.8" />
        </Svg>
      ),
    },
    {
      id: '2',
      title: 'Canopy Permeability',
      desc: 'Model urban heat islands and calculate watershed runoff absorption across historical precipitation benchmarks.',
      badgeBg: '#FDF2F0',
      badgeColor: colors.terracotta,
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" stroke={colors.terracotta} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      id: '3',
      title: 'Automated Master Frameworks',
      desc: 'Turn conversational queries into structured municipal master plans, zoning recommendations, and PDF reports.',
      badgeBg: 'rgba(163, 184, 153, 0.35)',
      badgeColor: colors.forestDark,
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" stroke={colors.forestDark} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      id: '4',
      title: 'Audited Data Integrity',
      desc: 'Calibrated against verified IPCC models and official biodiversity registries to eliminate coordinate hallucinations.',
      badgeBg: '#ECFDF5',
      badgeColor: '#047857',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      id: '5',
      title: 'Coordinate Pinning',
      desc: 'Attach specific latitude & longitude bounds directly into prompts to isolate designated conservation acreage.',
      badgeBg: 'rgba(163, 184, 153, 0.35)',
      badgeColor: colors.forestDark,
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" stroke={colors.forestDark} strokeWidth="1.8" />
          <Path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" stroke={colors.forestDark} strokeWidth="1.8" />
        </Svg>
      ),
    },
    {
      id: '6',
      title: 'Team Workspaces',
      desc: 'Share map pins, environmental research notebooks, and climate projections across academic and civic teams.',
      badgeBg: '#FEF3C7',
      badgeColor: '#B45309',
      icon: (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.199l-.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" stroke="#B45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ),
    },
  ];

  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.headerBlock}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Core Capabilities</Text>
          </View>
          <Text style={styles.sectionTitle}>Features Crafted for Ecological Depth</Text>
          <Text style={styles.sectionSubtitle}>
            Trained on audited environmental models, GIS coordinates, and live satellite intelligence.
          </Text>
        </View>

        {/* 6 Responsive Feature Cards */}
        <View
          style={[
            styles.cardsGrid,
            isTablet && styles.cardsGridTablet,
            isDesktop && styles.cardsGridDesktop,
          ]}
        >
          {features.map((feat) => (
            <View key={feat.id} style={styles.natureCard}>
              <View style={[styles.iconBox, { backgroundColor: feat.badgeBg }]}>
                {feat.icon}
              </View>
              <Text style={styles.cardTitle}>{feat.title}</Text>
              <Text style={styles.cardDesc}>{feat.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionWrapper: {
    paddingTop: 88,
    paddingBottom: 48,
    paddingHorizontal: 24,
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    minHeight: Platform.select<any>({ web: '100vh', default: 800 }),
    justifyContent: 'center',
  },
  container: {
    width: '100%',
  },
  headerBlock: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 56,
  },
  badge: {
    backgroundColor: colors.white,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    marginBottom: 12,
    ...shadows.subtle,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.terracotta,
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
    marginBottom: 10,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  sectionSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(25, 39, 30, 0.8)',
    textAlign: 'center',
    maxWidth: 580,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  cardsGridTablet: {
    justifyContent: 'space-between',
  },
  cardsGridDesktop: {
    justifyContent: 'flex-start',
  },
  natureCard: {
    backgroundColor: colors.creamSidebar,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    ...shadows.subtle,
    ...Platform.select({
      web: {
        width: 'calc(33.333% - 16px)' as any,
        minWidth: 280,
        boxShadow: '0 8px 24px -6px rgba(30, 45, 36, 0.05)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      },
      default: {
        width: '100%',
      },
    }),
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
