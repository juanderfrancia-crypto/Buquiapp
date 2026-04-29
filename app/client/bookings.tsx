import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { getAvailableSlots, calculateEndTime } from '@/lib/availability';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { Booking, TimeSlot } from '@/types';
import { Colors, STATUS_LABELS, STATUS_VARIANTS, DAYS_ES } from '@/constants';
import { MOCK_BOOKINGS } from '@/lib/mockData';

type Filter = 'upcoming' | 'past';

function getNext14Days(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1); // start from tomorrow
    return d;
  });
}

export default function BookingsScreen() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('upcoming');

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  const days = getNext14Days();

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, service:services(*), barbershop:barbershops(*)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });
    const result = (data as Booking[]) ?? [];
    setBookings(result.length > 0 ? result : MOCK_BOOKINGS);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchBookings(); }, [user]));

  // Load slots whenever the reschedule date or booking changes
  useEffect(() => {
    if (!rescheduleBooking || !rescheduleBooking.service) return;
    setRescheduleTime(null);
    setLoadingSlots(true);
    getAvailableSlots(
      rescheduleBooking.barbershop_id,
      rescheduleDate,
      rescheduleBooking.service.duration_minutes,
      rescheduleBooking.id
    ).then((slots) => {
      setRescheduleSlots(slots);
      setLoadingSlots(false);
    });
  }, [rescheduleBooking, rescheduleDate]);

  const today = new Date().toISOString().split('T')[0];

  const filtered = bookings.filter(b =>
    filter === 'upcoming'
      ? b.booking_date >= today && b.status !== 'cancelled'
      : b.booking_date < today || b.status === 'cancelled'
  );

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancelar cita', '¿Estás seguro de que quieres cancelar?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive',
        onPress: async () => {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
          fetchBookings();
        },
      },
    ]);
  };

  const openReschedule = (booking: Booking) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(tomorrow);
    setRescheduleTime(null);
    setRescheduleSlots([]);
    setRescheduleBooking(booking);
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleBooking || !rescheduleTime || !rescheduleBooking.service) return;
    setSaving(true);
    const endTime = calculateEndTime(rescheduleTime, rescheduleBooking.service.duration_minutes);
    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: rescheduleDate.toISOString().split('T')[0],
        start_time: rescheduleTime,
        end_time: endTime,
        status: 'pending',
      })
      .eq('id', rescheduleBooking.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'No se pudo reprogramar la cita. Intenta con otro horario.');
      return;
    }
    setRescheduleBooking(null);
    fetchBookings();
    Alert.alert('¡Listo!', 'Tu cita fue reprogramada. El barbero la confirmará en breve.');
  };

  const canReschedule = (booking: Booking) =>
    (booking.status === 'pending' || booking.status === 'confirmed') &&
    booking.booking_date >= today;

  const renderItem = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardDate}>{item.booking_date}</Text>
        <View style={styles.timePill}>
          <Ionicons name="time-outline" size={12} color={Colors.primary} />
          <Text style={styles.timeText}>{item.start_time}</Text>
        </View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardRight}>
        <View style={styles.cardTop}>
          <Text style={styles.shopName} numberOfLines={1}>{item.barbershop?.name}</Text>
          <Badge label={STATUS_LABELS[item.status]} variant={STATUS_VARIANTS[item.status]} size="sm" />
        </View>
        <Text style={styles.serviceName}>{item.service?.name}</Text>
        <View style={styles.cardMeta}>
          {item.service?.price ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>${item.service.price.toLocaleString('es-CO')}</Text>
            </View>
          ) : null}
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{item.service?.duration_minutes} min</Text>
          </View>
        </View>
        {canReschedule(item) && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.rescheduleBtn} onPress={() => openReschedule(item)}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
              <Text style={styles.rescheduleText}>Reprogramar</Text>
            </TouchableOpacity>
            {item.status === 'pending' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                <Ionicons name="close-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.header}>
        <Text style={styles.title}>Mis citas</Text>
        <Text style={styles.subtitle}>{bookings.length} en total</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.tab, filter === f && styles.tabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>
              {f === 'upcoming' ? 'Próximas' : 'Pasadas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 48 }} color={Colors.primary} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Sin citas {filter === 'upcoming' ? 'próximas' : 'pasadas'}</Text>
                <Text style={styles.emptySub}>
                  {filter === 'upcoming' ? 'Reserva en cualquier barbería desde la pestaña Inicio' : 'Tus citas anteriores aparecerán aquí'}
                </Text>
              </View>
            }
          />
        )
      }

      {/* ── Reschedule Modal ── */}
      <Modal
        visible={!!rescheduleBooking}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRescheduleBooking(null)}
      >
        <SafeAreaView style={styles.modal}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setRescheduleBooking(null)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reprogramar cita</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
            {/* Current booking info */}
            {rescheduleBooking && (
              <View style={styles.currentCard}>
                <View style={styles.currentCardRow}>
                  <View style={styles.currentCardIcon}>
                    <Ionicons name="cut-outline" size={16} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.currentCardLabel}>Servicio</Text>
                    <Text style={styles.currentCardValue}>{rescheduleBooking.service?.name}</Text>
                  </View>
                </View>
                <View style={styles.currentCardRow}>
                  <View style={styles.currentCardIcon}>
                    <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.currentCardLabel}>Barbería</Text>
                    <Text style={styles.currentCardValue}>{rescheduleBooking.barbershop?.name}</Text>
                  </View>
                </View>
                <View style={[styles.currentCardRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.currentCardIcon}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
                  </View>
                  <View>
                    <Text style={styles.currentCardLabel}>Cita actual</Text>
                    <Text style={[styles.currentCardValue, { color: Colors.textSecondary }]}>
                      {rescheduleBooking.booking_date} · {rescheduleBooking.start_time}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* New date picker */}
            <Text style={styles.pickLabel}>Elige el nuevo día</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
              {days.map((date, i) => {
                const isSelected = date.toDateString() === rescheduleDate.toDateString();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                    onPress={() => setRescheduleDate(date)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                      {DAYS_ES[date.getDay()]}
                    </Text>
                    <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>{date.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time slots */}
            <Text style={styles.pickLabel}>Elige la nueva hora</Text>
            {loadingSlots
              ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
              : (
                <View style={styles.slotsWrapper}>
                  <TimeSlotPicker
                    slots={rescheduleSlots}
                    selectedTime={rescheduleTime}
                    onSelect={setRescheduleTime}
                  />
                </View>
              )
            }

            {/* Notice */}
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
              <Text style={styles.noticeText}>
                Al reprogramar, tu cita vuelve a estado "pendiente" y el barbero deberá confirmarla nuevamente.
              </Text>
            </View>
          </ScrollView>

          {/* CTA */}
          <View style={styles.modalCta}>
            <Button
              title={rescheduleTime ? `Confirmar para el ${rescheduleDate.getDate()}/${rescheduleDate.getMonth() + 1} a las ${rescheduleTime}` : 'Selecciona una hora'}
              onPress={handleConfirmReschedule}
              disabled={!rescheduleTime}
              loading={saving}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.white, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: Colors.background },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', shadowColor: '#0D0D1A',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardLeft: {
    width: 76, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6,
  },
  cardDate: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
  },
  timeText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  cardDivider: { width: 1, backgroundColor: Colors.borderLight },
  cardRight: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  shopName: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  serviceName: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  metaChip: { backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  rescheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rescheduleText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCloseBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalScroll: { padding: 16, gap: 16, paddingBottom: 32 },
  currentCard: {
    backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 14,
    shadowColor: '#0D0D1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  currentCardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  currentCardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  currentCardLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  currentCardValue: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: 1 },
  pickLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  dayStrip: { paddingVertical: 4, gap: 8 },
  dayBtn: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background, minWidth: 54,
  },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayName: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 3 },
  dayNum: { fontSize: 18, fontWeight: '800', color: Colors.text },
  dayTextActive: { color: Colors.white },
  slotsWrapper: { minHeight: 80 },
  noticeCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.infoBg, borderRadius: 14, padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },
  modalCta: {
    padding: 16, paddingBottom: 24, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
});
