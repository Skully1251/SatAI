import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radii, shadows } from '../../theme/spacing';
import { PromptInput } from './PromptInput';
import { useChatStore, INITIAL_SUGGESTIONS } from '../../store/chatStore';

export const HeroGreeting: React.FC = () => {
  const { sendQuery } = useChatStore();

  const handleChipPress = (text: string) => {
    sendQuery(text);
  };

  return (
    <View style={styles.heroContainer}>
      {/* Welcome Heading */}
      <View style={styles.headingBlock}>
        <Text style={styles.welcomeText}>
          Welcome to <Text style={styles.brandHighlight}>Sat AI</Text>.
        </Text>
        <Text style={styles.subGreetingText}>
          How can I help you explore today?
        </Text>
      </View>

      {/* Query Bar */}
      <View style={styles.inputWrapper}>
        <PromptInput />
      </View>

      {/* Suggested Prompts */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsLabel}>Suggested prompts</Text>
        <View style={styles.chipsColumn}>
          {INITIAL_SUGGESTIONS.map((chip, index) => (
            <TouchableOpacity
              key={`${chip.id}-${index}`}
              style={styles.frostedChip}
              onPress={() => handleChipPress(chip.text)}
              activeOpacity={0.75}
            >
              <Text style={styles.chipText}>{chip.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    width: '100%',
    maxWidth: 620,
    zIndex: 10,
  },
  headingBlock: {
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '400',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  brandHighlight: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subGreetingText: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '400',
    color: colors.textPrimary,
    marginTop: 4,
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      web: 'Inter, sans-serif',
      default: 'System',
    }),
  },
  inputWrapper: {
    marginBottom: 28,
    width: '100%',
  },
  suggestionsContainer: {
    gap: 12,
  },
  suggestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: Platform.select({
      web: 'Geist, Inter, sans-serif',
      default: 'System',
    }),
  },
  chipsColumn: {
    alignItems: 'flex-start',
    gap: 10,
  },
  frostedChip: {
    backgroundColor: colors.frostedChipBg,
    borderRadius: radii.full,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.frostedChipBorder,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(25, 45, 30, 0.04)',
      },
    }),
  },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.frostedChipText,
    fontFamily: Platform.select({
      web: 'Inter, sans-serif',
      default: 'System',
    }),
  },
});
