import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';

export default function BarberSetupScreen() {
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y la dirección son obligatorios.');
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase.from('barbershops').insert({
      owner_id: user.id,
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim() || null,
      description: description.trim() || null,
      is_active: true,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/barber/dashboard');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="cut" size={34} color={Colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Configura tu barbería</Text>
          <Text style={styles.heroSub}>
            Completa estos datos para que los clientes puedan encontrarte y reservar citas.
          </Text>
        </View>

        {/* Form card */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información de tu barbería</Text>

            <Input
              label="Nombre *"
              placeholder="Ej: Barbería El Padrino"
              value={name}
              onChangeText={setName}
              icon="storefront-outline"
            />
            <Input
              label="Dirección *"
              placeholder="Ej: Cra. 8 #12-34, Puerto Tejada"
              value={address}
              onChangeText={setAddress}
              icon="location-outline"
            />
            <Input
              label="Teléfono"
              placeholder="3001234567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              icon="call-outline"
            />
            <Input
              label="Descripción"
              placeholder="Cuéntale a tus clientes qué ofreces..."
              value={description}
              onChangeText={setDescription}
              icon="information-circle-outline"
            />

            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
              <Text style={styles.noticeText}>
                Después podrás agregar tus servicios y configurar tus horarios de atención.
              </Text>
            </View>

            <Button
              title="Crear mi barbería"
              onPress={handleCreate}
              loading={saving}
              style={styles.btn}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 28,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(232,184,109,0.15)',
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24, fontWeight: '800', color: Colors.white,
    letterSpacing: -0.3, textAlign: 'center', marginBottom: 8,
  },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  card: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12,
  },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.infoBg, borderRadius: 12,
    padding: 12, marginTop: 8,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },
  btn: { marginTop: 12 },
});
