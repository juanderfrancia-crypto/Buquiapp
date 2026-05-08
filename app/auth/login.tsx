import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Modal, TextInput, Image, StatusBar, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Button, Input } from '@/components/ui';
import { Colors } from '@/constants';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [recoverySending, setRecoverySending] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
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

  async function handleSendRecovery() {
    if (!recoveryEmail.trim()) {
      Alert.alert('Correo requerido', 'Ingresa tu correo electrónico');
      return;
    }
    setRecoverySending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
      redirectTo: 'barberly://auth/reset-password',
    });
    setRecoverySending(false);
    setRecoveryVisible(false);
    setRecoveryEmail('');
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Correo enviado', `Revisa tu bandeja de entrada en ${recoveryEmail.trim()}.`);
    }
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <KeyboardAvoidingView style={styles.root} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Logo + brand — se oculta cuando el teclado está activo */}
          {!keyboardVisible && (
            <View style={styles.hero}>
              <Image source={require('@/assets/images/logo.png')} style={styles.logoImg} resizeMode="contain" />
              <Text style={styles.tagline}>Tu turno, a un toque de distancia</Text>
            </View>
          )}

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bienvenido de vuelta</Text>
            <Text style={styles.cardSub}>Inicia sesión para continuar</Text>

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

            <TouchableOpacity
              style={styles.forgotWrap}
              onPress={() => setRecoveryVisible(true)}
            >
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <Button
              title="Iniciar sesión"
              onPress={handleLogin}
              loading={loading}
              style={styles.btn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>¿No tienes cuenta?</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => router.push('/auth/register')}
              activeOpacity={0.85}
            >
              <Ionicons name="person-add-outline" size={17} color={Colors.white} />
              <Text style={styles.registerText}>Crear cuenta gratis</Text>
              <Ionicons name="arrow-forward" size={15} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal recuperar contraseña */}
      <Modal
        visible={recoveryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecoveryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="lock-open-outline" size={22} color={Colors.primary} />
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => { setRecoveryVisible(false); setRecoveryEmail(''); }}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>Recuperar contraseña</Text>
            <Text style={styles.modalSub}>
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </Text>
            <View style={styles.modalInputWrap}>
              <Ionicons name="mail-outline" size={17} color={Colors.textMuted} />
              <TextInput
                style={styles.modalInput}
                placeholder="tu@correo.com"
                placeholderTextColor={Colors.textMuted}
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setRecoveryVisible(false); setRecoveryEmail(''); }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSendBtn, recoverySending && { opacity: 0.7 }]}
                onPress={handleSendRecovery}
                disabled={recoverySending}
              >
                <Text style={styles.modalSendText}>
                  {recoverySending ? 'Enviando...' : 'Enviar enlace'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1 },
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 36, gap: 14 },
  logoImg: { width: '95%' as any, height: 200 },
  tagline: { fontSize: 14, color: Colors.textMuted, marginTop: -75 },
  card: {
    backgroundColor: Colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    flex: 1, padding: 28, paddingTop: 32,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  cardSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  forgotWrap: { alignSelf: 'flex-end', paddingVertical: 10 },
  forgot: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  btn: { marginTop: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 13, color: Colors.textMuted },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, padding: 15,
  },
  registerText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: Colors.white, borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceGrey, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  modalSub: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  modalInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: Colors.surfaceGrey, marginBottom: 20,
  },
  modalInput: { flex: 1, fontSize: 15, color: Colors.text },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  modalSendBtn: { flex: 1.5, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.buttonBg, alignItems: 'center' },
  modalSendText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
