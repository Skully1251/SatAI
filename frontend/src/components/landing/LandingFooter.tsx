import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/spacing';

interface LandingFooterProps {
  onScrollToTop: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onScrollToTop }) => {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.innerRow}>
        {/* Brand & Copyright */}
        <TouchableOpacity
          style={styles.brandBlock}
          onPress={onScrollToTop}
          activeOpacity={0.8}
        >
          <View style={styles.logoCircle}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19.5 4.5 C14 4.5 9 8 7 13 C5.5 17 6.5 19 7 19.5 C7.5 20 9.5 21 13.5 19.5 C18.5 17.5 22 12.5 22 7 C22 5.5 21 4.5 19.5 4.5 Z"
                fill={colors.leafGreen}
              />
              <Path
                d="M7 19.5 C11 15.5 15.5 11 19.5 4.5"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <Text style={styles.brandTitle}>Sat AI</Text>
          <Text style={styles.copyrightText}>© 2026 Lumina Intelligence Inc.</Text>
        </TouchableOpacity>

        {/* Links */}
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => alert('Privacy Policy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert('Terms of Service')}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => alert('All systems operational: 100% uptime')}>
            <Text style={styles.footerLink}>System Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: '#8DA385',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  innerRow: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    flexDirection: Platform.select({ web: 'row', default: 'column' }),
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.creamSidebar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(25, 39, 30, 0.75)',
    marginLeft: 6,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  footerLink: {
    fontSize: 12,
    color: 'rgba(25, 39, 30, 0.85)',
    fontWeight: '500',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
});
