import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { Colors, DAYS_ES } from '@/constants';

const DEFAULT_HOURS = { start_time: '09:00', end_time: '18:00', is_active: true };

export default function ScheduleScreen() {
  const { user } = useAuthStore();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end'>('start');
  const [timePickerDay, setTimePickerDay] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState('09:00');

  // Generate hour options (00:00 to 23:30 in 30-min increments)
  const hourOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = (i % 2) * 30;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!user) return;
      const { data: shop } = await supabase.from('barbershops').select('id').eq('owner_id', user.id).single();
      if (!shop) {
        // Redirigir a setup si no tiene barbería
        router.replace('/barber/setup');
        return;
      }
      setBarbershopId(shop.id);
      const { data: avail } = await supabase.from('availability').select('*').eq('barbershop_id', shop.id).order('day_of_week');
      const full = Array.from({ length: 7 }, (_, i) => {
        const existing = avail?.find((a) => a.day_of_week === i);
        return existing ?? { day_of_week: i, ...DEFAULT_HOURS, barbershop_id: shop.id };
      });
      setSchedule(full);
      setLoading(false);
    };
    fetchSchedule();
  }, [user]);

  const toggleDay = (i: number) => {
    setSchedule((prev) => prev.map((d, idx) => idx === i ? { ...d, is_active: !d.is_active } : d));
  };

  const openTimePicker = (dayIndex: number, mode: 'start' | 'end') => {
    setTimePickerDay(dayIndex);
    setTimePickerMode(mode);
    setSelectedTime(mode === 'start' ? schedule[dayIndex].start_time : schedule[dayIndex].end_time);
    setTimePickerVisible(true);
  };

  const confirmTime = () => {
    setSchedule((prev) => prev.map((d, idx) => {
      if (idx === timePickerDay) {
        return {
          ...d,
          [timePickerMode === 'start' ? 'start_time' : 'end_time']: selectedTime
        };
      }
      return d;
    }));
    setTimePickerVisible(false);
  };

  const handleSave = async () => {
    if (!barbershopId) return;
    setSaving(true);
    const rows = schedule.map((d) => ({ ...d, barbershop_id: barbershopId }));
    const { error } = await supabase.from('availability').upsert(rows, { onConflict: 'barbershop_id,day_of_week' });
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('¡Guardado!', 'Horarios actualizados correctamente');
  };

  const activeDays = schedule.filter(d => d.is_active).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Horarios</Text>
          <Text style={styles.headerSub}>{activeDays} día{activeDays !== 1 ? 's' : ''} activo{activeDays !== 1 ? 's' : ''}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 48 }} color={Colors.primary} /> : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
            <Text style={styles.infoText}>Activa los días que trabajas. Los clientes solo podrán reservar en esos días y horarios.</Text>
          </View>

          {schedule.map((day, i) => (
            <View key={i} style={[styles.dayCard, !day.is_active && styles.dayCardOff]}>
              <View style={styles.dayRow}>
                <View style={styles.dayLeft}>
                  <View style={[styles.dayNumber, day.is_active && styles.dayNumberActive]}>
                    <Text style={[styles.dayNumText, day.is_active && styles.dayNumTextActive]}>{i}</Text>
                  </View>
                  <View>
                    <Text style={[styles.dayName, !day.is_active && styles.dayNameOff]}>{DAYS_ES[day.day_of_week]}</Text>
                    {day.is_active && (
                      <Text style={styles.dayHours}>{day.start_time} – {day.end_time}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, day.is_active && styles.toggleOn]}
                  onPress={() => toggleDay(i)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.toggleThumb, day.is_active && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>

              {day.is_active && (
                <View style={styles.hoursRow}>
                  <TouchableOpacity style={styles.hourBox} onPress={() => openTimePicker(i, 'start')} activeOpacity={0.6}>
                    <Text style={styles.hourLabel}>Apertura</Text>
                    <View style={[styles.hourPill, styles.hourPillTouchable]}>
                      <Ionicons name="sunny-outline" size={14} color={Colors.accent} />
                      <Text style={styles.hourValue}>{day.start_time}</Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.hourSeparator}>
                    <View style={styles.hourLine} />
                    <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                    <View style={styles.hourLine} />
                  </View>
                  <TouchableOpacity style={styles.hourBox} onPress={() => openTimePicker(i, 'end')} activeOpacity={0.6}>
                    <Text style={styles.hourLabel}>Cierre</Text>
                    <View style={[styles.hourPill, styles.hourPillTouchable]}>
                      <Ionicons name="moon-outline" size={14} color={Colors.primary} />
                      <Text style={styles.hourValue}>{day.end_time}</Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <Button title="Guardar cambios" onPress={handleSave} loading={saving} style={{ marginTop: 8, marginBottom: 20 }} />
        </ScrollView>
      )}

      {/* Time Picker Modal */}
      <Modal visible={timePickerVisible} animationType="slide" presentationStyle="pageSheet" transparent={false}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTimePickerVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {timePickerMode === 'start' ? 'Hora de apertura' : 'Hora de cierre'}
            </Text>
            <View style={{ width: 38 }} />
          </View>

          <FlatList
            data={hourOptions}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.timeOption, selectedTime === item && styles.timeOptionSelected]}
                onPress={() => setSelectedTime(item)}
                activeOpacity={0.6}
              >
                <Text style={[styles.timeOptionText, selectedTime === item && styles.timeOptionTextSelected]}>
                  {item}
                </Text>
                {selectedTime === item && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.timePickerList}
          />

          <View style={styles.modalFooter}>
            <Button
              title="Confirmar hora"
              onPress={confirmTime}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, textAlign: 'center', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 2 },
  scroll: { padding: 16, gap: 10 },
  infoCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.infoBg, borderRadius: 14, padding: 14, marginBottom: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },
  dayCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#0D0D1A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  dayCardOff: { opacity: 0.6 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayNumber: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  dayNumberActive: { backgroundColor: Colors.primary },
  dayNumText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  dayNumTextActive: { color: Colors.white },
  dayName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  dayNameOff: { color: Colors.textMuted },
  dayHours: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.white, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  hourBox: { flex: 1, alignItems: 'center', gap: 6 },
  hourLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  hourPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  hourPillTouchable: { borderWidth: 2, borderColor: Colors.border },
  hourValue: { fontSize: 15, fontWeight: '700', color: Colors.text },
  hourSeparator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hourLine: { width: 12, height: 1, backgroundColor: Colors.border },
  // Modal styles
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  timePickerList: { paddingVertical: 12 },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  timeOptionSelected: { backgroundColor: Colors.accentLight },
  timeOptionText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  timeOptionTextSelected: { color: Colors.primary, fontWeight: '800' },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
