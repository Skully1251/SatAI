import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { colors } from '../../theme/colors';
import { BotanicalBackground } from '../background/BotanicalBackground';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { HowToUseSection } from './HowToUseSection';
import { FeaturesSection } from './FeaturesSection';
import { ContactSection } from './ContactSection';
import { useChatStore } from '../../store/chatStore';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, setCurrentPage } = useChatStore();
  const scrollRef = useRef<ScrollView>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Section Y offsets for native and web fallback
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>({
    hero: 0,
    'how-to-use': 700,
    features: 1400,
    contact: 2100,
  });

  // Track scroll position on web window/body if document scrolls
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWindowScroll = () => {
        const top = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        setIsScrolled(top > 12);
      };
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleWindowScroll);
    }
  }, []);

  const handleScroll = (e: any) => {
    const offsetY = e.nativeEvent?.contentOffset?.y || 0;
    setIsScrolled(offsetY > 12);
  };

  const handleLayoutSection = (section: string, e: LayoutChangeEvent) => {
    const { y } = e.nativeEvent.layout;
    setSectionOffsets((prev) => ({ ...prev, [section]: y }));
  };

  const handleScrollTo = (section: 'hero' | 'how-to-use' | 'features' | 'contact') => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const el = document.getElementById(section);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    const targetY = sectionOffsets[section] ?? 0;
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setCurrentPage('chat');
    } else {
      alert('Please log in or sign up to access Sat AI Chat.');
    }
  };

  return (
    <View style={styles.pageContainer}>
      {/* Botanical Leaf Silhouettes Background */}
      <BotanicalBackground />

      {/* Main Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* 1. Hero Section (Full Screen) */}
        <View
          nativeID="hero"
          {...(Platform.OS === 'web' ? { id: 'hero' } : {})}
          style={styles.sectionSlide}
          onLayout={(e) => handleLayoutSection('hero', e)}
        >
          <HeroSection
            onGetStarted={handleGetStarted}
            onScrollHowToUse={() => handleScrollTo('how-to-use')}
          />
        </View>

        {/* 2. How to Use Section (Full Screen) */}
        <View
          nativeID="how-to-use"
          {...(Platform.OS === 'web' ? { id: 'how-to-use' } : {})}
          style={styles.sectionSlide}
          onLayout={(e) => handleLayoutSection('how-to-use', e)}
        >
          <HowToUseSection />
        </View>

        {/* 3. Features Section (Full Screen) */}
        <View
          nativeID="features"
          {...(Platform.OS === 'web' ? { id: 'features' } : {})}
          style={styles.sectionSlide}
          onLayout={(e) => handleLayoutSection('features', e)}
        >
          <FeaturesSection />
        </View>

        {/* 4. Contact Us Section (Full Screen) */}
        <View
          nativeID="contact"
          {...(Platform.OS === 'web' ? { id: 'contact' } : {})}
          style={styles.sectionSlide}
          onLayout={(e) => handleLayoutSection('contact', e)}
        >
          <ContactSection />
        </View>
      </ScrollView>

      {/* Floating Truly Transparent Navbar */}
      <LandingNavbar onScrollTo={handleScrollTo} isScrolled={isScrolled} />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: colors.sageBg,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionSlide: {
    width: '100%',
    minHeight: Platform.select<any>({ web: '100vh', default: 750 }),
    justifyContent: 'center',
  },
});
