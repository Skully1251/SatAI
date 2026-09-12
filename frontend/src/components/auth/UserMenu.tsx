import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

/**
 * Signed-in user avatar + dropdown (name, email, go to chat, log out).
 * Shared by the landing navbar and the chat TopBar.
 */
export const UserMenu: React.FC = () => {
  const { user, logout } = useAuthStore();
  const setCurrentPage = useChatStore((state) => state.setCurrentPage);
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    void logout();
  };

  const handleGoToChat = () => {
    setOpen(false);
    setCurrentPage('chat');
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.avatarBtn}
        onPress={() => setOpen(!open)}
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

      {open && (
        <View style={styles.dropdown}>
          <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.item} onPress={handleGoToChat}>
            <Text style={styles.itemText}>Go to Lumina Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={handleLogout}>
            <Text style={[styles.itemText, { color: colors.terracotta }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  avatarBtn: {
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
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: 14,
    minWidth: 190,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    ...shadows.card,
    zIndex: 100,
  },
  userName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.creamBorder,
    marginVertical: 10,
  },
  item: {
    paddingVertical: 6,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  itemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
