import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getAvailableSlots, calculateEndTime } from '@/lib/availability';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { Barbershop, Service, TimeSlot } from '@/types';
import { Colors, DAYS_ES } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_SHOPS, MOCK_SERVICES, MOCK_AVAILABILITY } from '@/lib/mockData';

function generateMockSlots(start: string, end: string, duration: number): TimeSlot[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const slots: TimeSlot[] = [];
  while (cur + duration <= endMin) {
    const h = Math.floor(cur / 60).toString().padStart(2, '0');
    const m = (cur % 60).toString().padStart(2, '0');
    slots.push({ time: `${h}:${m}`, available: true });
    cur += duration;
  }
  return slots;
}

function getNext7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function ShopDetailScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { user } = useAuthStore();
  const { setDraftBarbershop, setDraftService, setDraftDate, setDraftTime } = useBookingStore();

  const [shop, setShop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const days = getNext7Days();

  useEffect(() => {
    if (!shopId) return;
    supabase.from('barbershops').select('*').eq('id', shopId).single().then(({ data }) => {
      setShop(data ?? MOCK_SHOPS.find(s => s.id === shopId) ?? MOCK_SHOPS[0]);
    });
    supabase.from('services').select('*').eq('barbershop_id', shopId).eq('is_active', true).then(({ data }) => {
      const result = data && data.length > 0 ? data : MOCK_SERVICES.filter(s => s.barbershop_id === shopId);
      const svcs = result.length > 0 ? result : MOCK_SERVICES;
      setServices(svcs);
      setSelectedService(svcs[0] ?? null);
    });
  }, [shopId]);

  useEffect(() => {
    if (!selectedService || !shopId) return;
    setSelectedTime(null);
    setLoadingSlots(true);
    getAvailableSlots(shopId, selectedDate, selectedService.duration_minutes).then((s) => {
      if (s.length > 0) {
        setSlots(s);
      } else {
        const dayOfWeek = selectedDate.getDay();
        const avail = MOCK_AVAILABILITY.find(a => a.day_of_week === dayOfWeek && a.is_active);
        setSlots(avail ? generateMockSlots(avail.start_time, avail.end_time, selectedService.duration_minutes) : []);
      }
      setLoadingSlots(false);
    });
  }, [selectedService, selectedDate, shopId]);

  async function handleBooking() {
    if (!user || !selectedService || !selectedTime || !shop) return;
    
    // Guardar la reserva en el store
    setDraftBarbershop(shop);
    setDraftService(selectedService);
    setDraftDate(selectedDate);
    setDraftTime(selectedTime);
    
    // Navegar a la pantalla de confirmación
    router.push('/client/booking-confirm');
  }

  if (!shop) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const canBook = !!selectedService && !!selectedTime;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
          <View style={styles.headerMeta}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
            <Text style={styles.shopAddress} numberOfLines={1}>{shop.address}</Text>
          </View>
        </View>
        {shop.rating ? (
          <View style={styles.ratingChip}>
            <Ionicons name="star" size={12} color={Colors.accent} />
            <Text style={styles.ratingText}>{shop.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecciona un servicio</Text>
          <View style={styles.servicesGrid}>
            {services.map((svc) => {
              const isActive = selectedService?.id === svc.id;
              return (
                <TouchableOpacity
                  key={svc.id}
                  style={[styles.serviceCard, isActive && styles.serviceCardActive]}
                  onPress={() => setSelectedService(svc)}
                  activeOpacity={0.75}
                >
                  <View style={styles.serviceTop}>
                    <Text style={[styles.svcName, isActive && styles.svcNameActive]}>{svc.name}</Text>
                    {isActive && <Ionicons name="checkmark-circle" size={17} color={Colors.accent} />}
                  </View>
                  <Text style={[styles.svcMeta, isActive && styles.svcMetaActive]}>⏱ {svc.duration_minutes} min</Text>
                  <Text style={[styles.svcPrice, isActive && styles.svcPriceActive]}>${svc.price.toLocaleString('es-CO')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elige el día</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
            {days.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = i === 0;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayName, isSelected && styles.dayTextActive]}>
                    {isToday ? 'Hoy' : DAYS_ES[date.getDay()]}
                  </Text>
                  <Text style={[styles.dayNum, isSelected && styles.dayTextActive]}>{date.getDate()}</Text>
                  {isToday && !isSelected && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hora disponible</Text>
          {loadingSlots
            ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            : <TimeSlotPicker slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />
          }
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaBar}>
        {selectedService && selectedTime ? (
          <View style={styles.ctaSummary}>
            <View>
              <Text style={styles.ctaServiceName}>{selectedService.name}</Text>
              <Text style={styles.ctaTime}>{selectedTime} · {selectedService.duration_minutes} min</Text>
            </View>
            <Text style={styles.ctaPrice}>${selectedService.price.toLocaleString('es-CO')}</Text>
          </View>
        ) : null}
        <Button
          title={canBook ? 'Confirmar reserva' : 'Selecciona servicio y hora'}
          onPress={handleBooking}
          disabled={!canBook}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  header: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  headerInfo: { flex: 1 },
  shopName: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  shopAddress: { fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-end',
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: Colors.accentDark },
  scroll: { flex: 1 },
  section: { backgroundColor: Colors.surface, marginTop: 10, paddingVertical: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 16, marginBottom: 14 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  serviceCard: {
    width: '47%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    padding: 14, backgroundColor: Colors.background,
  },
  serviceCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  svcName: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 4 },
  svcNameActive: { color: Colors.white },
  svcMeta: { fontSize: 12, color: Colors.textSecondary, marginBottom: 8 },
  svcMetaActive: { color: 'rgba(255,255,255,0.65)' },
  svcPrice: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  svcPriceActive: { color: Colors.accent },
  dayStrip: { paddingHorizontal: 16, gap: 8 },
  dayBtn: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background, minWidth: 54, position: 'relative',
  },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayName: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 3 },
  dayNum: { fontSize: 18, fontWeight: '800', color: Colors.text },
  dayTextActive: { color: Colors.white },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 3 },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 28,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  ctaSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingHorizontal: 4,
  },
  ctaServiceName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  ctaTime: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  ctaPrice: { fontSize: 20, fontWeight: '800', color: Colors.primary },
});
