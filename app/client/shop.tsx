import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getAvailableSlots } from '@/lib/availability';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import { Button } from '@/components/ui/Button';
import { useBookingStore } from '@/stores/bookingStore';
import { Service, TimeSlot } from '@/types';
import { Colors, DAYS_ES } from '@/constants';

const NEXT_DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

export default function ShopScreen() {
  const router = useRouter();
  const { draft, setDraftService, setDraftDate, setDraftTime } = useBookingStore();
  const { barbershop, service, date, startTime } = draft;

  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!barbershop) return;
    supabase.from('services').select('*').eq('barbershop_id', barbershop.id).eq('is_active', true)
      .then(({ data }) => { setServices(data ?? []); setLoading(false); });
  }, [barbershop]);

  useEffect(() => {
    if (!service || !date || !barbershop) return;
    setSlotsLoading(true);
    getAvailableSlots(barbershop.id, date, service.duration_minutes)
      .then((s) => { setSlots(s); setSlotsLoading(false); });
  }, [service, date]);

  const canConfirm = service && date && startTime;

  const handleContinue = () => {
    if (!canConfirm) { Alert.alert('Completa la selección', 'Elige servicio, día y hora'); return; }
    router.push('/client/booking-confirm');
  };

  if (!barbershop) { router.back(); return null; }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.shopName}>{barbershop.name}</Text>
          <Text style={styles.shopAddress}>{barbershop.address}</Text>
        </View>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} /> : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Servicios */}
          <Text style={styles.sectionLabel}>Selecciona un servicio</Text>
          <View style={styles.servicesGrid}>
            {services.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.serviceCard, service?.id === svc.id && styles.serviceCardSelected]}
                onPress={() => setDraftService(svc)}
              >
                <Text style={styles.svcName}>{svc.name}</Text>
                <Text style={styles.svcMeta}>⏱ {svc.duration_minutes} min</Text>
                <Text style={styles.svcPrice}>${svc.price.toLocaleString('es-CO')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Días */}
          {service && (
            <>
              <Text style={styles.sectionLabel}>Elige el día</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                {NEXT_DAYS.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayBtn, date?.toDateString() === d.toDateString() && styles.dayBtnSelected]}
                    onPress={() => setDraftDate(d)}
                  >
                    <Text style={[styles.dayName, date?.toDateString() === d.toDateString() && styles.dayTextSelected]}>
                      {DAYS_ES[d.getDay()]}
                    </Text>
                    <Text style={[styles.dayNum, date?.toDateString() === d.toDateString() && styles.dayTextSelected]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Slots */}
          {service && date && (
            <>
              <Text style={styles.sectionLabel}>Hora disponible</Text>
              {slotsLoading
                ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
                : <TimeSlotPicker slots={slots} selectedTime={startTime} onSelect={setDraftTime} />
              }
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button
          title={canConfirm ? `Confirmar — $${service!.price.toLocaleString('es-CO')}` : 'Selecciona servicio, día y hora'}
          onPress={handleContinue}
          disabled={!canConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  back: { padding: 4 },
  shopName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  shopAddress: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  serviceCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  serviceCardSelected: { borderColor: Colors.primary, borderWidth: 2 },
  svcName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  svcMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  svcPrice: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginTop: 6 },
  daysScroll: { paddingHorizontal: 16, gap: 8 },
  dayBtn: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#fff',
    minWidth: 50,
  },
  dayBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayName: { fontSize: 11, color: Colors.textSecondary },
  dayNum: { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 2 },
  dayTextSelected: { color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E0E0E0' },
});
