/**
 * Search bar for the map dashboard (replaces the title pill). Free-text
 * queries geocode via OpenStreetMap Nominatim (no API key); latitude/
 * longitude pairs ("12.9716, 77.5946", "12.97°N 77.59°E", "lat: …, lng: …")
 * are parsed locally and fly straight to the spot. Selecting a result calls
 * onSelectLocation with a { lat, lng, zoom, label } flight target — the page
 * hands it to the canvas, which glides the camera there (flyTo).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import {
  coordinateTarget,
  formatCoordinateLabel,
  parseCoordinates,
  searchPlaces,
  suggestionTarget,
  PlaceSuggestion,
  SearchTarget,
} from '../../services/geocodeService';

interface MapSearchBarProps {
  /** Flight target chosen by the user (suggestion or raw coordinates). */
  onSelectLocation: (target: SearchTarget) => void;
}

/** Nominatim fair-use is ~1 req/sec; debounce + abort keeps us well under it. */
const DEBOUNCE_MS = 450;
const MIN_QUERY_LEN = 2;

export const MapSearchBar: React.FC<MapSearchBarProps> = ({ onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<any>(null); // wrapper DOM node for click-outside

  const trimmed = query.trim();
  const coord = trimmed ? parseCoordinates(trimmed) : null;
  // Dropdown row count: the coordinate fast-path row + geocoded suggestions.
  const rowCount = (coord ? 1 : 0) + suggestions.length;

  const close = () => {
    setOpen(false);
    setHighlight(-1);
  };

  const select = (target: SearchTarget) => {
    abortRef.current?.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(target.label);
    setSuggestions([]);
    setError(null);
    close();
    onSelectLocation(target);
  };

  const selectSuggestion = (s: PlaceSuggestion) => select(suggestionTarget(s));

  const runSearch = (text: string) => {
    abortRef.current?.abort();
    const q = text.trim();
    if (parseCoordinates(q) || q.length < MIN_QUERY_LEN) {
      // Coordinate queries need no network round-trip.
      setSuggestions([]);
      setError(null);
      setLoading(false);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setOpen(true);
    searchPlaces(q, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setLoading(false);
        setHighlight(-1);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Search failed');
      });
  };

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), DEBOUNCE_MS);
  };

  const submit = () => {
    const target = coordinateTarget(trimmed);
    if (target) {
      select(target);
      return;
    }
    if (suggestions.length > 0) {
      // Arrow-key highlight wins, otherwise take the top result.
      const idx = highlight >= 0 && highlight < suggestions.length ? highlight : 0;
      selectSuggestion(suggestions[idx]);
      return;
    }
    // Nothing usable yet — surface the no-results state (unless still loading).
    if (trimmed.length >= MIN_QUERY_LEN && !loading) setOpen(true);
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS !== 'web') return;
    const key = e?.nativeEvent?.key;
    if (key === 'ArrowDown') {
      e.preventDefault?.();
      setOpen(true);
      setHighlight((h) => Math.min(rowCount - 1, h + 1));
    } else if (key === 'ArrowUp') {
      e.preventDefault?.();
      setHighlight((h) => Math.max(-1, h - 1));
    } else if (key === 'Escape') {
      e.preventDefault?.();
      close();
    }
  };

  // Close the dropdown on any click outside the search box (web only).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onDocDown = (e: MouseEvent) => {
      const el = boxRef.current;
      if (el && !el.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  // Abort in-flight work when unmounting.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const showDropdown = open && (loading || coord !== null || trimmed.length >= MIN_QUERY_LEN);

  return (
    <View style={styles.wrap} ref={boxRef}>
      <View style={styles.inputRow}>
        <Svg style={styles.searchIcon} width={15} height={15} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke={colors.forestDark} strokeWidth="2" />
          <Line x1="16.5" y1="16.5" x2="21" y2="21" stroke={colors.forestDark} strokeWidth="2" strokeLinecap="round" />
        </Svg>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onChangeText}
          placeholder="Search places or 12.9716, 77.5946"
          placeholderTextColor={colors.inputPlaceholder}
          returnKeyType="search"
          onSubmitEditing={submit}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            if (trimmed.length >= MIN_QUERY_LEN || loading) setOpen(true);
          }}
          accessibilityLabel="Search locations"
          testID="map-search-input"
        />
        {loading && (
          <ActivityIndicator size="small" color={colors.forestGreen} style={styles.spinner} />
        )}
        {!loading && query.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              abortRef.current?.abort();
              setQuery('');
              setSuggestions([]);
              setError(null);
              close();
            }}
            accessibilityLabel="Clear search"
            activeOpacity={0.7}
          >
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.goBtn}
          onPress={submit}
          accessibilityLabel="Search location"
          activeOpacity={0.85}
        >
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled" bounces={false}>
            {coord && (
              <TouchableOpacity
                style={[styles.row, highlight === 0 && styles.rowActive]}
                onPress={() => select(coordinateTarget(trimmed)!)}
                activeOpacity={0.75}
              >
                <View style={[styles.rowIcon, styles.coordIcon]}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="7" stroke={colors.terracotta} strokeWidth="1.8" />
                    <Line x1="12" y1="2" x2="12" y2="6" stroke={colors.terracotta} strokeWidth="1.8" />
                    <Line x1="12" y1="18" x2="12" y2="22" stroke={colors.terracotta} strokeWidth="1.8" />
                    <Line x1="2" y1="12" x2="6" y2="12" stroke={colors.terracotta} strokeWidth="1.8" />
                    <Line x1="18" y1="12" x2="22" y2="12" stroke={colors.terracotta} strokeWidth="1.8" />
                  </Svg>
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {formatCoordinateLabel(coord)}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    Coordinates — fly here directly
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>coords</Text>
                </View>
              </TouchableOpacity>
            )}
            {suggestions.map((s, i) => {
              const idx = (coord ? 1 : 0) + i;
              return (
                <TouchableOpacity
                  key={`${s.title}|${s.subtitle}|${i}`}
                  style={[styles.row, highlight === idx && styles.rowActive]}
                  onPress={() => selectSuggestion(s)}
                  activeOpacity={0.75}
                >
                  <View style={styles.rowIcon}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 21s-7-5.4-7-11a7 7 0 1114 0c0 5.6-7 11-7 11z"
                        stroke={colors.forestDark}
                        strokeWidth="1.8"
                      />
                      <Circle cx="12" cy="10" r="2.5" stroke={colors.forestDark} strokeWidth="1.8" />
                    </Svg>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {s.title}
                    </Text>
                    {!!s.subtitle && (
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {s.subtitle}
                      </Text>
                    )}
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{s.badge}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {loading && (
              <View style={styles.emptyRow}>
                <ActivityIndicator size="small" color={colors.forestGreen} />
                <Text style={styles.emptyText}>Searching places…</Text>
              </View>
            )}
            {!loading && !coord && suggestions.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  {error
                    ? 'Search failed — check your connection and retry'
                    : `No places found for “${trimmed}”`}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
    zIndex: 30,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    paddingLeft: 14,
    paddingRight: 6,
    ...shadows.subtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 13.5,
    color: colors.textPrimary,
    paddingVertical: 9,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  spinner: {
    marginRight: 8,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamCard,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  clearText: {
    fontSize: 16,
    lineHeight: 18,
    marginTop: -2,
    color: colors.textMuted,
  },
  goBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(228, 223, 220, 0.9)',
    overflow: 'hidden',
    ...shadows.floatingInput,
  },
  dropdownScroll: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.creamBorder,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  rowActive: {
    backgroundColor: colors.creamCard,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(163, 184, 153, 0.35)',
  },
  coordIcon: {
    backgroundColor: '#FDF2F0',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  badge: {
    backgroundColor: 'rgba(163, 184, 153, 0.35)',
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.forestDark,
    textTransform: 'uppercase',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  dropdownFooter: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.creamSidebar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.creamBorder,
  },
  footerText: {
    fontSize: 9,
    color: colors.textMuted,
  },
});
