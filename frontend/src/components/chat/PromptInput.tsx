import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
  Image,
  Text,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';

interface PromptInputProps {
  onSend?: (text: string) => void;
  autoFocus?: boolean;
}

const ImageIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <Path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </Svg>
);

export const PromptInput: React.FC<PromptInputProps> = ({ onSend, autoFocus = false }) => {
  const { inputValue, setInputValue, sendQuery, isTyping } = useChatStore();
  const [isFocused, setIsFocused] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageSelect = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setSelectedImage(url);
        }
      };
      input.click();
    } else {
      alert("Image upload is supported on web in this demo.");
    }
  };

  const handleSend = () => {
    if ((!inputValue.trim() && !selectedImage) || isTyping) return;
    if (onSend) {
      onSend(inputValue);
    } else {
      sendQuery();
    }
    // Clear image after sending
    setSelectedImage(null);
  };

  const handleSubmitEditing = (
    e: NativeSyntheticEvent<TextInputSubmitEditingEventData>
  ) => {
    handleSend();
  };

  const hasContent = inputValue.trim().length > 0 || selectedImage !== null;

  return (
    <View
      style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        selectedImage && styles.inputWrapperWithImage
      ]}
    >
      {/* Image Preview Area */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <View style={styles.imageThumbnailWrapper}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity 
              style={styles.removeImageButton} 
              onPress={() => setSelectedImage(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.removeImageText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
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

        {/* Suffix Actions */}
        <View style={styles.suffixActions}>
          {/* Always show image upload if no image is selected, or even if it is, maybe replace it. Let's show it always. */}
          {!selectedImage && (
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={handleImageSelect}
              disabled={isTyping}
            >
              <ImageIcon color={colors.inputPlaceholder} />
            </TouchableOpacity>
          )}

          {hasContent ? (
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
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={() => alert('Voice input activated')}
              disabled={isTyping}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'column',
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
        transition: 'border-color 0.2s, box-shadow 0.2s, border-radius 0.2s',
      },
    }),
  },
  inputWrapperWithImage: {
    borderRadius: 16, // slightly less rounded when showing an image
  },
  inputWrapperFocused: {
    borderColor: colors.forestGreen,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 34px rgba(45, 90, 55, 0.15)',
      },
    }),
  },
  imagePreviewContainer: {
    marginBottom: 12,
    marginTop: 4,
  },
  imageThumbnailWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.creamBg,
    ...shadows.subtle,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: radii.sm,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
    ...Platform.select({
      web: { cursor: 'pointer' }
    }),
  },
  removeImageText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: -2, // visual centering
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  suffixActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'opacity 0.2s' }
    }),
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s, transform 0.2s' }
    }),
  },
});
