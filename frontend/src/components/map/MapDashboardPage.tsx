import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';
import { MapCanvas } from './MapCanvas';
import { MapToolbar } from './MapToolbar';
import { AnalysisPopup } from './AnalysisPopup';
import { MapCanvasApi, ContainerPoint, DrawMode } from './mapTypes';
import { MapRegion } from '../../services/mapAnalysisService';

/**
 * Full-screen Eco Map Dashboard. User draws a region on the map, then a
 * hovering popup collects the land-detail type + date duration and expands
 * into an explainable-AI analysis (mock service behind a backend-ready API).
 */
export const MapDashboardPage: React.FC = () => {
  const { setCurrentPage, user, setInputValue } = useChatStore();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [region, setRegion] = useState<MapRegion | null>(null);
  const [anchor, setAnchor] = useState<ContainerPoint | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const canvasApiRef = useRef<MapCanvasApi | null>(null);

  const handleRegionComplete = (completed: MapRegion) => {
    setRegion(completed);
    setDrawMode(null);
  };

  const handleClearRegion = () => {
    canvasApiRef.current?.clearDrawing();
    setRegion(null);
    setAnchor(null);
    setDrawMode(null);
  };

  const handleAskInChat = (query: string) => {
    setInputValue(query);
    setCurrentPage('chat');
  };

  const statusHint =
    region && anchor
      ? 'Region selected — describe what to explain'
      : drawMode === 'polygon'
        ? 'Tap vertices · tap the hollow first vertex to finish'
        : drawMode === 'rect'
          ? 'Press & drag on the map to draw a rectangle'
          : 'Pick the Draw tool below-right, then outline a region';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.sageBg} />

      {/* ---- Top bar: Chat View link (left) · title (center) · profile (right) ---- */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.chatViewButton}
          onPress={() => setCurrentPage('chat')}
          activeOpacity={0.85}
        >
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 12 C21 16.97 16.97 21 12 21 C10.2 21 8.52 20.55 7.07 19.77 L3 21 L4.23 16.93 C3.45 15.48 3 13.8 3 12 C3 7.03 7.03 3 12 3 C16.97 3 21 7.03 21 12 Z"
              stroke={colors.forestDark}
              strokeWidth="1.9"
              strokeLinejoin="round"
              fill="rgba(78, 141, 102, 0.1)"
            />
          </Svg>
          <Text style={styles.chatViewButtonText}>Go to Chat View</Text>
        </TouchableOpacity>

        <View style={styles.titlePill}>
          <View style={styles.pulseDot} />
          <Text style={styles.titlePillText} numberOfLines={1}>
            {isMobile ? 'Eco Map' : 'Eco Map Dashboard'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() =>
            alert(`Logged in as ${user?.name ?? 'Guest'} (${user?.role ?? 'Explorer'})`)
          }
          activeOpacity={0.85}
        >
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="8" r="4" stroke={colors.forestDark} strokeWidth="1.8" />
            <Path
              d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20"
              stroke={colors.forestDark}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* ---- Bezel-framed interactive map ---- */}
      <View style={styles.frame}>
        <View
          style={styles.canvasWrap}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setCanvasSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
          }}
        >
          <MapCanvas
            drawMode={drawMode}
            region={region}
            onRegionComplete={handleRegionComplete}
            onAnchorChange={setAnchor}
            registerApi={(api) => {
              canvasApiRef.current = api;
            }}
          />

          {/* Vertical interaction tools, bottom-right */}
          <MapToolbar
            drawMode={drawMode}
            hasRegion={!!region}
            onSelectMode={setDrawMode}
            onZoomIn={() => canvasApiRef.current?.zoomIn()}
            onZoomOut={() => canvasApiRef.current?.zoomOut()}
            onClearRegion={handleClearRegion}
          />

          {/* Status hint, bottom-center */}
          <View style={styles.hintPill} pointerEvents="none">
            <View style={[styles.hintDot, drawMode ? styles.hintDotActive : undefined]} />
            <Text style={styles.hintText}>{statusHint}</Text>
          </View>

          {/* Hovering analysis popup anchored to the drawn region */}
          {region && anchor && (
            <AnalysisPopup
              anchor={anchor}
              containerSize={canvasSize}
              region={region}
              onClose={handleClearRegion}
              onAskInChat={handleAskInChat}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.sageBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 20,
  },
  chatViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform 0.2s, background-color 0.2s' },
    }),
  },
  chatViewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forestDark,
  },
  titlePill: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -90 }],
    width: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.forestDark,
    borderRadius: radii.full,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    ...shadows.subtle,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  titlePillText: {
    color: colors.textLight,
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.creamSidebar,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  frame: {
    flex: 1,
    backgroundColor: colors.mapFrameBezel,
    marginHorizontal: 18,
    marginBottom: 18,
    borderRadius: 26,
    padding: 12,
    ...shadows.card,
    ...Platform.select({
      web: { boxShadow: '0 16px 40px rgba(24, 46, 31, 0.18)' },
    }),
  },
  canvasWrap: {
    flex: 1,
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.mapBackground,
  },
  hintPill: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(25, 48, 32, 0.82)',
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...shadows.subtle,
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  hintDotActive: {
    backgroundColor: '#6EE7B7',
  },
  hintText: {
    color: '#FAF7F2',
    fontSize: 11,
    fontWeight: '600',
  },
});
