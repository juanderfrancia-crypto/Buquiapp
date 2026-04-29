import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { Colors } from '@/constants';
import { UserRole } from '@/types';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Campos requeridos', 'Completa todos los campos');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Contraseña corta', 'Debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('¡Cuenta creada!', 'Revisa tu correo para confirmar tu cuenta.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <Text style={styles.logoEmoji}>✂️</Text>
          </View>
          <Text style={styles.brand}>Únete a Barberly</Text>
          <Text style={styles.tagline}>Reserva en segundos, sin llamadas</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crear cuenta</Text>

          {/* Role Selector */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleBtn, role === 'client' && styles.roleBtnActive]}
              onPress={() => setRole('client')}
            >
              <Ionicons name="person-outline" size={18} color={role === 'client' ? Colors.primary : Colors.textMuted} />
              <View>
                <Text style={[styles.roleTitle, role === 'client' && styles.roleTitleActive]}>Soy cliente</Text>
                <Text style={styles.roleSubtitle}>Busco y reservo</Text>
              </View>
              {role === 'client' && <View style={styles.roleCheck}><Ionicons name="checkmark" size={13} color={Colors.white} /></View>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === 'barber' && styles.roleBtnActive]}
              onPress={() => setRole('barber')}
            >
              <Ionicons name="cut-outline" size={18} color={role === 'barber' ? Colors.primary : Colors.textMuted} />
              <View>
                <Text style={[styles.roleTitle, role === 'barber' && styles.roleTitleActive]}>Soy barbero</Text>
                <Text style={styles.roleSubtitle}>Gestiono mi negocio</Text>
              </View>
              {role === 'barber' && <View style={styles.roleCheck}><Ionicons name="checkmark" size={13} color={Colors.white} /></View>}
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 20 }}>
            <Input label="Nombre completo" placeholder="Juan García" value={name} onChangeText={setName} icon="person-outline" />
            <Input label="Correo electrónico" placeholder="tu@correo.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
            <Input label="Contraseña" placeholder="Mínimo 8 caracteres" value={password} onChangeText={setPassword} secureTextEntry icon="lock-closed-outline" />
          </View>

          <Button title="Crear mi cuenta" onPress={handleRegister} loading={loading} style={{ marginTop: 8 }} />

          <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: Colors.primary },
  hero: { alignItems: 'center', paddingTop: 56, paddingBottom: 36, paddingHorizontal: 24 },
  backBtn: {
    position: 'absolute', top: 56, left: 24,
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoWrap: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: Colors.accentLight,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoEmoji: { fontSize: 32 },
  brand: { fontSize: 26, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 5 },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    flex: 1, padding: 28, paddingTop: 28, minHeight: 540,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 18, letterSpacing: -0.3 },
  roleContainer: { flexDirection: 'row', gap: 10 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    padding: 12, backgroundColor: Colors.background, position: 'relative',
  },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(26,26,46,0.05)' },
  roleTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  roleTitleActive: { color: Colors.primary },
  roleSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  roleCheck: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  loginLink: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: Colors.textSecondary },
  loginLinkBold: { color: Colors.primary, fontWeight: '700' },
});
