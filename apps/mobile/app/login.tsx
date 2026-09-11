import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, Mail, Lock, AtSign, ArrowRight, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { LinkiacSymbol } from '../src/components/LinkiacLogo';
import { useTheme } from '../src/context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.4 7.34 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </Svg>
  );
}

function AppleIcon({ color = '#ffffff' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 170 170">
      <Path
        fill={color}
        d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.05-7.58-7.7-11.66-13.94-6.3-9.69-11.19-20.73-14.67-33.12-3.48-12.39-5.22-23.75-5.22-34.09 0-14.79 3.59-26.69 10.77-35.7 7.18-9.01 16.29-13.62 27.34-13.84 5.33 0 11.22 1.41 17.67 4.24 6.45 2.83 10.29 4.3 11.51 4.41 1.42-.22 5.56-1.8 12.42-4.74 6.86-2.94 12.74-4.24 17.65-3.92 13.06.65 23.39 5.33 30.99 14.04-11.53 6.96-17.18 16.43-16.97 28.4.22 9.36 3.76 17.14 10.61 23.34 6.86 6.2 14.96 9.79 24.31 10.77-2.39 7.4-5.33 15.23-8.82 23.5zM119.22 31.84c0-7.72 2.72-15.02 8.16-21.89 5.44-6.87 12.19-10.99 20.24-12.35.22 1.41.33 2.72.33 3.92 0 7.84-2.83 15.29-8.49 22.35-5.66 7.07-12.51 11.05-20.57 11.97-.22-1.31-.33-2.62-.33-3.92z"
      />
    </Svg>
  );
}

