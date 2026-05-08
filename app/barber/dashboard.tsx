import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, StatusBar, ScrollView, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { toLocalDateStr } from '@/lib/availability';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { Booking } from '@/types';
import { Colors, STATUS_LABELS, STATUS_VARIANTS, DAYS_ES, getBusinessConfig } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';

const DATE_RANGE = 14;

function getDateRange(): Date[] {
  return Array.from({ length: DATE_RANGE }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function BarberDashboard() {
  const { user, signOut } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>('barbershop');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const selectedDateRef = useRef(selectedDate);
  const barbershopIdRef = useRef(barbershopId);
  const dates = getDateRange();

  // Keep refs in sync
  useEffect(() => { selectedDateRef.current = selectedDate; });
  useEffect(() => { barbershopIdRef.current = barbershopId; });

  // Cargar tienda + reservas en cada enfoque de pantalla
  useFocusEffect(useCallback(() => {
    if (!user) return;
    const load = async () => {
      const { data: shop, error } = await supabase
        .from('barbershops')
        .select('id, business_type')
        .eq('owner_id', user.id)
        .single();
      if (error || !shop) { router.replace('/barber/setup'); return; }
      setBarbershopId(shop.id);
      barbershopIdRef.current = shop.id;
      setBusinessType(shop.business_type ?? 'barbershop');
      // Fetch reservas directamente con el id recién obtenido
      setLoading(true);
      const dateStr = toLocalDateStr(selectedDateRef.current);
      const { data, error: bErr } = await supabase
        .from('bookings')
        .select('*, service:services(*), user:users(*)')
        .eq('barbershop_id', shop.id)
        .eq('booking_date', dateStr)
        .neq('status', 'cancelled')
        .order('start_time');
      setBookings(bErr ? [] : (data as Booking[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user]));

  // Re-fetch cuando cambia la fecha seleccionada
  useEffect(() => {
    if (!barbershopId) return;
    setLoading(true);
    const dateStr = toLocalDateStr(selectedDate);
    supabase
      .from('bookings')
      .select('*, service:services(*), user:users(*)')
      .eq('barbershop_id', barbershopId)
      .eq('booking_date', dateStr)
      .neq('status', 'cancelled')
      .order('start_time')
      .then(({ data, error }) => {
        setBookings(error ? [] : (data as Booking[]) ?? []);
        setLoading(false);
      });
  }, [barbershopId, selectedDate, refreshKey]);

  // Real-time subscription — stays alive, uses ref for current date
  useEffect(() => {
    if (!barbershopId) return;
    const channel = supabase
      .channel(`bookings-${barbershopId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `barbershop_id=eq.${barbershopId}` },
        () => {
          const dateStr = toLocalDateStr(selectedDateRef.current);
          supabase
            .from('bookings')
            .select('*, service:services(*), user:users(*)')
            .eq('barbershop_id', barbershopId)
            .eq('booking_date', dateStr)
            .neq('status', 'cancelled')
            .order('start_time')
            .then(({ data }) => setBookings((data as Booking[]) ?? []));
        }
      );
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [barbershopId]);

  const handleAction = async (bookingId: string, action: 'confirmed' | 'cancelled') => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action } : b));
    const { error } = await supabase.from('bookings').update({ status: action }).eq('id', bookingId);
    if (error) {
      // Revertir optimistic update si falla
      const dateStr = toLocalDateStr(selectedDateRef.current);
      const { data } = await supabase
        .from('bookings')
        .select('*, service:services(*), user:users(*)')
        .eq('barbershop_id', barbershopId!)
        .eq('booking_date', dateStr)
        .neq('status', 'cancelled')
        .order('start_time');
      setBookings((data as Booking[]) ?? []);
      Alert.alert('Error', 'No se pudo actualizar la cita. Intenta de nuevo.');
    }
  };

  const pending = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;

  // Total pendientes en todas las fechas (no solo el día seleccionado)
  const [totalPending, setTotalPending] = useState(0);
  useEffect(() => {
    if (!barbershopId) return;
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId)
      .eq('status', 'pending')
      .gte('booking_date', toLocalDateStr(new Date()))
      .then(({ count }) => setTotalPending(count ?? 0));
  }, [barbershopId, bookings]);
  const isToday = isSameDay(selectedDate, new Date());
  const biz = getBusinessConfig(businessType);

  const selectedLabel = selectedDate.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  function handleMenu() {
    Alert.alert('Opciones', undefined, [
      { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth/login'); } },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  const renderItem = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <View style={styles.timeCol}>
        <Text style={styles.timeStart}>{item.start_time}</Text>
        <Text style={styles.timeEnd}>{item.end_time}</Text>
        <View style={[styles.statusDot,
          item.status === 'confirmed' ? styles.dotConfirmed :
          item.status === 'cancelled' ? styles.dotCancelled : styles.dotPending]} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.clientName}>{(item as any).user?.name ?? 'Cliente'}</Text>
          <Badge label={STATUS_LABELS[item.status]} variant={STATUS_VARIANTS[item.status]} size="sm" />
        </View>
        <Text style={styles.serviceName}>
          {item.notes ?? item.service?.name}
          {' · '}
          {(() => {
            const [sh, sm] = item.start_time.split(':').map(Number);
            const [eh, em] = item.end_time.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            return dur > 0 ? `${dur} min` : `${item.service?.duration_minutes ?? '?'} min`;
          })()}
        </Text>
        {item.service?.price && (
          <Text style={styles.price}>${item.service.price.toLocaleString('es-CO')}</Text>
        )}
        {(item as any).user?.phone && (
          <TouchableOpacity style={styles.phoneRow} onPress={() => Linking.openURL(`tel:${(item as any).user.phone}`)} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={13} color={Colors.primary} />
            <Text style={styles.phoneText}>{(item as any).user.phone}</Text>
          </TouchableOpacity>
        )}
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAction(item.id, 'confirmed')} activeOpacity={0.75}>
              <Ionicons name="checkmark" size={16} color={Colors.success} />
              <Text style={styles.acceptText}>Confirmar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(item.id, 'cancelled')} activeOpacity={0.75}>
              <Ionicons name="close" size={16} color={Colors.danger} />
              <Text style={styles.rejectText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'confirmed' && (
          <TouchableOpacity
            style={styles.cancelLink}
            onPress={() => Alert.alert(
              'Cancelar cita',
              `¿Cancelar la cita de ${(item as any).user?.name ?? 'este cliente'}?`,
              [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: () => handleAction(item.id, 'cancelled') },
              ]
            )}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.cancelLinkText}>Cancelar cita</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      {/* Header + date strip con gradiente */}
      <GradientView direction="top-bottom">
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.dateLabel}>{selectedLabel}</Text>
          </View>
          <TouchableOpacity onPress={handleMenu} style={styles.menuBtn}>
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Date strip */}
      <View style={styles.dateStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStripContent}>
          {dates.map((date, i) => {
            const active = isSameDay(date, selectedDate);
            const todayItem = i === 0;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.dateBtn, active && styles.dateBtnActive]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dateDayName, active && styles.dateTxtActive]}>
                  {todayItem ? 'Hoy' : DAYS_ES[date.getDay()]}
                </Text>
                <Text style={[styles.dateDayNum, active && styles.dateTxtActive]}>{date.getDate()}</Text>
                {todayItem && !active && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statMid]}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{confirmed}</Text>
          <Text style={styles.statLabel}>Confirmadas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.warning }]}>{pending}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
      </View>
      </GradientView>

      {/* Banner de pendientes globales (otras fechas) */}
      {totalPending > pending && (
        <TouchableOpacity
          style={styles.globalPendingBanner}
          onPress={() => {
            // Buscar el primer día con pendientes
            const today = new Date();
            const future = Array.from({ length: 14 }, (_, i) => {
              const d = new Date(); d.setDate(today.getDate() + i); return d;
            });
            const next = future.find(d => !isSameDay(d, selectedDate));
            if (next) setSelectedDate(next);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle" size={16} color={Colors.warning} />
          <Text style={styles.globalPendingText}>
            {totalPending} reserva{totalPending !== 1 ? 's' : ''} pendiente{totalPending !== 1 ? 's' : ''} en los próximos días — toca para revisar
          </Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.warning} />
        </TouchableOpacity>
      )}

      {/* List header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {isToday ? 'Agenda de hoy' : `Agenda del ${selectedDate.getDate()} de ${selectedDate.toLocaleDateString('es-CO', { month: 'long' })}`}
        </Text>
        {pending > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pending} pendiente{pending !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        : (
          <FlatList
            data={bookings}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>
                  {isToday ? 'Sin reservas hoy' : 'Sin reservas ese día'}
                </Text>
                <Text style={styles.emptySub}>
                  {isToday
                    ? 'Los turnos aparecerán aquí cuando los clientes reserven'
                    : 'No hay citas agendadas para esta fecha'}
                </Text>
              </View>
            }
          />
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  dateLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'capitalize' },
  menuBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  // Date strip
  dateStrip: { paddingBottom: 10 },
  dateStripContent: { paddingHorizontal: 16, gap: 7 },
  dateBtn: {
    alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 10, minWidth: 46,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dateBtnActive: { backgroundColor: Colors.white },
  dateDayName: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.3 },
  dateDayNum: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  dateTxtActive: { color: Colors.text },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.white, marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.surface, borderRadius: 14,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Banner pendientes globales
  globalPendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 2,
    backgroundColor: Colors.warningBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  globalPendingText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.warning, lineHeight: 17 },

  // List
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 14, marginBottom: 8 },
  listTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  pendingBadge: { backgroundColor: Colors.warningBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.warning },
  list: { paddingHorizontal: 16, gap: 10 },

  // Card
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  timeCol: {
    width: 64, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 3,
  },
  timeStart: { fontSize: 14, fontWeight: '800', color: Colors.white },
  timeEnd: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotPending: { backgroundColor: Colors.warning },
  dotConfirmed: { backgroundColor: Colors.success },
  dotCancelled: { backgroundColor: Colors.textMuted },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  serviceName: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  price: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.successBg, borderRadius: 10, paddingVertical: 8 },
  acceptText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.errorBg, borderRadius: 10, paddingVertical: 8 },
  rejectText: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  phoneText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  cancelLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
  cancelLinkText: { fontSize: 12, color: Colors.textMuted },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
