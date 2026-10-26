import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@apollo/client/react';
import { LOGIN, SIGNUP } from '../graphql';
import { useAuth } from '../auth';
import { colors, gradient } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [login, { loading: l1 }] = useMutation(LOGIN);
  const [signup, { loading: l2 }] = useMutation(SIGNUP);
  const loading = l1 || l2;

  const submit = async () => {
    setError('');
    if (!email || !password) return setError('Please enter email and password');
    try {
      const { data } = await (isLogin ? login : signup)({ variables: { email, password } });
      await signIn(isLogin ? data.login : data.signup);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#2a1f6b', colors.bg, colors.bg]} style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        <LinearGradient colors={gradient} style={styles.logo}>
          <Text style={styles.logoText}>✓</Text>
        </LinearGradient>
        <Text style={styles.title}>{isLogin ? 'Welcome back' : 'Create account'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Sign in to manage your tasks.' : 'Start organising your day.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            testID="email-input"
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="password-input"
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.dim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable testID="auth-submit" onPress={submit} disabled={loading} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Sign in' : 'Sign up'}</Text>}
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable testID="auth-toggle" onPress={() => { setIsLogin(!isLogin); setError(''); }}>
          <Text style={styles.toggle}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <Text style={{ color: colors.brandLight, fontWeight: '600' }}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  title: { color: colors.text, fontSize: 30, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 20 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 16 },
  error: { color: colors.danger, marginTop: 12, fontSize: 14 },
  button: { marginTop: 20, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggle: { color: colors.muted, textAlign: 'center', marginTop: 24, fontSize: 14 },
});
