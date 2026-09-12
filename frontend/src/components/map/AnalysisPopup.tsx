import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { ContainerPoint } from './mapTypes';
import {
  MapRegion,
  MapDetailType,
  MapDateRange,
  MapAnalysisResult,
  DETAIL_TYPE_OPTIONS,
  analyzeMapRegion,
} from '../../services/mapAnalysisService';

interface AnalysisPopupProps {
  /** Container-space anchor (projection of the region centroid). */
  anchor: ContainerPoint;
  /** Size of the map container the popup floats inside. */
  containerSize: { w: number; h: number };
  region: MapRegion;
  onClose: () => void;
  onAskInChat: (query: string) => void;
}

type Stage = 'form' | 'loading' | 'result';
type Preset = '3m' | '6m' | '1y' | 'custom';

const POPUP_WIDTH = 360;
const LOADING_MESSAGES = [
  'Projecting selection boundaries…',
  'Fetching satellite indices…',
  'Running spatial model…',
  'Generating explanations…',
];

const fmtArea = (areaSqm: number) =>
  areaSqm >= 1_000_000
    ? `${(Math.round((areaSqm / 1_000_000) * 10) / 10).toFixed(1)} km²`
    : areaSqm >= 10_000
      ? `${Math.round(areaSqm / 10_000).toLocaleString()} ha`
      : `${Math.round(areaSqm).toLocaleString()} m²`;

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const subMonths = (d: Date, months: number) => {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() - months);
  return copy;
};

const impactColor = (impact: 'positive' | 'negative' | 'neutral') =>
  impact === 'positive'
    ? colors.forestGreen
    : impact === 'negative'
      ? colors.terracotta
      : colors.textMuted;

