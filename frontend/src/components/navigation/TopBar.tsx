import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { MapDashboardButton } from './MapDashboardButton';
import { useChatStore } from '../../store/chatStore';

interface TopBarProps {
  onPressMapDashboard: () => void;
  showMapButton?: boolean;
  mapButtonAnimatedStyle?: any;
  isMobile?: boolean;
  onPressHome?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onPressMapDashboard,
  showMapButton = true,
  mapButtonAnimatedStyle,
  isMobile = false,
  onPressHome,
}) => {
  const { isAuthenticated, setCurrentPage } = useChatStore();

  return (
    <View style={styles.topBarContainer} pointerEvents="box-none">
      {/* Left slot: Home button to return to Landing page */}
      <View style={styles.leftSlot} pointerEvents="box-none">
        {onPressHome && (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onPressHome}
            activeOpacity={0.8}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 19l-7-7 7-7"
                stroke={colors.forestDark}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.homeButtonText}>Home</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Center slot: Prominent Map Dashboard Button */}
      <View style={styles.centerSlot} pointerEvents="box-none">
        <MapDashboardButton
          onPress={onPressMapDashboard}
          visible={showMapButton}
          animatedStyle={mapButtonAnimatedStyle}
        />
      </View>

      {/* Right slot: Authentication actions or User Avatar button */}
      <View style={styles.authButtonsRow} pointerEvents="auto">
        {!isAuthenticated ? (
          <>
            <TouchableOpacity
              style={[styles.loginButton, isMobile && styles.compactAuthBtn]}
              activeOpacity={0.85}
              onPress={() => alert('Redirecting to Authentication page (Log In)...')}
            >
              <Text style={styles.loginButtonText}>Log in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signupButton, isMobile && styles.compactAuthBtn]}
              activeOpacity={0.85}
              onPress={() => alert('Redirecting to Authentication page (Sign Up)...')}
            >
              <Text style={styles.signupButtonText}>Sign up</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.userAvatarBtn}
            onPress={() => alert('Logged in as Dr. Aris Thorne (Lead Conservationist)')}
            activeOpacity={0.85}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="8" r="4" stroke={colors.forestDark} strokeWidth="1.8" />
              <Path
                d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
                stroke={colors.forestDark}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBarContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    height: 48,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 35,
  },
  leftSlot: {
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s' },
    }),
  },
  homeButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.forestDark,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  compactAuthBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  loginButton: {
    backgroundColor: colors.terracotta,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s, background-color 0.2s',
      },
    }),
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: colors.forestGreen,
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 0.2s, background-color 0.2s',
      },
    }),
  },
  signupButtonText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
  },
  userAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.creamSidebar,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
});
