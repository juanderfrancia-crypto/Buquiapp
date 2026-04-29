import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { Booking } from '@/types';
import { Colors, STATUS_LABELS, STATUS_VARIANTS } from '@/constants';
import { MOCK_BARBER_BOOKINGS } from '@/lib/mockData';

export default function BarberDashboard() {
  const { user, signOut } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const { data: shop } = await supabase.from('barbershops').select('id').eq('owner_id', user.id).single();
    if (!shop) {
      // Redirigir a setup si no tiene barbería
      router.replace('/barber/setup');
      return;
    }
    setBarbershopId(shop.id);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('bookings')
      .select('*, service:services(*), user:users(*)')
      .eq('barbershop_id', shop.id)
      .eq('booking_date', today)
      .order('start_time');
    const result = (data as Booking[]) ?? [];
    setBookings(result.length > 0 ? result : MOCK_BARBER_BOOKINGS);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user])
  );

  // Real-time subscription
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel(`bookings-${barbershopId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `barbershop_id=eq.${barbershopId}` },
        () => { fetchData(); }
      );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const handleAction = async (bookingId: string, action: 'confirmed' | 'cancelled') => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: action } : b));
    await supabase.from('bookings').update({ status: action }).eq('id', bookingId);
  };

  const pending = bookings.filter(b => b.status === 'pending').length;
  const confirmed = bookings.filter(b => b.status === 'confirmed').length;
  const todayLabel = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  const renderItem = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <View style={styles.timeCol}>
        <Text style={styles.timeStart}>{item.start_time}</Text>
        <Text style={styles.timeEnd}>{item.end_time}</Text>
        <View style={[styles.statusDot, item.status === 'confirmed' ? styles.dotConfirmed : item.status === 'cancelled' ? styles.dotCancelled : styles.dotPending]} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.clientName}>{(item as any).user?.name ?? 'Cliente'}</Text>
          <Badge label={STATUS_LABELS[item.status]} variant={STATUS_VARIANTS[item.status]} size="sm" />
        </View>
        <Text style={styles.serviceName}>{item.service?.name} · {item.service?.duration_minutes} min</Text>
        {item.service?.price && (
          <Text style={styles.price}>${item.service.price.toLocaleString('es-CO')}</Text>
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
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]} ✂️</Text>
          <Text style={styles.dateLabel}>{todayLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Cerrar sesión', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Salir', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth/login'); } }])} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{bookings.length}</Text>
          <Text style={styles.statLabel}>Total hoy</Text>
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

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/barber/services')} activeOpacity={0.75}>
          <View style={styles.qaIcon}><Ionicons name="list" size={20} color={Colors.primary} /></View>
          <Text style={styles.qaLabel}>Servicios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/barber/schedule')} activeOpacity={0.75}>
          <View style={styles.qaIcon}><Ionicons name="calendar" size={20} color={Colors.primary} /></View>
          <Text style={styles.qaLabel}>Horarios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaBtn} onPress={() => router.push('/barber/stats')} activeOpacity={0.75}>
          <View style={styles.qaIcon}><Ionicons name="stats-chart" size={20} color={Colors.primary} /></View>
          <Text style={styles.qaLabel}>Estadísticas</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Agenda de hoy</Text>
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
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="calendar-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Sin reservas hoy</Text>
                <Text style={styles.emptySub}>Los turnos aparecerán aquí cuando los clientes reserven</Text>
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
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  dateLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3, textTransform: 'capitalize' },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: -1,
    backgroundColor: Colors.surface, borderRadius: 16,
    shadowColor: '#0D0D1A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 24, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 14 },
  qaBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, alignItems: 'center', paddingVertical: 14, gap: 8, shadowColor: '#0D0D1A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  qaIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 12, fontWeight: '600', color: Colors.text },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
  listTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  pendingBadge: { backgroundColor: Colors.warningBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.warning },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 30 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16,
    overflow: 'hidden', shadowColor: '#0D0D1A',
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
  emptyState: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