export default function MobileLoginScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setIsAppleAvailable)
      .catch(() => setIsAppleAvailable(false));
  }, []);

  // Forgot password state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleForgotPassword = async () => {
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim());
      if (error) throw error;
      Alert.alert(
        'Reset Link Sent',
        `A password reset link has been sent to ${resetEmail.trim()}. Please check your email inbox.`
      );
      setIsForgotPasswordOpen(false);
      setResetEmail('');
    } catch (err: any) {
      Alert.alert('Reset Failed', err.message || 'Failed to send password reset email.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    if (isSignUp) {
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }
    } else {
      if (!identifier.trim() || !password) {
        setErrorMsg('Please enter your email/username and password.');
        return;
      }
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!agreedToTerms) {
          setErrorMsg('You must agree to the Terms of Service & EULA and Privacy Policy to continue.');
          setIsLoading(false);
          return;
        }

        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        if (cleanUsername.length < 3) {
          setErrorMsg('Username must be at least 3 characters (letters, numbers, underscores).');
          setIsLoading(false);
          return;
        }

        // Proactively check if username is already taken to prevent silent suffixing (BUG-02)
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          setErrorMsg(`Username @${cleanUsername} is already taken. Please choose another.`);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
              full_name: cleanUsername,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          router.replace('/(tabs)/library');
        } else {
          Alert.alert(
            'Confirmation Sent',
            'Please check your email to confirm your account, then sign in.',
            [{ text: 'OK', onPress: () => setIsSignUp(false) }]
          );
        }
      } else {
        const cleanIdentifier = identifier.trim();
        let authEmail = cleanIdentifier;

        // If user entered a username without @, resolve to email via RPC
        if (!cleanIdentifier.includes('@')) {
          let resolvedEmail: string | null = null;
          const { data: secureEmail, error: secureErr } = await supabase.rpc('get_email_by_username', {
            p_username: cleanIdentifier,
            p_password: password,
          });

          if (!secureErr && secureEmail) {
            resolvedEmail = secureEmail;
          } else if (secureErr?.code === 'PGRST202' || secureErr?.message?.includes('schema cache')) {
            // Fallback to legacy 1-param signature if migration has not run yet
            const { data: legacyEmail } = await supabase.rpc('get_email_by_username', {
              p_username: cleanIdentifier,
            });
            resolvedEmail = legacyEmail;
          }

          if (!resolvedEmail) {
            setErrorMsg('Invalid username or password.');
            setIsLoading(false);
            return;
          }

          authEmail = resolvedEmail;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session) {
          router.replace('/(tabs)/library');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'google') setIsGoogleLoading(true);
      if (provider === 'apple') setIsAppleLoading(true);
      setErrorMsg(null);

      const redirectUrl = Linking.createURL('login');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (result.type === 'success' && result.url) {
          const parsed = Linking.parse(result.url);
          if (parsed.queryParams?.code) {
            const { data: sessionData, error: sessionErr } =
              await supabase.auth.exchangeCodeForSession(parsed.queryParams.code as string);
            if (sessionErr) throw sessionErr;
            if (sessionData.session) {
              router.replace('/(tabs)/library');
              return;
            }
          } else if (result.url.includes('#')) {
            const hashString = result.url.split('#')[1];
            const hashParams = new URLSearchParams(hashString);
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');
            if (access_token && refresh_token) {
              const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (sessionErr) throw sessionErr;
              if (sessionData.session) {
                router.replace('/(tabs)/library');
                return;
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.message?.includes('cancel') || err.code === 'ERR_CANCELED') {
        return;
      }
      setErrorMsg(err.message || `Failed to sign in with ${provider}.`);
    } finally {
      setIsGoogleLoading(false);
      setIsAppleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (isAppleAvailable) {
      try {
        setIsAppleLoading(true);
        setErrorMsg(null);

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          throw new Error('No identity token received from Apple.');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          throw error;
        }

        // Apple only transmits fullName on the very first authorization.
        // Persist it immediately to user metadata and profiles so it isn't lost.
        if (credential.fullName && data.user) {
          const nameParts = [
            credential.fullName.givenName?.trim(),
            credential.fullName.familyName?.trim(),
          ].filter(Boolean);

          if (nameParts.length > 0) {
            const fullName = nameParts.join(' ');
            try {
              await supabase.auth.updateUser({
                data: { full_name: fullName },
              });
              await supabase
                .from('profiles')
                .update({ display_name: fullName })
                .eq('id', data.user.id);
            } catch {
              // Non-blocking: profile update can still be completed in settings
            }
          }
        }

        if (data.session) {
          router.replace('/(tabs)/library');
        }
      } catch (err: any) {
        if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') {
          return;
        }
        setErrorMsg(err.message || 'Apple sign-in failed. Please try again.');
      } finally {
        setIsAppleLoading(false);
      }
    } else {
      await handleOAuthSignIn('apple');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.canvas }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? '#000000' : '#ffffff', borderColor: theme.border }]}>
              <LinkiacSymbol size={44} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {isSignUp ? 'Create Account' : 'Welcome to Linkiac'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {isSignUp
                ? 'Universal personal link library & private sharing'
                : 'Sign in to access your universal link library'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>USERNAME</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                  <AtSign color={theme.textMuted} size={18} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="unique_username"
                    placeholderTextColor={theme.textMuted}
                    value={username}
                    onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{isSignUp ? 'EMAIL ADDRESS' : 'EMAIL OR USERNAME'}</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <Mail color={theme.textMuted} size={18} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder={isSignUp ? 'you@example.com' : 'you@example.com or username'}
                  placeholderTextColor={theme.textMuted}
                  value={isSignUp ? email : identifier}
                  onChangeText={isSignUp ? setEmail : setIdentifier}
                  autoCapitalize="none"
                  keyboardType={isSignUp ? 'email-address' : 'default'}
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>PASSWORD</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <Lock color={theme.textMuted} size={18} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {!isSignUp && (
              <TouchableOpacity
                style={styles.forgotPasswordWrap}
                onPress={() => setIsForgotPasswordOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.accentPrimary }]}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {isSignUp && (
              <View style={styles.agreementRow}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      borderColor: agreedToTerms ? theme.accentPrimary : theme.border,
                      backgroundColor: agreedToTerms ? theme.accentPrimary : theme.surfaceSubtle,
                    },
                  ]}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  activeOpacity={0.8}
                >
                  {agreedToTerms && <Check size={13} color={theme.accentText} strokeWidth={3} />}
                </TouchableOpacity>
                <Text style={[styles.agreementLabel, { color: theme.textSecondary }]}>
                  I agree to Linkiac&apos;s{' '}
                  <Text
                    style={[styles.legalInlineLink, { color: theme.accentPrimary }]}
                    onPress={() => WebBrowser.openBrowserAsync('https://linkiac.eu/terms')}
                  >
                    Terms of Service &amp; EULA
                  </Text>{' '}
                  and acknowledge the{' '}
                  <Text
                    style={[styles.legalInlineLink, { color: theme.accentPrimary }]}
                    onPress={() => WebBrowser.openBrowserAsync('https://linkiac.eu/privacy')}
                  >
                    Privacy Policy
                  </Text>.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.accentPrimary },
                (isLoading || isGoogleLoading || isAppleLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || isGoogleLoading || isAppleLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={[styles.buttonText, { color: theme.accentText }]}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                  <ArrowRight color={theme.accentText} size={16} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={[
                styles.oauthButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
                (isLoading || isGoogleLoading || isAppleLoading) && styles.buttonDisabled,
              ]}
              onPress={() => handleOAuthSignIn('google')}
              disabled={isLoading || isGoogleLoading || isAppleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={theme.textPrimary} size="small" />
              ) : (
                <View style={styles.oauthButtonInner}>
                  <GoogleIcon />
                  <Text style={[styles.oauthButtonText, { color: theme.textPrimary }]}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Apple OAuth / Native Button */}
            {isAppleAvailable ? (
              <View style={styles.appleButtonContainer}>
                {isAppleLoading ? (
                  <View style={[styles.appleLoadingContainer, { backgroundColor: theme.surfaceSubtle }]}>
                    <ActivityIndicator color={theme.textPrimary} />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      isSignUp
                        ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                        : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={isDark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.oauthButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  (isLoading || isGoogleLoading || isAppleLoading) && styles.buttonDisabled,
                ]}
                onPress={handleAppleSignIn}
                disabled={isLoading || isGoogleLoading || isAppleLoading}
                activeOpacity={0.8}
              >
                {isAppleLoading ? (
                  <ActivityIndicator color={theme.textPrimary} size="small" />
                ) : (
                  <View style={styles.oauthButtonInner}>
                    <AppleIcon color={theme.textPrimary} />
                    <Text style={[styles.oauthButtonText, { color: theme.textPrimary }]}>Continue with Apple</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Toggle Mode Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.toggleText, { color: theme.accentPrimary }]}>
                {isSignUp ? ' Sign In' : ' Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Legal / Terms & Privacy Disclaimer for App Store Guideline 5.1.1 & 1.2 */}
          <View style={styles.legalDisclaimer}>
            <Text style={[styles.legalText, { color: theme.textMuted }]}>
              By continuing, you agree to Linkiac&apos;s{' '}
              <Text
                style={[styles.legalLink, { color: theme.accentPrimary }]}
                onPress={() => WebBrowser.openBrowserAsync('https://linkiac.eu/terms')}
              >
                Terms of Service &amp; EULA
              </Text>{' '}
              and{' '}
              <Text
                style={[styles.legalLink, { color: theme.accentPrimary }]}
                onPress={() => WebBrowser.openBrowserAsync('https://linkiac.eu/privacy')}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal (GAP-07) */}
      <Modal
        visible={isForgotPasswordOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsForgotPasswordOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setIsForgotPasswordOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={theme.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Enter your registered email address to receive a secure link to reset your password.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>EMAIL ADDRESS</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
                <Mail color={theme.textMuted} size={18} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="you@example.com"
                  placeholderTextColor={theme.textMuted}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accentPrimary }, isSendingReset && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={isSendingReset}
              activeOpacity={0.8}
            >
              {isSendingReset ? (
                <ActivityIndicator color={theme.accentText} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.accentText }]}>Send Password Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#bcd94e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a1a1aa',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fafafa',
    fontSize: 14,
  },
  button: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#71717a',
    fontSize: 13,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotPasswordWrap: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fafafa',
    fontSize: 18,
    fontWeight: '700',
  },
  modalDesc: {
    color: '#a1a1aa',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  dividerText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appleButtonContainer: {
    width: '100%',
    height: 48,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  appleLoadingContainer: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthButton: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  oauthButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  oauthButtonText: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
  },
  legalDisclaimer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  agreementLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  legalInlineLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
