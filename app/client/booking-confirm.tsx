import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { calculateEndTime, toLocalDateStr } from '@/lib/availability';
import { notifyBarber } from '@/lib/notifications';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '@/stores/bookingStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors, DAYS_ES, MONTHS_ES, getBusinessConfig } from '@/constants';

export default function BookingConfirmScreen() {
  const { draft, clearDraft } = useBookingStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { barbershop, services, date, startTime } = draft;
  const isValidDraft = !!(barbershop && services && services.length > 0 && date && startTime);

  useEffect(() => {
    if (!isValidDraft) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/client/home');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isValidDraft) return null;

  const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const endTime = calculateEndTime(startTime, totalDuration);
  const dateStr = `${DAYS_ES[date.getDay()]}, ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;
  const biz = getBusinessConfig(barbershop.business_type);
  const servicesLabel = services.map(s => s.name).join(', ');

  const handleConfirm = async () => {
    if (!user) return;

    const today = toLocalDateStr(new Date());
    if (toLocalDateStr(date!) < today) {
      Alert.alert('Fecha inválida', 'No puedes reservar para una fecha pasada');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        user_id: user.id,
        service_id: services![0].id,
        barbershop_id: barbershop!.id,
        booking_date: toLocalDateStr(date!),
        start_time: startTime!,
        end_time: endTime,
        status: 'pending',
        notes: services!.length > 1 ? servicesLabel : null,
      });

      if (error) {
        if (error.code === '23505' || error.message?.toLowerCase().includes('double booking') || error.message?.toLowerCase().includes('time slot')) {
          Alert.alert('Horario ocupado', 'Ese horario ya fue reservado por otro cliente. Elige un horario diferente.');
        } else {
          Alert.alert('Error', error.message || 'No se pudo crear la reserva');
        }
        setLoading(false);
        return;
      }

      notifyBarber(barbershop!.id, user.name, servicesLabel, dateStr, startTime!);
      setConfirmed(true);
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
      setLoading(false);
    }
  };

  if (confirmed) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={52} color={Colors.white} />
            </View>
            <Text style={styles.successTitle}>¡Reserva confirmada!</Text>
            <Text style={styles.successSub}>
              Tu cita fue registrada. {biz.ownerLabel} confirmará en breve.
            </Text>

            <View style={styles.successSummary}>
              {[
                { icon: biz.ionicon, label: biz.confirmLabel, value: barbershop.name },
                { icon: 'list-outline', label: services.length > 1 ? 'Servicios' : 'Servicio', value: servicesLabel },
                { icon: 'calendar-outline', label: 'Día', value: dateStr },
                { icon: 'time-outline', label: 'Hora', value: `${startTime} – ${endTime}` },
                { icon: 'cash-outline', label: 'Total', value: `$${totalPrice.toLocaleString('es-CO')}` },
              ].map(({ icon, label, value }) => (
                <View key={label} style={styles.successRow}>
                  <View style={styles.successRowIcon}>
                    <Ionicons name={icon as any} size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.successRowLabel}>{label}</Text>
                  <Text style={styles.successRowVal} numberOfLines={2}>{value}</Text>
                </View>
              ))}
            </View>

            <Button
              title="Volver al inicio"
              onPress={() => { clearDraft(); router.replace('/client/home'); }}
              style={styles.successBtn}
            />
            <TouchableOpacity
              onPress={() => { clearDraft(); router.replace('/client/bookings'); }}
              style={styles.bookingsLink}
            >
              <Text style={styles.bookingsLinkText}>Ver todas mis citas</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
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
        {/* Banner del negocio */}
        <View style={styles.shopBanner}>
          <View style={styles.shopIconWrap}>
            <Ionicons name={biz.ionicon as any} size={26} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopBannerName}>{barbershop.name}</Text>
            <Text style={styles.shopBannerAddr}>{barbershop.address}</Text>
          </View>
        </View>

        {/* Resumen */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Resumen de tu cita</Text>

          {/* Lista de servicios */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryIcon}>
              <Ionicons name="list-outline" size={15} color={Colors.textSecondary} />
            </View>
            <Text style={styles.summaryLabel}>{services.length > 1 ? 'Servicios' : 'Servicio'}</Text>
          </View>
          <View style={styles.servicesBlock}>
            {services.map((svc) => (
              <View key={svc.id} style={styles.serviceItem}>
                <View style={styles.serviceItemDot} />
                <Text style={styles.serviceItemName} numberOfLines={1}>{svc.name}</Text>
                <Text style={styles.serviceItemDuration}>{svc.duration_minutes} min</Text>
                <Text style={styles.serviceItemPrice}>${svc.price.toLocaleString('es-CO')}</Text>
              </View>
            ))}
          </View>

          {[
            { icon: 'calendar-outline', label: 'Día', value: dateStr },
            { icon: 'alarm-outline', label: 'Horario', value: `${startTime} – ${endTime}` },
            { icon: 'time-outline', label: 'Duración total', value: `${totalDuration} min` },
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
            <Text style={styles.totalValue}>${totalPrice.toLocaleString('es-CO')}</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
          <Text style={styles.noticeText}>{biz.bookingNotice}</Text>
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  scroll: { padding: 16, gap: 14 },

  shopBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  shopIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  shopBannerName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  shopBannerAddr: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, gap: 12,
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  summaryLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  summaryVal: { fontSize: 15, fontWeight: '700', color: Colors.text, textAlign: 'right', flexShrink: 1, maxWidth: '55%' },

  servicesBlock: { marginBottom: 4, gap: 6, paddingBottom: 4 },
  serviceItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: Colors.background, borderRadius: 10,
  },
  serviceItemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  serviceItemName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  serviceItemDuration: { fontSize: 12, color: Colors.textSecondary },
  serviceItemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 18, marginTop: 2,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 26, fontWeight: '800', color: Colors.primary },

  noticeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.infoBg, borderRadius: 14, padding: 16,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 20 },

  ctaBar: {
    padding: 16, paddingBottom: 24,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },

  // Pantalla de éxito
  successScroll: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  successContent: { alignItems: 'center' },
  successIcon: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    shadowColor: Colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.4, marginBottom: 8 },
  successSub: {
    fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  successSummary: {
    width: '100%', backgroundColor: Colors.surface,
    borderRadius: 16, padding: 4, marginBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  successRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  successRowIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  successRowLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  successRowVal: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'right', flexShrink: 1, maxWidth: '55%' },
  successBtn: { width: '100%', marginTop: 4 },
  bookingsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16 },
  bookingsLinkText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
