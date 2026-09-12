import React, { useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { HeroGreeting } from './HeroGreeting';
import { UserMessageBubble } from './UserMessageBubble';
import { AiMessageBubble } from './AiMessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { PromptInput } from './PromptInput';
import { useChatStore } from '../../store/chatStore';

export const ChatCanvas: React.FC = () => {
  const { messages, isTyping } = useChatStore();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const isConversationActive = messages.length > 0;

  if (!isConversationActive) {
    return (
      <View style={styles.welcomeWrapper}>
        <HeroGreeting />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.chatContainer}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <UserMessageBubble key={msg.id} message={msg} />
          ) : (
            <AiMessageBubble key={msg.id} message={msg} />
          )
        )}

        {isTyping && <TypingIndicator />}
      </ScrollView>

      {/* Floating Bottom Input Bar for ongoing chat */}
      <View style={styles.bottomInputContainer}>
        <PromptInput />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  welcomeWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  chatContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  scrollContent: {
    paddingTop: 80,
    paddingBottom: 110,
    paddingHorizontal: 8,
  },
  bottomInputContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 25,
  },
});
