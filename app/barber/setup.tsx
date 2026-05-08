import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, StatusBar, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { Colors, BUSINESS_TYPES, getBusinessConfig } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';
import { BusinessType } from '@/types';

const BUSINESS_OPTIONS: { type: BusinessType; label: string; desc: string }[] = [
  { type: 'barbershop',   label: 'Barbería',        desc: 'Cortes, barba y más' },
  { type: 'beauty_salon', label: 'Salón de Belleza', desc: 'Uñas, maquillaje, estética' },
  { type: 'spa',          label: 'Spa',              desc: 'Masajes, tratamientos, relax' },
  { type: 'other',        label: 'Otro Negocio',     desc: 'Cualquier servicio con citas' },
];

export default function BarberSetupScreen() {
  const { user } = useAuthStore();
  const [businessType, setBusinessType] = useState<BusinessType>('barbershop');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const biz = getBusinessConfig(businessType);

  const handleCreate = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y la dirección son obligatorios.');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const { data: shop, error: shopError } = await supabase.from('barbershops').insert({
        owner_id: user.id,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || null,
        description: description.trim() || null,
        business_type: businessType,
        is_active: true,
      }).select().single();

      if (shopError || !shop) {
        Alert.alert('Error', shopError?.message || 'No se pudo crear el negocio');
        setSaving(false);
        return;
      }

      const defaultSchedule = [
        { barbershop_id: shop.id, day_of_week: 1, start_time: '09:00', end_time: '18:00', is_active: true },
        { barbershop_id: shop.id, day_of_week: 2, start_time: '09:00', end_time: '18:00', is_active: true },
        { barbershop_id: shop.id, day_of_week: 3, start_time: '09:00', end_time: '18:00', is_active: true },
        { barbershop_id: shop.id, day_of_week: 4, start_time: '09:00', end_time: '18:00', is_active: true },
        { barbershop_id: shop.id, day_of_week: 5, start_time: '09:00', end_time: '18:00', is_active: true },
        { barbershop_id: shop.id, day_of_week: 6, start_time: '09:00', end_time: '13:00', is_active: true },
        { barbershop_id: shop.id, day_of_week: 0, start_time: '00:00', end_time: '00:00', is_active: false },
      ];

      const { error: scheduleError } = await supabase.from('availability').insert(defaultSchedule);
      if (scheduleError) console.warn('Schedule creation warning:', scheduleError.message);

      setSaving(false);
      router.replace('/barber/welcome');
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

        {/* Hero dinámico */}
        <GradientView style={styles.hero} direction="top-bottom">
          <View style={styles.iconWrap}>
            <Ionicons name={biz.ionicon as any} size={34} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle}>{biz.setupTitle}</Text>
          <Text style={styles.heroSub}>{biz.setupSubtitle}</Text>
        </GradientView>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>

            {/* Selector de tipo de negocio */}
            <Text style={styles.sectionLabel}>¿Qué tipo de negocio tienes?</Text>
            <View style={styles.typeGrid}>
              {BUSINESS_OPTIONS.map((opt) => {
                const active = businessType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                    onPress={() => setBusinessType(opt.type)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={BUSINESS_TYPES[opt.type].ionicon as any}
                      size={24}
                      color={active ? Colors.white : Colors.text}
                      style={styles.typeIcon}
                    />
                    <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{opt.label}</Text>
                    <Text style={[styles.typeDesc, active && styles.typeDescActive]}>{opt.desc}</Text>
                    {active && (
                      <View style={styles.typeCheck}>
                        <Ionicons name="checkmark" size={11} color={Colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Información del negocio */}
            <Text style={styles.sectionLabel}>Información de tu {biz.label.toLowerCase()}</Text>

            <Input
              label="Nombre *"
              placeholder={biz.placeholder}
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
              title={`Crear mi ${biz.label.toLowerCase()}`}
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
  container: { flex: 1, backgroundColor: Colors.gradientStart },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 28,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
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
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 12, marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  typeCard: {
    width: '47%',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.surface,
    alignItems: 'flex-start',
    position: 'relative',
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeIcon: { marginBottom: 8 },
  typeLabel: {
    fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3,
  },
  typeLabelActive: { color: Colors.white },
  typeDesc: { fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
  typeDescActive: { color: 'rgba(255,255,255,0.6)' },
  typeCheck: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: {
    height: 1, backgroundColor: Colors.borderLight, marginVertical: 16,
  },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.infoBg, borderRadius: 12,
    padding: 12, marginTop: 8,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },
  btn: { marginTop: 12 },
});
