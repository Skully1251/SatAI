import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';

export const ContactSection: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      alert('Please provide your name and email.');
      return;
    }
    alert(`Thank you, ${name}! Your ecological inquiry has been received. Our team will reach out promptly.`);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <View style={styles.sectionWrapper}>
      <View style={styles.container}>
        <View style={[styles.grid, !isDesktop && styles.gridStacked]}>
          {/* Left Column: Details & Contacts */}
          <View style={styles.detailsColumn}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Get in Touch</Text>
            </View>

            <Text style={styles.title}>Let's talk environmental intelligence.</Text>

            <Text style={styles.subtitle}>
              Have questions regarding custom GIS datasets or research integrations? Our team is here
              to help.
            </Text>

            <View style={styles.cardsStack}>
              {/* Email Card */}
              <View style={styles.contactCard}>
                <View style={[styles.contactIconBox, { backgroundColor: 'rgba(163, 184, 153, 0.35)' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      stroke={colors.forestDark}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <View>
                  <Text style={styles.cardMiniLabel}>EMAIL US</Text>
                  <Text style={styles.cardValue}>satqueryai@gmail.com</Text>
                </View>
              </View>

              {/* Location Card */}
              <View style={styles.contactCard}>
                <View style={[styles.contactIconBox, { backgroundColor: '#FDF2F0' }]}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" stroke={colors.terracotta} strokeWidth="1.8" />
                    <Path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" stroke={colors.terracotta} strokeWidth="1.8" />
                  </Svg>
                </View>
                <View>
                  <Text style={styles.cardMiniLabel}>HEADQUARTERS</Text>
                  <Text style={styles.cardValue}>Greater Noida, India</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column: Interactive Form */}
          <View style={styles.formColumn}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Send a Message</Text>
              <Text style={styles.formSubtitle}>
                Fill in your details and an ecological specialist will reach out promptly.
              </Text>

              <View style={styles.formFields}>
                <View style={styles.inputsRow}>
                  {/* Name Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>YOUR NAME</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="John Doe"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={name}
                      onChangeText={setName}
                    />
                  </View>

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>YOUR EMAIL</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="johndoe@gmail.com"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Message Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>MESSAGE</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe your research project or regional dataset requirements..."
                    placeholderTextColor={colors.inputPlaceholder}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* Bottom Row: Info + Submit */}
                <View style={styles.submitRow}>
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSubmit}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.sendButtonText}>Send Message</Text>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M6 12L3.27 3.13A60 60 0 0121.49 12 60 60 0 013.27 20.88L6 12zm0 0h7.5"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionWrapper: {
    backgroundColor: colors.creamSidebar,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    paddingTop: 88,
    paddingBottom: 48,
    paddingHorizontal: 24,
    minHeight: Platform.select<any>({ web: '100vh', default: 800 }),
    justifyContent: 'center',
  },
  container: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 48,
  },
  gridStacked: {
    flexDirection: 'column',
    gap: 40,
  },
  detailsColumn: {
    flex: 1,
    maxWidth: 500,
  },
  badge: {
    backgroundColor: 'rgba(163, 184, 153, 0.35)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forestDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.textMuted,
    marginBottom: 28,
  },
  cardsStack: {
    gap: 14,
  },
  contactCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(228, 223, 220, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...shadows.subtle,
  },
  contactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMiniLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formColumn: {
    flex: 1.2,
    width: '100%',
  },
  formCard: {
    backgroundColor: colors.white,
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(228, 223, 220, 0.8)',
    ...shadows.card,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 24,
  },
  formFields: {
    gap: 18,
  },
  inputsRow: {
    flexDirection: Platform.select({ web: 'row', default: 'column' }),
    gap: 16,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  encryptedText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.terracotta,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.full,
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s' },
    }),
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
