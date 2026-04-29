import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { Colors } from '@/constants';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveringPassword, setRecoveringPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert('Error al iniciar sesión', error.message);
      return;
    }
    if (data.session) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .single();
      router.replace(profile?.role === 'barber' ? '/barber/dashboard' : '/client/home');
    }
  }

  async function handlePasswordRecovery() {
    Alert.prompt('Recuperar contraseña', 'Ingresa tu correo electrónico registrado', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar enlace',
        onPress: async (recoveryEmail) => {
          if (!recoveryEmail?.trim()) {
            Alert.alert('Correo requerido', 'Ingresa tu correo para recuperar la contraseña');
            return;
          }
          setRecoveringPassword(true);
          const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
            redirectTo: 'barberly://auth/reset-password',
          });
          setRecoveringPassword(false);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            Alert.alert('Éxito', `Hemos enviado un enlace de recuperación a ${recoveryEmail}. Revisa tu correo.`);
          }
        }
      }
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>✂️</Text>
          </View>
          <Text style={styles.brand}>Barberly</Text>
          <Text style={styles.tagline}>Tu turno, a un toque de distancia</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>
          <Text style={styles.cardSub}>Inicia sesión para continuar</Text>

          <View style={styles.form}>
            <Input
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
            />
            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              icon="lock-closed-outline"
            />

            <TouchableOpacity style={styles.forgotWrap} onPress={handlePasswordRecovery} disabled={recoveringPassword}>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <Button title="Iniciar sesión" onPress={handleLogin} loading={loading} style={styles.btn} />
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/auth/register')}>
            <Text style={styles.registerText}>Crear cuenta gratis</Text>
            <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.primary },
  hero: { alignItems: 'center', paddingTop: 72, paddingBottom: 40, paddingHorizontal: 24 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.accentLight,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  logoEmoji: { fontSize: 38 },
  brand: { fontSize: 34, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6, letterSpacing: 0.2 },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    padding: 28,
    paddingTop: 32,
    minHeight: 460,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  cardSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 28 },
  form: { gap: 0 },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 },
  forgot: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
  btn: { marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14, padding: 14,
  },
  registerText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
