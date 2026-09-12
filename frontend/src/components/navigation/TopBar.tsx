import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { MapDashboardButton } from './MapDashboardButton';
import { useAuthStore } from '../../store/authStore';
import { UserMenu } from '../auth/UserMenu';

interface TopBarProps {
  onPressMapDashboard: () => void;
  showMapButton?: boolean;
  mapButtonAnimatedStyle?: any;
  isMobile?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onPressMapDashboard,
  showMapButton = true,
  mapButtonAnimatedStyle,
  isMobile = false,
}) => {
  const { status, openAuthModal } = useAuthStore();

  return (
    <View style={styles.topBarContainer} pointerEvents="box-none">
      {/* Left slot: Empty as Home button is removed */}
      <View style={styles.leftSlot} pointerEvents="box-none">
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
        {status !== 'authenticated' ? (
          <>
            <TouchableOpacity
              style={[styles.loginButton, isMobile && styles.compactAuthBtn]}
              activeOpacity={0.85}
              onPress={() => openAuthModal('login')}
            >
              <Text style={styles.loginButtonText}>Log in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signupButton, isMobile && styles.compactAuthBtn]}
              activeOpacity={0.85}
              onPress={() => openAuthModal('signup')}
            >
              <Text style={styles.signupButtonText}>Sign up</Text>
            </TouchableOpacity>
          </>
        ) : (
          <UserMenu />
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
});
