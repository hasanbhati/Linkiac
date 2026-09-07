import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, Mail, Lock, AtSign, ArrowRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function MobileLoginScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        if (cleanUsername.length < 3) {
          setErrorMsg('Username must be at least 3 characters (letters, numbers, underscores).');
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
          const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('get_email_by_username', {
            p_username: cleanIdentifier,
          });

          if (rpcErr || !resolvedEmail) {
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

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.iconContainer}>
              <Bookmark color="#ffffff" size={28} />
            </View>
            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome to Linkiac'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Universal personal link library & private sharing'
                : 'Sign in to access your universal link library'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>USERNAME</Text>
                <View style={styles.inputContainer}>
                  <AtSign color="#71717a" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="unique_username"
                    placeholderTextColor="#52525b"
                    value={username}
                    onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{isSignUp ? 'EMAIL ADDRESS' : 'EMAIL OR USERNAME'}</Text>
              <View style={styles.inputContainer}>
                <Mail color="#71717a" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isSignUp ? 'you@example.com' : 'you@example.com or username'}
                  placeholderTextColor="#52525b"
                  value={isSignUp ? email : identifier}
                  onChangeText={isSignUp ? setEmail : setIdentifier}
                  autoCapitalize="none"
                  keyboardType={isSignUp ? 'email-address' : 'default'}
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <Lock color="#71717a" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#52525b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
                  <ArrowRight color="#ffffff" size={16} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Toggle Mode Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? ' Sign In' : ' Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#4f46e5',
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
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
});
