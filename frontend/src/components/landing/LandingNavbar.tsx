import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { UserMenu } from '../auth/UserMenu';

type SectionId = 'hero' | 'how-to-use' | 'features' | 'contact';

interface LandingNavbarProps {
  onScrollTo: (section: SectionId) => void;
  isScrolled?: boolean;
}

const NAV_ITEMS: { id: SectionId; label: string }[] = [
  { id: 'hero', label: 'Home' },
  { id: 'how-to-use', label: 'How to Use' },
  { id: 'features', label: 'Features' },
  { id: 'contact', label: 'Contact Us' },
];

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onScrollTo, isScrolled = false }) => {
  const { status, openAuthModal } = useAuthStore();
  const setCurrentPage = useChatStore((state) => state.setCurrentPage);

  // Smooth highlighting capsule positioning
  const [highlightStyle, setHighlightStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({
    left: 4,
    width: 68,
    opacity: 0,
  });

  const handleGetStarted = () => {
    if (status === 'authenticated') {
      setCurrentPage('chat');
    } else {
      // Opens the auth modal; on success the user is carried into chat.
      openAuthModal('signup', 'goToChat');
    }
  };

  // Web mouse-enter handler for smooth gliding capsule
  const handleItemHover = (e: any) => {
    if (Platform.OS === 'web' && e?.currentTarget) {
      const target = e.currentTarget as HTMLElement;
      setHighlightStyle({
        left: target.offsetLeft,
        width: target.offsetWidth,
        opacity: 1,
      });
    }
  };

  const handleMouseLeaveNav = () => {
    if (Platform.OS === 'web') {
      setHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  return (
    <View style={styles.header} pointerEvents="box-none">
      <View
        style={[styles.navContainer, isScrolled && styles.navContainerScrolled]}
        pointerEvents="auto"
      >
        {/* Left: Brand Logo & Title (Clicking scrolls to top) */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => onScrollTo('hero')}
          activeOpacity={0.8}
        >
          <View style={styles.logoCircle}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19.5 4.5 C14 4.5 9 8 7 13 C5.5 17 6.5 19 7 19.5 C7.5 20 9.5 21 13.5 19.5 C18.5 17.5 22 12.5 22 7 C22 5.5 21 4.5 19.5 4.5 Z"
                fill={colors.leafGreen}
                opacity={0.92}
              />
              <Path
                d="M7 19.5 C11 15.5 15.5 11 19.5 4.5"
                stroke="#FFFFFF"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <View style={styles.brandTitleRow}>
            <Text style={styles.brandTitle}>Sat AI</Text>
          </View>
        </TouchableOpacity>

        {/* Center: Frosted Capsule Navigation Links with Smooth Gliding Highlight */}
        <View
          style={[styles.navCapsule, isScrolled && styles.navCapsuleScrolled]}
          {...(Platform.OS === 'web' ? { onMouseLeave: handleMouseLeaveNav } : {})}
        >
          {/* Smooth Highlight Pill following the hovered item */}
          <View
            style={[
              styles.highlightPill,
              {
                left: highlightStyle.left,
                width: highlightStyle.width,
                opacity: highlightStyle.opacity,
              },
            ]}
            pointerEvents="none"
          />

          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.navLink}
              onPress={() => onScrollTo(item.id)}
              activeOpacity={0.75}
              {...(Platform.OS === 'web' ? { onMouseEnter: handleItemHover } : {})}
            >
              <Text style={styles.navLinkText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Right: Auth Actions or User Icon */}
        <View style={styles.actionsRow}>
          {status !== 'authenticated' ? (
            <>
              <TouchableOpacity
                style={styles.getStartedGhostBtn}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.getStartedGhostText}>Get Started</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => openAuthModal('login')}
                activeOpacity={0.85}
              >
                <Text style={styles.loginBtnText}>Log in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.signupBtn}
                onPress={() => openAuthModal('signup')}
                activeOpacity={0.85}
              >
                <Text style={styles.signupBtnText}>Sign up</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.authenticatedWrapper}>
              <TouchableOpacity
                style={styles.getStartedGhostBtn}
                onPress={() => setCurrentPage('chat')}
                activeOpacity={0.85}
              >
                <Text style={styles.getStartedGhostText}>Get Started</Text>
              </TouchableOpacity>

              <UserMenu />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    zIndex: 100,
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
      } as any,
    }),
  },
  navContainer: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        transition: 'transform 0.26s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.26s ease',
      } as any,
    }),
  },
  navContainerScrolled: {
    transform: [{ translateY: -6 }],
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.creamSidebar,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  brandTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.full,
  },
  brandTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.forestDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navCapsule: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    ...Platform.select({
      web: {
        display: 'flex',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'background-color 0.26s ease, border-color 0.26s ease, box-shadow 0.26s ease',
      } as any,
      default: {
        display: 'none',
      },
    }),
  },
  navCapsuleScrolled: {
    backgroundColor: 'rgba(25, 45, 30, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(20, 35, 22, 0.08)',
      } as any,
    }),
  },
  highlightPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(25, 45, 30, 0.08)',
        transition: 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  navLink: {
    position: 'relative',
    zIndex: 2,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  navLinkText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  getStartedGhostBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s',
      },
    }),
  },
  getStartedGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forestDark,
  },
  loginBtn: {
    backgroundColor: colors.terracotta,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },
  loginBtnText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
  },
  signupBtn: {
    backgroundColor: colors.forestGreen,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },
  signupBtnText: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '600',
  },
  authenticatedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  chatShortcutBtn: {
    backgroundColor: colors.forestGreen,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  chatShortcutText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
