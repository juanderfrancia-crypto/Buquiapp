import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getAvailableSlots } from '@/lib/availability';
import { TimeSlotPicker } from '@/components/TimeSlotPicker';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useBookingStore } from '@/stores/bookingStore';
import { Barbershop, Service, TimeSlot } from '@/types';
import { Colors, DAYS_ES, getBusinessConfig } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';
import { Ionicons } from '@expo/vector-icons';

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
  const insets = useSafeAreaInsets();
  const { setDraftBarbershop, setDraftServices, setDraftDate, setDraftTime } = useBookingStore();

  const [shop, setShop] = useState<Barbershop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const days = getNext7Days();

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const serviceIdsKey = selectedServices.map(s => s.id).join(',');

  useEffect(() => {
    if (!shopId) return;

    const fetchShop = async () => {
      try {
        const { data, error } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', shopId)
          .eq('is_active', true)
          .single();

        if (error || !data) {
          Alert.alert('Error', 'No se encontró la barbería');
          if (router.canGoBack()) router.back(); else router.replace('/client/home');
          return;
        }
        setShop(data);
      } catch (error) {
        console.error('Fetch shop error:', error);
        Alert.alert('Error', 'No se pudo cargar la barbería');
        if (router.canGoBack()) router.back(); else router.replace('/client/home');
      }
    };

    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', shopId)
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Fetch services error:', error);
          setServices([]);
          return;
        }
        setServices(data ?? []);
      } catch (error) {
        console.error('Services fetch error:', error);
        setServices([]);
      }
    };

    fetchShop();
    fetchServices();
  }, [shopId]);

  useEffect(() => {
    if (selectedServices.length === 0 || !shopId) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setSelectedTime(null);
      setLoadingSlots(true);
      try {
        const result = await getAvailableSlots(shopId, selectedDate, totalDuration);
        setSlots(result);
      } catch (error) {
        console.error('Fetch slots error:', error);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceIdsKey, selectedDate, shopId]);

  function toggleService(svc: Service) {
    const isSelected = selectedServices.some(s => s.id === svc.id);
    if (isSelected) {
      setSelectedServices(prev => prev.filter(s => s.id !== svc.id));
    } else {
      setSelectedServices(prev => [...prev, svc]);
    }
    setSelectedTime(null);
  }

  async function handleBooking() {
    if (!user || selectedServices.length === 0 || !selectedTime || !shop) return;
    setDraftBarbershop(shop);
    setDraftServices(selectedServices);
    setDraftDate(selectedDate);
    setDraftTime(selectedTime);
    router.push('/client/booking-confirm');
  }

  if (!shop) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const biz = getBusinessConfig(shop.business_type);
  const canBook = selectedServices.length > 0 && !!selectedTime;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      {/* Header — gradient cubre toda el área incluyendo safe area */}
      <GradientView style={[styles.header, { paddingTop: insets.top + 12 }]} direction="top-bottom">
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
      </GradientView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Servicios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Elige tus servicios</Text>
            {selectedServices.length > 0 && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>
                  {selectedServices.length} seleccionado{selectedServices.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          {services.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="close-circle-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{biz.noServicesText}</Text>
            </View>
          ) : (
            <View style={styles.servicesGrid}>
              {services.map((svc) => {
                const isActive = selectedServices.some(s => s.id === svc.id);
                return (
                  <TouchableOpacity
                    key={svc.id}
                    style={[styles.serviceCard, isActive && styles.serviceCardActive]}
                    onPress={() => toggleService(svc)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.serviceTop}>
                      <Text style={[styles.svcName, isActive && styles.svcNameActive]}>{svc.name}</Text>
                      {isActive && <Ionicons name="checkmark-circle" size={17} color={Colors.white} />}
                    </View>
                    <View style={styles.svcMetaRow}>
                      <Ionicons name="time-outline" size={12} color={isActive ? Colors.white : Colors.textMuted} />
                      <Text style={[styles.svcMeta, isActive && styles.svcMetaActive]}>{svc.duration_minutes} min</Text>
                    </View>
                    <Text style={[styles.svcPrice, isActive && styles.svcPriceActive]}>${svc.price.toLocaleString('es-CO')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Fecha y hora — solo si hay servicios seleccionados */}
        {selectedServices.length > 0 && (
          <>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hora disponible</Text>
              {loadingSlots ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
              ) : slots.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={32} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No hay horarios disponibles para este día</Text>
                </View>
              ) : (
                <TimeSlotPicker slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {selectedServices.length > 0 && selectedTime ? (
          <View style={styles.ctaSummary}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.ctaServiceName} numberOfLines={1}>
                {selectedServices.map(s => s.name).join(' + ')}
              </Text>
              <Text style={styles.ctaTime}>{selectedTime} · {totalDuration} min</Text>
            </View>
            <Text style={styles.ctaPrice}>${totalPrice.toLocaleString('es-CO')}</Text>
          </View>
        ) : null}
        <Button
          title={
            canBook
              ? 'Confirmar reserva'
              : selectedServices.length === 0
              ? 'Selecciona al menos un servicio'
              : 'Selecciona un horario'
          }
          onPress={handleBooking}
          disabled={!canBook}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gradientStart },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  headerInfo: { flex: 1 },
  shopName: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  shopAddress: { fontSize: 12, color: 'rgba(255,255,255,0.55)', flex: 1 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-end',
  },
  ratingText: { fontSize: 13, fontWeight: '700', color: Colors.accentDark },
  scroll: { flex: 1 },
  section: { backgroundColor: Colors.surface, marginTop: 10, paddingVertical: 18 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  selectedBadge: {
    backgroundColor: Colors.primaryBg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  selectedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  serviceCard: {
    width: '47%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    padding: 14, backgroundColor: Colors.background,
  },
  serviceCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  serviceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  svcName: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 4 },
  svcNameActive: { color: Colors.white },
  svcMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  svcMeta: { fontSize: 12, color: Colors.textSecondary },
  svcMetaActive: { color: 'rgba(255,255,255,0.65)' },
  svcPrice: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  svcPriceActive: { color: Colors.white },
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
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 3 },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
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
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
