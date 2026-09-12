import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChatMessage } from '../../store/types';
import { colors } from '../../theme/colors';
import { radii } from '../../theme/spacing';

interface AiMessageBubbleProps {
  message: ChatMessage;
}

export const AiMessageBubble: React.FC<AiMessageBubbleProps> = ({ message }) => {
  return (
    <View style={styles.container}>
      {/* AI Eco Avatar */}
      <View style={styles.avatar}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z"
            fill={colors.forestGreen}
          />
        </Svg>
      </View>

      {/* Message Content */}
      <View style={styles.contentColumn}>
        <Text style={styles.primaryText}>{message.content}</Text>

        {/* Follow up question if present */}
        {message.followUpQuestion && (
          <Text style={styles.followUpText}>{message.followUpQuestion}</Text>
        )}

        {/* Key insight chips if present */}
        {message.keyInsights && message.keyInsights.length > 0 && (
          <View style={styles.insightsRow}>
            {message.keyInsights.map((insight, idx) => (
              <View key={idx} style={styles.insightChip}>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    maxWidth: '85%',
    marginVertical: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  contentColumn: {
    flex: 1,
    gap: 8,
  },
  primaryText: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.aiBubbleText,
    fontFamily: Platform.select({
      web: 'Inter, sans-serif',
      default: 'System',
    }),
  },
  followUpText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontFamily: Platform.select({
      web: 'Inter, sans-serif',
      default: 'System',
    }),
  },
  insightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  insightChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  insightText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forestDark,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
