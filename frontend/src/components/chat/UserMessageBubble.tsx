import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ChatMessage } from '../../store/types';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

interface UserMessageBubbleProps {
  message: ChatMessage;
}

export const UserMessageBubble: React.FC<UserMessageBubbleProps> = ({ message }) => {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{message.content}</Text>
      </View>
      <Text style={styles.timestamp}>{message.timestamp}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'flex-end',
    width: '100%',
    marginVertical: 8,
  },
  bubble: {
    backgroundColor: colors.userBubbleBg,
    borderRadius: 20,
    borderTopRightRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: '75%',
    ...shadows.subtle,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(22, 45, 29, 0.06)',
      },
    }),
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.userBubbleText,
    fontFamily: Platform.select({
      web: 'Inter, sans-serif',
      default: 'System',
    }),
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginRight: 6,
  },
});
