import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { calculateEndTime } from '@/lib/availability';
import { notifyBarber } from '@/lib/notifications';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors, DAYS_ES, MONTHS_ES } from '@/constants';

export default function BookingConfirmScreen() {
  const { draft, clearDraft } = useBookingStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { barbershop, service, date, startTime } = draft;

  if (!barbershop || !service || !date || !startTime) {
    router.back();
    return null;
  }

  const endTime = calculateEndTime(startTime, service.duration_minutes);
  const dateStr = `${DAYS_ES[date.getDay()]}, ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      service_id: service.id,
      barbershop_id: barbershop.id,
      booking_date: date.toISOString().split('T')[0],
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Horario ocupado', error.code === '23505' ? 'Ese horario ya fue reservado. Elige otro.' : error.message);
    } else {
      notifyBarber(barbershop.id, user.name, service.name, dateStr, startTime);
      setConfirmed(true);
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={[styles.container, styles.successContainer]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={52} color={Colors.white} />
          </View>
          <Text style={styles.successTitle}>¡Reserva confirmada!</Text>
          <Text style={styles.successSub}>Tu cita fue registrada. El barbero confirmará en breve.</Text>

          <View style={styles.summaryCard}>
            {[
              { icon: 'cut-outline', label: 'Barbería', value: barbershop.name },
              { icon: 'list-outline', label: 'Servicio', value: service.name },
              { icon: 'calendar-outline', label: 'Día', value: dateStr },
              { icon: 'time-outline', label: 'Hora', value: `${startTime} – ${endTime}` },
              { icon: 'cash-outline', label: 'Total', value: `$${service.price.toLocaleString('es-CO')}` },
            ].map(({ icon, label, value }) => (
              <View key={label} style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <Ionicons name={icon as any} size={15} color={Colors.textSecondary} />
                </View>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryVal}>{value}</Text>
              </View>
            ))}
          </View>

          <Button
            title="Volver al inicio"
            onPress={() => { clearDraft(); router.replace('/client/home'); }}
            style={styles.successBtn}
          />
          <TouchableOpacity onPress={() => { clearDraft(); router.replace('/client/bookings'); }} style={styles.bookingsLink}>
            <Text style={styles.bookingsLinkText}>Ver todas mis citas</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar reserva</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.shopBanner}>
          <Text style={styles.shopEmoji}>✂️</Text>
          <View>
            <Text style={styles.shopBannerName}>{barbershop.name}</Text>
            <Text style={styles.shopBannerAddr}>{barbershop.address}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Resumen de tu cita</Text>
          {[
            { icon: 'list-outline', label: 'Servicio', value: service.name },
            { icon: 'time-outline', label: 'Duración', value: `${service.duration_minutes} min` },
            { icon: 'calendar-outline', label: 'Día', value: dateStr },
            { icon: 'alarm-outline', label: 'Horario', value: `${startTime} – ${endTime}` },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name={icon as any} size={15} color={Colors.textSecondary} />
              </View>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={styles.summaryVal}>{value}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${service.price.toLocaleString('es-CO')}</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
          <Text style={styles.noticeText}>El barbero recibirá tu solicitud y la confirmará. Te avisaremos cuando esté lista.</Text>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Button title="Confirmar reserva" onPress={handleConfirm} loading={loading} />
        <Button title="Cancelar" onPress={() => router.back()} variant="ghost" style={{ marginTop: 4 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  successContainer: { backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  scroll: { padding: 16, gap: 12 },
  shopBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#0D0D1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  shopEmoji: { fontSize: 36, width: 52, height: 52, textAlign: 'center', textAlignVertical: 'center', backgroundColor: Colors.primary, borderRadius: 14, overflow: 'hidden' },
  shopBannerName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  shopBannerAddr: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#0D0D1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 10 },
  summaryIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  summaryVal: { fontSize: 14, fontWeight: '700', color: Colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  noticeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.infoBg, borderRadius: 14, padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },
  ctaBar: {
    padding: 16, paddingBottom: 24, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  // Success screen
  successContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  successIcon: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.white, letterSpacing: -0.4, marginBottom: 8 },
  successSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  successBtn: { width: '100%', backgroundColor: Colors.accent, marginTop: 4 },
  bookingsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  bookingsLinkText: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
});
