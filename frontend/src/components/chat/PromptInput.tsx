import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';

interface PromptInputProps {
  onSend?: (text: string) => void;
  autoFocus?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSend, autoFocus = false }) => {
  const { inputValue, setInputValue, sendQuery, isTyping } = useChatStore();
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (!inputValue.trim() || isTyping) return;
    if (onSend) {
      onSend(inputValue);
    } else {
      sendQuery();
    }
  };

  const handleSubmitEditing = (
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    handleSend();
  };

  const hasText = inputValue.trim().length > 0;

  return (
    <View
      style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
      ]}
    >
      {/* Prefix: Stylized Green Leaf Icon */}
      <View style={styles.prefixIconContainer}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M19.5 4.5 C14 4.5 9 8 7 13 C5.5 17 6.5 19 7 19.5 C7.5 20 9.5 21 13.5 19.5 C18.5 17.5 22 12.5 22 7 C22 5.5 21 4.5 19.5 4.5 Z"
            fill={colors.forestGreen}
            opacity={0.9}
          />
          <Path
            d="M7 19.5 C11 15.5 15.5 11 19.5 4.5"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Text Input */}
      <TextInput
        style={styles.textInput}
        placeholder="Ask Sat AI anything..."
        placeholderTextColor={colors.inputPlaceholder}
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={handleSubmitEditing}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={autoFocus}
        returnKeyType="send"
        editable={!isTyping}
      />

      {/* Suffix: Microphone or Submit Button */}
      {hasText ? (
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={isTyping}
          activeOpacity={0.8}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 19V5M5 12L12 5L19 12"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.micButton}
          activeOpacity={0.7}
          onPress={() => alert('Voice input activated')}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"
              stroke={colors.inputPlaceholder}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M19 10v2a7 7 0 0 1-14 0v-2"
              stroke={colors.inputPlaceholder}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 19v3"
              stroke={colors.inputPlaceholder}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </Svg>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'web' ? 14 : 10,
    width: '100%',
    maxWidth: 580,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    ...shadows.floatingInput,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 30px rgba(22, 45, 29, 0.1)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      },
    }),
  },
  inputContainerFocused: {
    borderColor: colors.forestGreen,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 34px rgba(45, 90, 55, 0.15)',
      },
    }),
  },
  prefixIconContainer: {
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.select({
      web: 'Inter, sans-serif',
      default: 'System',
    }),
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  micButton: {
    marginLeft: 10,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    marginLeft: 10,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
});
