import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';

const SIDEBAR_WIDTH = 250;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile: boolean;
}

// Modern PanelLeft icons
const PanelLeftCloseIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <Path d="M9 3v18" />
    <Path d="m16 15-3-3 3-3" />
  </Svg>
);

const SidebarOpenIcon = () => (
  <View style={styles.hoverOpenIconContainer}>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.forestDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <Path d="M9 3v18" />
      <Path d="m14 9 3 3-3 3" />
    </Svg>
  </View>
);

const LeafIcon = () => (
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
);

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  isMobile,
}) => {
  const { resetToWelcome, setCurrentPage } = useChatStore();
  const [logoHovered, setLogoHovered] = useState(false);

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

  const renderFixedBranding = () => (
    <View style={styles.fixedBrandContainer} pointerEvents="box-none">
      <View style={styles.brandLogoContainer}>
        {/* LEAF AREA (handles sidebar open when collapsed) */}
        <Pressable
          onHoverIn={() => setLogoHovered(true)}
          onHoverOut={() => setLogoHovered(false)}
          onPress={() => {
            if (collapsed) {
              onToggleCollapse(); // Open sidebar
            } else {
              setCurrentPage('landing'); // Go Home
            }
          }}
          style={styles.logoPressable}
        >
          {collapsed && logoHovered ? (
            <SidebarOpenIcon />
          ) : (
            <LeafIcon />
          )}
        </Pressable>

        {/* TEXT AREA (always goes Home) */}
        <Pressable
          onPress={() => setCurrentPage('landing')}
          style={styles.textPressable}
        >
          <Text style={styles.brandTitle} numberOfLines={1}>Sat AI</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderSidebarContent = () => (
    <View style={styles.sidebarInner}>
      {/* Top right collapse button */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.modernCollapseButton}
          onPress={onToggleCollapse}
          activeOpacity={0.7}
        >
          <PanelLeftCloseIcon color={colors.textSecondary} />
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
    </View>
  );

  if (isMobile) {
    return (
      <>
        {/* On mobile, branding remains visible at the top even when collapsed */}
        {collapsed && (
          <View style={styles.mobileFixedHeader} pointerEvents="box-none">
             {renderFixedBranding()}
          </View>
        )}

        {/* Modal Backdrop Overlay when opened */}
        {!collapsed && (
          <TouchableWithoutFeedback onPress={onToggleCollapse}>
            <Animated.View style={[styles.mobileBackdrop, { opacity: backdropAnim }]} />
          </TouchableWithoutFeedback>
        )}

        {/* Slide-in Sidebar Panel */}
        <Animated.View
          style={[
            styles.mobileDrawerContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
          pointerEvents={collapsed ? 'none' : 'auto'}
        >
          <View style={styles.mobileDrawerBrandingWrapper}>
            {renderFixedBranding()}
          </View>
          {renderSidebarContent()}
        </Animated.View>
      </>
    );
  }

  // DESKTOP (>=768px):
  return (
    <View
      style={[
        styles.desktopWrapper,
        collapsed && styles.desktopWrapperCollapsed,
      ]}
      pointerEvents="box-none"
    >
      {/* Fixed Branding (always visible) */}
      {renderFixedBranding()}

      {/* The sliding white panel */}
      <View
        style={[
          styles.desktopSidebarContainer,
          collapsed && styles.desktopSidebarCollapsed,
        ]}
      >
        {renderSidebarContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Desktop standard sidebar
  desktopWrapper: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    zIndex: 20,
    ...Platform.select({
      web: { transition: 'width 0.3s ease' },
    }),
  },
  desktopWrapperCollapsed: {
    width: 0,
  },
  desktopSidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: colors.creamSidebar,
    borderRightWidth: 1,
    borderRightColor: colors.creamBorder,
    ...Platform.select({
      web: { transition: 'transform 0.3s ease' },
    }),
  },
  desktopSidebarCollapsed: {
    transform: [{ translateX: -SIDEBAR_WIDTH }],
  },

  // Fixed branding
  fixedBrandContainer: {
    position: 'absolute',
    top: 24,
    left: 16,
    zIndex: 30,
    width: 200, // Prevent text wrapping when parent shrinks
  },
  brandLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPressable: {
    width: 32, // Fixed width to accommodate the 32x32 hover icon without jumping
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  textPressable: {
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    ...Platform.select({ web: { whiteSpace: 'nowrap' } }), // Ensure no wrapping
  },
  hoverOpenIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 40, 25, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mobile elements
  mobileFixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 90,
  },
  mobileDrawerBrandingWrapper: {
    paddingTop: 24,
    paddingLeft: 16,
    zIndex: 101,
  },
  mobileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(18, 33, 23, 0.45)',
    zIndex: 99,
  },
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
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 28,
    height: 32, // Match logoPressable height
  },
  modernCollapseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s' },
    }),
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
});
