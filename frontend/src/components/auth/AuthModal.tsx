import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { radii, shadows } from '../../theme/spacing';
import { useAuthStore } from '../../store/authStore';

/**
 * Sat AI authentication modal — Log in / Sign up (Firebase email+password)
 * with Continue with Google (web) and an inline password-reset mode.
 * Rendered once at the app root; opened via authStore.openAuthModal.
 */
export const AuthModal: React.FC = () => {
  const {
    modalOpen,
    modalMode,
    modalError,
    modalBusy,
    closeAuthModal,
    setModalMode,
    login,
    signup,
    loginWithGoogle,
    resetPassword,
  } = useAuthStore();

  // 'reset' is a transient view inside the modal, not a store mode.
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset transient state whenever the modal (re)opens.
  useEffect(() => {
    if (modalOpen) {
      setResetMode(false);
      setResetSent(false);
      setShowPassword(false);
    }
  }, [modalOpen]);

  const handleSubmit = async () => {
    if (resetMode) {
      const ok = await resetPassword(email.trim());
      if (ok) setResetSent(true);
      return;
    }
    if (modalMode === 'signup') {
      await signup(name.trim(), email.trim(), password);
    } else {
      await login(email.trim(), password);
    }
  };

  const handleModeChange = (mode: 'login' | 'signup') => {
    setResetMode(false);
    setResetSent(false);
    setModalMode(mode);
  };

  const handleClose = () => {
    if (!modalBusy) closeAuthModal();
  };

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop} testID="auth-modal">
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          accessibilityLabel="Close authentication"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centering}
          pointerEvents="box-none"
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              {/* Brand header */}
              <View style={styles.brandRow}>
                <View style={styles.logoCircle}>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M19.5 4.5 C14 4.5 9 8 7 13 C5.5 17 6.5 19 7 19.5 C7.5 20 9.5 21 13.5 19.5 C18.5 17.5 22 12.5 22 7 C22 5.5 21 4.5 19.5 4.5 Z"
                      fill={colors.leafGreen}
                      opacity={0.92}
                    />
                    <Path
                      d="M7 19.5 C11 15.5 15.5 11 19.5 4.5"
                      stroke="#FFFFFF"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
                <Text style={styles.brandText}>Sat AI</Text>
              </View>

              <Text style={styles.title}>
                {resetMode ? 'Reset your password' : modalMode === 'login' ? 'Welcome back' : 'Join Sat AI'}
              </Text>
              <Text style={styles.subtitle}>
                {resetMode
                  ? 'Enter your email and we will send you a reset link.'
                  : modalMode === 'login'
                    ? 'Log in to explore the Earth with AI.'
                    : 'Create an account to start analyzing your land.'}
              </Text>

              {/* Mode pills (hidden while resetting) */}
              {!resetMode && (
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modePill, modalMode === 'login' && styles.modePillActive]}
                    onPress={() => handleModeChange('login')}
                    testID="auth-mode-login"
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.modePillText, modalMode === 'login' && styles.modePillTextActive]}
                    >
                      Log in
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modePill, modalMode === 'signup' && styles.modePillActive]}
                    onPress={() => handleModeChange('signup')}
                    testID="auth-mode-signup"
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.modePillText, modalMode === 'signup' && styles.modePillTextActive]}
                    >
                      Sign up
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error banner */}
              {modalError ? (
                <View style={styles.errorBanner} testID="auth-error">
                  <Text style={styles.errorText}>{modalError}</Text>
                </View>
              ) : null}

              {/* Reset-success state */}
              {resetMode && resetSent ? (
                <View style={styles.resetSuccessWrap}>
                  <Text style={styles.resetSuccessText}>
                    Reset link sent to <Text style={styles.resetSuccessEmail}>{email.trim()}</Text>.
                    Check your inbox and follow the link.
                  </Text>
                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => {
                      setResetMode(false);
                      setResetSent(false);
                    }}
                  >
                    <Text style={styles.backLinkText}>Back to log in</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* Form */}
                  {modalMode === 'signup' && !resetMode && (
                    <TextInput
                      style={styles.input}
                      placeholder="Full name"
                      placeholderTextColor={colors.inputPlaceholder}
                      value={name}
                      onChangeText={setName}
                      autoComplete="name"
                      testID="auth-name"
                    />
                  )}

                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={colors.inputPlaceholder}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    testID="auth-email"
                  />

                  {!resetMode && (
                    <View style={styles.passwordWrap}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Password"
                        placeholderTextColor={colors.inputPlaceholder}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoComplete={modalMode === 'signup' ? 'new-password' : 'current-password'}
                        onSubmitEditing={handleSubmit}
                        testID="auth-password"
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword(!showPassword)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Submit */}
                  <TouchableOpacity
                    style={[styles.submitBtn, modalBusy && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={modalBusy}
                    activeOpacity={0.85}
                    testID="auth-submit"
                  >
                    {modalBusy ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.submitText}>
                        {resetMode
                          ? 'Send reset email'
                          : modalMode === 'signup'
                            ? 'Create account'
                            : 'Log in'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Forgot password (login only) */}
                  {modalMode === 'login' && !resetMode && (
                    <TouchableOpacity
                      style={styles.forgotLink}
                      onPress={() => {
                        setResetSent(false);
                        setResetMode(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}

                  {/* Continue with Google (web only) */}
                  {Platform.OS === 'web' && !resetMode && (
                    <>
                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <TouchableOpacity
                        style={styles.googleBtn}
                        onPress={() => void loginWithGoogle()}
                        disabled={modalBusy}
                        activeOpacity={0.85}
                        testID="auth-google"
                      >
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <Path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <Path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <Path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                        </Svg>
                        <Text style={styles.googleText}>Continue with Google</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {/* Switch-mode footer */}
              {!resetMode && (
                <Text style={styles.switchText}>
                  {modalMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <Text
                    style={styles.switchLink}
                    onPress={() => handleModeChange(modalMode === 'login' ? 'signup' : 'login')}
                  >
                    {modalMode === 'login' ? 'Sign up' : 'Log in'}
                  </Text>
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 53, 36, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centering: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  scroll: {
    width: '100%',
    maxHeight: '85%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: 28,
    paddingHorizontal: 28,
    width: '90%',
    maxWidth: 420,
    ...shadows.card,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.creamSidebar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 18,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.creamCard,
    borderRadius: radii.full,
    padding: 4,
    marginBottom: 18,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.full,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: colors.forestGreen,
  },
  modePillText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modePillTextActive: {
    color: colors.white,
  },
  errorBanner: {
    backgroundColor: 'rgba(197, 107, 81, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 107, 81, 0.35)',
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12.5,
    color: colors.terracottaHover,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.creamSidebar,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creamSidebar,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  eyeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.forestGreen,
  },
  submitBtn: {
    backgroundColor: colors.forestGreen,
    borderRadius: radii.full,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    ...shadows.subtle,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s' },
    }),
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.white,
    fontSize: 14.5,
    fontWeight: '700',
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: 12,
  },
  forgotText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.terracotta,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.creamBorder,
  },
  dividerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.full,
    paddingVertical: 11,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.2s' },
    }),
  },
  googleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  switchText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 18,
  },
  switchLink: {
    color: colors.forestGreen,
    fontWeight: '700',
  },
  resetSuccessWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetSuccessText: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetSuccessEmail: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backLink: {
    marginTop: 14,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forestGreen,
  },
});
