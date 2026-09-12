import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { colors } from './src/theme/colors';
import { BotanicalBackground } from './src/components/background/BotanicalBackground';
import { Sidebar } from './src/components/navigation/Sidebar';
import { TopBar } from './src/components/navigation/TopBar';
import { ChatCanvas } from './src/components/chat/ChatCanvas';
import { EcoMapPreviewCard } from './src/components/map/EcoMapPreviewCard';
import { MapDashboardPage } from './src/components/map/MapDashboardPage';
import { LandingPage } from './src/components/landing/LandingPage';
import { useChatStore } from './src/store/chatStore';

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;

  const { messages, currentPage, setCurrentPage } = useChatStore();
  const isChatActive = messages.length > 0;

  // Mobile sidebar collapse state
  const [collapsed, setCollapsed] = useState(isMobile);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  // Smooth animation progress between Map Card and Top Map Dashboard Button on desktop
  const animProgress = useRef(new Animated.Value(isChatActive ? 1 : 0)).current;

  useEffect(() => {
    if (isDesktop) {
      Animated.timing(animProgress, {
        toValue: isChatActive ? 1 : 0,
        duration: 480,
        useNativeDriver: false,
      }).start();
    } else {
      animProgress.setValue(1);
    }
  }, [isChatActive, isDesktop, animProgress]);

  // Handler for opening the Map Dashboard
  const handleOpenMapDashboard = () => {
    setCurrentPage('map');
  };

  // If on Landing page, render LandingPage directly
  if (currentPage === 'landing') {
    return (
      <SafeAreaView style={styles.safeAreaLanding}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.sageBg} />
        <LandingPage />
      </SafeAreaView>
    );
  }

  // If on Map Dashboard page, render it full-screen (no sidebar)
  if (currentPage === 'map') {
    return <MapDashboardPage />;
  }

  // Otherwise, render the Chat view
  const mapCardScale = animProgress.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [1, 0.45, 0.12],
  });

  const mapCardOpacity = animProgress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.35, 0],
  });

  const mapCardTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -280],
  });

  const mapCardTranslateX = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -180],
  });

  const mapCardWidth = animProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [320, 250, 0],
  });

  const mapCardMargin = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [32, 0],
  });

  const topButtonOpacity = isDesktop
    ? animProgress.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0, 0.25, 1],
      })
    : 1;

  const topButtonScale = isDesktop
    ? animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.65, 1],
      })
    : 1;

  const topButtonTranslateY = isDesktop
    ? animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-18, 0],
      })
    : 0;

  const chatMaxWidth = isDesktop
    ? animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [640, 880],
      })
    : '100%';

  const mapButtonAnimatedStyle = isDesktop
    ? {
        opacity: topButtonOpacity,
        transform: [
          { translateY: topButtonTranslateY },
          { scale: topButtonScale },
        ],
      }
    : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.creamSidebar} />

      <View style={styles.mainContainer}>
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          isMobile={isMobile}
        />

        {/* Global Sage Green Canvas */}
        <View style={styles.canvasContainer}>
          <BotanicalBackground />

          {/* Top Action Bar with centered Map Dashboard Button and Home Link */}
          <TopBar
            onPressMapDashboard={handleOpenMapDashboard}
            showMapButton={!isDesktop || isChatActive}
            mapButtonAnimatedStyle={mapButtonAnimatedStyle}
            isMobile={isMobile}
            onPressHome={() => setCurrentPage('landing')}
          />

          {/* Main Content Layout */}
          <View
            style={[
              styles.contentLayout,
              isMobile && styles.contentLayoutMobile,
              isChatActive && styles.contentLayoutActive,
            ]}
          >
            {/* Center Chat & Welcome View */}
            <Animated.View
              style={[
                styles.chatSection,
                { maxWidth: chatMaxWidth as any },
                isChatActive && styles.chatSectionActive,
              ]}
            >
              <ChatCanvas />
            </Animated.View>

            {/* Right Organic Eco-Map Preview Card (Desktop >= 1024px) */}
            {isDesktop && (
              <Animated.View
                style={[
                  styles.mapSection,
                  {
                    width: mapCardWidth,
                    marginLeft: mapCardMargin,
                    opacity: mapCardOpacity,
                    transform: [
                      { translateX: mapCardTranslateX },
                      { translateY: mapCardTranslateY },
                      { scale: mapCardScale },
                    ],
                  },
                ]}
                pointerEvents={isChatActive ? 'none' : 'auto'}
              >
                <EcoMapPreviewCard onPressExplore={handleOpenMapDashboard} />
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.creamSidebar,
  },
  safeAreaLanding: {
    flex: 1,
    backgroundColor: colors.sageBg,
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.sageBg,
    position: 'relative',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: colors.sageBg,
    position: 'relative',
    height: '100%',
    overflow: 'hidden',
  },
  contentLayout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.select<any>({
      web: '6%',
      default: 24,
    }),
    height: '100%',
    zIndex: 10,
  },
  contentLayoutMobile: {
    paddingHorizontal: 16,
    paddingTop: 54,
    justifyContent: 'center',
  },
  contentLayoutActive: {
    justifyContent: 'center',
  },
  chatSection: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingTop: 40,
    alignSelf: 'center',
  },
  chatSectionActive: {
    maxWidth: 880,
  },
  mapSection: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    overflow: 'visible',
  },
});
