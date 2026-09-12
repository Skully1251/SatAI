import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';

const SIDEBAR_WIDTH = 250;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  isMobile,
}) => {
  const { activeNavTab, setActiveNavTab, resetToWelcome, setCurrentPage } = useChatStore();

  const slideAnim = useRef(new Animated.Value(collapsed ? -SIDEBAR_WIDTH : 0)).current;
  const backdropAnim = useRef(new Animated.Value(collapsed ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: collapsed ? -SIDEBAR_WIDTH : 0,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(backdropAnim, {
        toValue: collapsed ? 0 : 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [collapsed]);

  const navItems = [
    { id: 'history', label: 'History', icon: 'clock' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'data', label: 'Data', icon: 'layers' },
    { id: 'settings', label: 'Settings', icon: 'gear' },
  ];

  const renderIcon = (type: string, active: boolean) => {
    const stroke = active ? colors.forestDark : colors.textSecondary;
    switch (type) {
      case 'clock':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.8" />
            <Path d="M12 7V12L15 15" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
          </Svg>
        );
      case 'folder':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 7V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V9C21 7.9 20.1 7 19 7H13L11 5H5C3.9 5 3 5.9 3 7Z"
              stroke={stroke}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'layers':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
            <Path d="M2 17L12 22L22 17" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
            <Path d="M2 12L12 17L22 12" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
          </Svg>
        );
      case 'gear':
        return (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="3.2" stroke={stroke} strokeWidth="1.8" />
            <Path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke={stroke}
              strokeWidth="1.8"
            />
          </Svg>
        );
      default:
        return null;
    }
  };

  const renderSidebarContent = () => (
    <View style={styles.sidebarInner}>
      {/* Brand Header */}
      <View style={styles.brandRow}>
        <TouchableOpacity
          style={styles.brandLogoContainer}
          onPress={() => setCurrentPage('landing')}
          activeOpacity={0.75}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19.5 4.5 C14 4.5 9 8 7 13 C5.5 17 6.5 19 7 19.5 C7.5 20 9.5 21 13.5 19.5 C18.5 17.5 22 12.5 22 7 C22 5.5 21 4.5 19.5 4.5 Z"
              fill={colors.leafGreen}
              opacity={0.88}
            />
            <Path
              d="M7 19.5 C11 15.5 15.5 11 19.5 4.5"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </Svg>
          <Text style={styles.brandTitle}>Sat AI</Text>
        </TouchableOpacity>

        {/* Collapse toggle button at the header edge */}
        <TouchableOpacity
          style={styles.collapseChevronButton}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
        >
          <Text style={styles.chevronIcon}>‹</Text>
        </TouchableOpacity>
      </View>

      {/* "+ New Chat" Button */}
      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => {
          resetToWelcome();
          if (isMobile) onToggleCollapse();
        }}
        activeOpacity={0.75}
      >
        <Text style={styles.plusIcon}>+</Text>
        <Text style={styles.newChatText}>New Chat</Text>
      </TouchableOpacity>

      {/* Nav Menu Items */}
      <View style={styles.menuContainer}>
        {navItems.map((item) => {
          const isActive = activeNavTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => {
                setActiveNavTab(item.id);
                if (isMobile) onToggleCollapse();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemIcon}>{renderIcon(item.icon, isActive)}</View>
              <Text style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom collapse chevron */}
      <TouchableOpacity
        style={styles.bottomCollapseButton}
        onPress={onToggleCollapse}
        activeOpacity={0.7}
      >
        <Text style={styles.bottomChevronIcon}>‹</Text>
      </TouchableOpacity>
    </View>
  );

  // MOBILE (<768px): Compressed closed button + Slide-in drawer on top of all elements
  if (isMobile) {
    return (
      <>
        {/* Floating compressed closed sidebar toggle button (visible when closed) */}
        {collapsed && (
          <TouchableOpacity
            style={styles.mobileFloatingToggle}
            onPress={onToggleCollapse}
            activeOpacity={0.85}
          >
            <Text style={styles.floatingChevronIcon}>›</Text>
          </TouchableOpacity>
        )}

        {/* Modal Backdrop Overlay when opened */}
        {!collapsed && (
          <TouchableWithoutFeedback onPress={onToggleCollapse}>
            <Animated.View
              style={[
                styles.mobileBackdrop,
                { opacity: backdropAnim },
              ]}
            />
          </TouchableWithoutFeedback>
        )}

        {/* Slide-in Sidebar Panel on top of all elements */}
        <Animated.View
          style={[
            styles.mobileDrawerContainer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
          pointerEvents={collapsed ? 'none' : 'auto'}
        >
          {renderSidebarContent()}
        </Animated.View>
      </>
    );
  }

  // DESKTOP (>=768px): Standard collapsible panel
  if (collapsed) {
    return (
      <View style={styles.desktopCollapsedStrip}>
        <TouchableOpacity
          style={styles.desktopExpandButton}
          onPress={onToggleCollapse}
          activeOpacity={0.8}
        >
          <Text style={styles.chevronIcon}>›</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.desktopSidebarContainer}>
      {renderSidebarContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  // Desktop standard sidebar
  desktopSidebarContainer: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.creamSidebar,
    borderRightWidth: 1,
    borderRightColor: colors.creamBorder,
    height: '100%',
    zIndex: 20,
    ...Platform.select({
      web: {
        transition: 'all 0.3s ease',
      },
    }),
  },
  desktopCollapsedStrip: {
    width: 24,
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  desktopExpandButton: {
    position: 'absolute',
    top: 24,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.creamSidebar,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
      },
    }),
  },

  // Mobile compressed closed button
  mobileFloatingToggle: {
    position: 'absolute',
    top: 18,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.creamSidebar,
    borderWidth: 1.2,
    borderColor: colors.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    ...shadows.card,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(20, 40, 25, 0.16)',
        cursor: 'pointer',
      },
    }),
  },
  floatingChevronIcon: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: -2,
  },

  // Mobile backdrop overlay
  mobileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 33, 23, 0.45)',
    zIndex: 99,
  },

  // Mobile slide-in drawer on top of all elements
  mobileDrawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.creamSidebar,
    borderRightWidth: 1,
    borderRightColor: colors.creamBorder,
    zIndex: 100,
    elevation: 30,
    ...Platform.select({
      web: {
        boxShadow: '4px 0 28px rgba(18, 33, 23, 0.25)',
      },
    }),
  },

  // Common sidebar inner layout
  sidebarInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    height: '100%',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  brandLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  collapseChevronButton: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  chevronIcon: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: -2,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.creamSidebar,
    borderWidth: 1.2,
    borderColor: colors.creamBorder,
    borderRadius: radii.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      },
    }),
  },
  plusIcon: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuContainer: {
    flex: 1,
    gap: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  menuItemActive: {
    backgroundColor: colors.creamSidebarActive,
  },
  menuItemIcon: {
    width: 22,
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  menuItemLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  bottomCollapseButton: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  bottomChevronIcon: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: -2,
  },
});
