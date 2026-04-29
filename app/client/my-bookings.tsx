import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';
import { Booking } from '@/types';
import { Colors, STATUS_LABELS, STATUS_VARIANTS } from '@/constants';

export default function MyBookingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*, service:services(*), barbershop:barbershops(*)')
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false });
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchBookings(); }, [user]));

  const handleCancel = async (bookingId: string) => {
    Alert.alert('Cancelar cita', '¿Estás seguro?', [
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

  const renderItem = ({ item }: { item: Booking }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.shopName}>{item.barbershop?.name}</Text>
          <Badge label={STATUS_LABELS[item.status]} variant={STATUS_VARIANTS[item.status]} />
        </View>
        <Text style={styles.serviceName}>{item.service?.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meta}>{item.booking_date}</Text>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.meta}>{item.start_time} – {item.end_time}</Text>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
            <Text style={styles.cancelText}>Cancelar cita</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis citas</Text>
      </View>
      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        : <FlatList
            data={bookings}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Aún no tienes citas agendadas</Text>}
          />
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#E0E0E0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  shopName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  serviceName: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13, color: Colors.textSecondary },
  cancelBtn: { marginTop: 12, alignSelf: 'flex-start' },
  cancelText: { fontSize: 13, color: Colors.danger },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: 14 },
});