export const AnalysisPopup: React.FC<AnalysisPopupProps> = ({
  anchor,
  containerSize,
  region,
  onClose,
  onAskInChat,
}) => {
  const [stage, setStage] = useState<Stage>('form');
  const [detailType, setDetailType] = useState<MapDetailType | null>(null);
  const [preset, setPreset] = useState<Preset>('3m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MapAnalysisResult | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [popupSize, setPopupSize] = useState({ w: POPUP_WIDTH, h: 420 });
  const measuredRef = useRef(false);

  const entrance = useRef(new Animated.Value(0)).current;
  const expandPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  }, [entrance]);

  // Cycle through status messages while the (mock) model runs
  useEffect(() => {
    if (stage !== 'loading') return;
    setLoadingIndex(0);
    const interval = setInterval(() => {
      setLoadingIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 750);
    return () => clearInterval(interval);
  }, [stage]);

  // Gentle pulse when the popup expands into the result view
  useEffect(() => {
    if (stage !== 'result') return;
    expandPulse.setValue(0.96);
    Animated.spring(expandPulse, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
  }, [stage, expandPulse]);

  const computeRange = (): MapDateRange | null => {
    if (preset !== 'custom') {
      const months = preset === '3m' ? 3 : preset === '6m' ? 6 : 12;
      return { start: toIso(subMonths(new Date(), months)), end: toIso(new Date()) };
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRe.test(customStart) || !dateRe.test(customEnd)) return null;
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
    return { start: customStart, end: customEnd };
  };

  const handleGo = async () => {
    if (!detailType) {
      setError('Pick the kind of land detail you want explained.');
      return;
    }
    const range = computeRange();
    if (!range) {
      setError('Enter a valid start and end date (YYYY-MM-DD), with end ≥ start.');
      return;
    }
    setError(null);
    setStage('loading');
    try {
      const res = await analyzeMapRegion({ region, detailType, dateRange: range });
      setResult(res);
      setStage('result');
    } catch {
      setError('The analysis service is unreachable. Please try again.');
      setStage('form');
    }
  };

  const handleAskInChat = () => {
    if (!result || !detailType) return;
    const label = DETAIL_TYPE_OPTIONS.find((o) => o.id === detailType)?.label ?? 'ecological';
    onAskInChat(
      `Explain the ${label} analysis of my selected ${fmtArea(region.areaSqm)} map region` +
        ` (model confidence ${Math.round(result.confidence * 100)}%).`
    );
  };

  /* ---------------- Placement: float near the anchor, clamped inside the map ---------------- */

  const W = Math.min(POPUP_WIDTH, containerSize.w - 20);
  const H = popupSize.h;
  const { w: cw, h: ch } = containerSize;

  let x = anchor.x + 20;
  if (x + W > cw - 10) x = anchor.x - W - 20;
  if (x < 10) x = Math.min(Math.max(anchor.x - W / 2, 10), Math.max(cw - W - 10, 10));
  let y = anchor.y - 44;
  y = Math.max(10, Math.min(y, Math.max(ch - H - 10, 10)));

  const resultScrollMax = Math.max(180, ch - 200);

  const selectedLabel =
    DETAIL_TYPE_OPTIONS.find((o) => o.id === detailType)?.label ?? '—';

  return (
    <Animated.View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        measuredRef.current = true;
        setPopupSize((prev) =>
          prev.w === width && prev.h === height ? prev : { w: width, h: height }
        );
      }}
      style={[
        styles.popup,
        {
          left: x,
          top: y,
          width: W,
          maxHeight: Math.max(ch - 20, 120),
          opacity: measuredRef.current ? 1 : 0,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
            { scale: Animated.multiply(entrance, expandPulse) },
          ],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Spatial Analysis</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 6 L18 18 M18 6 L6 18"
              stroke={colors.textMuted}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {stage === 'form' && (
        <View style={styles.body}>
          <Text style={styles.regionMeta}>
            {fmtArea(region.areaSqm)} region · {region.vertices.length} vertices
          </Text>

          <Text style={styles.sectionLabel}>LAND DETAIL</Text>
          <View style={styles.chipGrid}>
            {DETAIL_TYPE_OPTIONS.map((option) => {
              const active = detailType === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.8}
                  onPress={() => setDetailType(option.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>DATE DURATION</Text>
          <View style={styles.presetRow}>
            {(['3m', '6m', '1y', 'custom'] as Preset[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetPill, preset === p && styles.presetPillActive]}
                activeOpacity={0.8}
                onPress={() => setPreset(p)}
              >
                <Text style={[styles.presetText, preset === p && styles.presetTextActive]}>
                  {p === '3m' ? 'Last 3 mo' : p === '6m' ? 'Last 6 mo' : p === '1y' ? 'Last year' : 'Custom'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {preset === 'custom' && (
            <View style={styles.customRow}>
              <TextInput
                style={styles.dateInput}
                placeholder="2025-06-12"
                placeholderTextColor={colors.inputPlaceholder}
                value={customStart}
                onChangeText={setCustomStart}
              />
              <Text style={styles.dateDash}>–</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="2026-09-12"
                placeholderTextColor={colors.inputPlaceholder}
                value={customEnd}
                onChangeText={setCustomEnd}
              />
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.goButton} onPress={handleGo} activeOpacity={0.85}>
            <Text style={styles.goButtonText}>Go — Explain this region</Text>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12 L19 12 M13 6 L19 12 L13 18"
                stroke="#FAF7F2"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      )}

      {stage === 'loading' && (
        <View style={styles.loadingBody}>
          <ActivityIndicator size="small" color={colors.terracotta} />
          <Text style={styles.loadingText}>{LOADING_MESSAGES[loadingIndex]}</Text>
          <Text style={styles.loadingSub}>
            {fmtArea(region.areaSqm)} · {selectedLabel}
          </Text>
        </View>
      )}

      {stage === 'result' && result && (
        <View style={styles.resultBody}>
          <ScrollView
            style={{ maxHeight: resultScrollMax }}
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.resultHeaderRow}>
              <View style={styles.readyRow}>
                <View style={styles.readyBadge}>
                  <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M4 12 L10 18 L20 6"
                      stroke="#FAF7F2"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.readyText}>Analysis ready</Text>
              </View>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>
                  {Math.round(result.confidence * 100)}% confident
                </Text>
              </View>
            </View>

            <Text style={styles.summary}>{result.summary}</Text>

            <Text style={styles.sectionLabel}>KEY METRICS</Text>
            <View style={styles.metricGrid}>
              {result.metrics.map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricValue}>{m.value}</Text>
                  {m.delta && <Text style={styles.metricDelta}>{m.delta}</Text>}
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>EXPLAINABILITY — TOP MODEL INPUTS</Text>
            <View style={styles.factorList}>
              {result.factors.map((f) => (
                <View key={f.label} style={styles.factorRow}>
                  <View style={styles.factorHeader}>
                    <View style={styles.factorLabelRow}>
                      <View style={[styles.impactDot, { backgroundColor: impactColor(f.impact) }]} />
                      <Text style={styles.factorLabel}>{f.label}</Text>
                    </View>
                    <Text style={styles.factorWeight}>{f.weight}%</Text>
                  </View>
                  <View style={styles.factorBarTrack}>
                    <View
                      style={[
                        styles.factorBarFill,
                        { width: `${Math.max(f.weight, 4)}%`, backgroundColor: impactColor(f.impact) },
                      ]}
                    />
                  </View>
                  <Text style={styles.factorRationale}>{f.rationale}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>EVIDENCE</Text>
            <View style={styles.evidenceRow}>
              {result.evidence.map((e) => (
                <View key={e} style={styles.evidenceChip}>
                  <Text style={styles.evidenceText}>{e}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.modelNote}>{result.modelNote}</Text>
          </ScrollView>

          <View style={styles.resultFooter}>
            <TouchableOpacity style={styles.askButton} onPress={handleAskInChat} activeOpacity={0.85}>
              <Text style={styles.askButtonText}>Ask in Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.againButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.againButtonText}>New analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    backgroundColor: colors.creamSidebar,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 40,
    overflow: 'hidden',
    ...shadows.card,
    ...Platform.select({
      web: { boxShadow: '0 18px 44px rgba(18, 48, 28, 0.28)' },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.forestDark,
    letterSpacing: -0.1,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  body: {
    padding: 16,
  },
  regionMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  chip: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'background-color 0.15s, transform 0.15s' } }),
  },
  chipActive: {
    backgroundColor: colors.forestGreen,
    borderColor: colors.forestGreen,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forestDark,
  },
  chipTextActive: {
    color: colors.textLight,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  presetPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: colors.creamBorder,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  presetPillActive: {
    backgroundColor: colors.forestDark,
    borderColor: colors.forestDark,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.textLight,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  dateDash: {
    color: colors.textMuted,
    fontSize: 13,
  },
  errorText: {
    color: colors.terracotta,
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.forestGreen,
    borderRadius: radii.full,
    paddingVertical: 11,
    marginTop: 2,
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s, transform 0.2s' },
    }),
  },
  goButtonText: {
    color: colors.textLight,
    fontSize: 13.5,
    fontWeight: '700',
  },
  loadingBody: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  resultBody: {
    flexShrink: 1,
  },
  resultScrollContent: {
    padding: 16,
    paddingBottom: 6,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  readyBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forestDark,
  },
  confidencePill: {
    backgroundColor: 'rgba(78, 141, 102, 0.14)',
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  confidenceText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.forestGreen,
  },
  summary: {
    fontSize: 12.5,
    lineHeight: 18.5,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    padding: 9,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  metricDelta: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.terracotta,
    marginTop: 2,
  },
  factorList: {
    gap: 9,
    marginBottom: 12,
  },
  factorRow: {
    gap: 4,
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  factorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  impactDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  factorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  factorWeight: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  factorBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
    opacity: 0.8,
  },
  factorRationale: {
    fontSize: 10.5,
    lineHeight: 14.5,
    color: colors.textMuted,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  evidenceChip: {
    backgroundColor: 'rgba(25, 39, 30, 0.07)',
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  evidenceText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modelNote: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
  },
  askButton: {
    flex: 1,
    backgroundColor: colors.terracotta,
    borderRadius: radii.full,
    paddingVertical: 9,
    alignItems: 'center',
    ...shadows.subtle,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  askButtonText: {
    color: colors.textLight,
    fontSize: 12.5,
    fontWeight: '700',
  },
  againButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  againButtonText: {
    color: colors.forestDark,
    fontSize: 12.5,
    fontWeight: '600',
  },
});
