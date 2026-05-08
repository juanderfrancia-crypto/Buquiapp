import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { GradientView } from '@/components/ui/GradientView';
import { useAuthStore } from '@/stores/authStore';
import { Colors, DAYS_ES } from '@/constants';

const DEFAULT_HOURS = { start_time: '09:00', end_time: '18:00', is_active: true, break_start: null as string | null, break_end: null as string | null };

export default function ScheduleScreen() {
  const { user } = useAuthStore();
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'start' | 'end' | 'break_start' | 'break_end'>('start');
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
      try {
        const { data: shop, error: shopError } = await supabase
          .from('barbershops')
          .select('id')
          .eq('owner_id', user.id)
          .single();
        
        if (shopError || !shop) {
          router.replace('/barber/setup');
          return;
        }
        
        setBarbershopId(shop.id);
        
        const { data: avail, error } = await supabase
          .from('availability')
          .select('*')
          .eq('barbershop_id', shop.id)
          .order('day_of_week');
        
        if (error) {
          console.error('Fetch availability error:', error);
          setSchedule([]);
        } else {
          const full = Array.from({ length: 7 }, (_, i) => {
            const existing = avail?.find((a) => a.day_of_week === i);
            return existing ?? { day_of_week: i, ...DEFAULT_HOURS, barbershop_id: shop.id };
          });
          setSchedule(full);
        }
      } catch (error) {
        console.error('Schedule fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [user]);

  const toggleDay = (i: number) => {
    setSchedule((prev) => prev.map((d, idx) => idx === i ? { ...d, is_active: !d.is_active } : d));
  };

  const toggleBreak = (i: number) => {
    setSchedule((prev) => prev.map((d, idx) => {
      if (idx !== i) return d;
      const hasBreak = d.break_start != null;
      return { ...d, break_start: hasBreak ? null : '13:00', break_end: hasBreak ? null : '14:00' };
    }));
  };

  const openTimePicker = (dayIndex: number, mode: 'start' | 'end' | 'break_start' | 'break_end') => {
    setTimePickerDay(dayIndex);
    setTimePickerMode(mode);
    const d = schedule[dayIndex];
    const current =
      mode === 'start' ? d.start_time :
      mode === 'end' ? d.end_time :
      mode === 'break_start' ? (d.break_start ?? '13:00') :
      (d.break_end ?? '14:00');
    setSelectedTime(current);
    setTimePickerVisible(true);
  };

  const confirmTime = () => {
    const key =
      timePickerMode === 'start' ? 'start_time' :
      timePickerMode === 'end' ? 'end_time' :
      timePickerMode === 'break_start' ? 'break_start' : 'break_end';
    setSchedule((prev) => prev.map((d, idx) =>
      idx === timePickerDay ? { ...d, [key]: selectedTime } : d
    ));
    setTimePickerVisible(false);
  };

  const handleSave = async () => {
    if (!barbershopId) {
      Alert.alert('Error', 'No se encontró tu barbería');
      return;
    }
    
    // Validate that at least one day is active
    const hasActiveDay = schedule.some(d => d.is_active);
    if (!hasActiveDay) {
      Alert.alert('Error', 'Debes activar al menos un día de atención');
      return;
    }
    
    // Validate times for active days
    for (const day of schedule) {
      if (day.is_active) {
        if (!day.start_time || !day.end_time) {
          Alert.alert('Error', `Completa los horarios de ${DAYS_ES[day.day_of_week]}`);
          return;
        }
        const [startH, startM] = day.start_time.split(':').map(Number);
        const [endH, endM] = day.end_time.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        if (startMin >= endMin) {
          Alert.alert('Error', `La hora de cierre debe ser después de la apertura en ${DAYS_ES[day.day_of_week]}`);
          return;
        }
        if (day.break_start && day.break_end) {
          const [bsH, bsM] = day.break_start.split(':').map(Number);
          const [beH, beM] = day.break_end.split(':').map(Number);
          const breakStartMin = bsH * 60 + bsM;
          const breakEndMin = beH * 60 + beM;
          if (breakStartMin >= breakEndMin) {
            Alert.alert('Error', `El fin del descanso debe ser después del inicio en ${DAYS_ES[day.day_of_week]}`);
            return;
          }
          if (breakStartMin < startMin || breakEndMin > endMin) {
            Alert.alert('Error', `El descanso de ${DAYS_ES[day.day_of_week]} debe estar dentro del horario laboral (${day.start_time} – ${day.end_time})`);
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const rows = schedule.map((d) => ({
        ...d,
        barbershop_id: barbershopId,
        ...(d.is_active ? { start_time: d.start_time, end_time: d.end_time } : {}),
      }));
      
      const { error } = await supabase.from('availability').upsert(rows, { onConflict: 'barbershop_id,day_of_week' });
      
      if (error) {
        Alert.alert('Error', error.message || 'No se pudieron guardar los horarios');
      } else {
        Alert.alert('¡Guardado!', 'Tus horarios fueron actualizados correctamente');
      }
    } catch (error) {
      console.error('Save schedule error:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar los horarios');
    } finally {
      setSaving(false);
    }
  };

  const activeDays = schedule.filter(d => d.is_active).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />
      <GradientView direction="top-bottom">
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Horarios</Text>
            <Text style={styles.headerSub}>{activeDays} día{activeDays !== 1 ? 's' : ''} activo{activeDays !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </GradientView>

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
                      <Text style={styles.dayHours}>
                        {day.start_time} – {day.end_time}
                        {day.break_start ? `  ·  Almuerzo ${day.break_start}–${day.break_end}` : ''}
                      </Text>
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
                <>
                  {/* Apertura / Cierre */}
                  <View style={styles.hoursRow}>
                    <TouchableOpacity style={styles.hourBox} onPress={() => openTimePicker(i, 'start')} activeOpacity={0.6}>
                      <Text style={styles.hourLabel}>Apertura</Text>
                      <View style={[styles.hourPill, styles.hourPillTouchable]}>
                        <Ionicons name="sunny-outline" size={14} color={Colors.primary} />
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

                  {/* Toggle descanso */}
                  <View style={styles.breakRow}>
                    <View style={styles.breakLeft}>
                      <Ionicons name="restaurant-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.breakLabel}>Descanso / Almuerzo</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggle, styles.toggleSmall, day.break_start != null && styles.toggleOn]}
                      onPress={() => toggleBreak(i)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.toggleThumb, styles.toggleThumbSmall, day.break_start != null && styles.toggleThumbOn]} />
                    </TouchableOpacity>
                  </View>

                  {/* Horario de descanso */}
                  {day.break_start != null && (
                    <View style={[styles.hoursRow, styles.breakHoursRow]}>
                      <TouchableOpacity style={styles.hourBox} onPress={() => openTimePicker(i, 'break_start')} activeOpacity={0.6}>
                        <Text style={styles.hourLabel}>Inicio pausa</Text>
                        <View style={[styles.hourPill, styles.hourPillTouchable, styles.hourPillBreak]}>
                          <Ionicons name="restaurant-outline" size={14} color={Colors.warning} />
                          <Text style={styles.hourValue}>{day.break_start}</Text>
                          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.hourSeparator}>
                        <View style={styles.hourLine} />
                        <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                        <View style={styles.hourLine} />
                      </View>
                      <TouchableOpacity style={styles.hourBox} onPress={() => openTimePicker(i, 'break_end')} activeOpacity={0.6}>
                        <Text style={styles.hourLabel}>Fin pausa</Text>
                        <View style={[styles.hourPill, styles.hourPillTouchable, styles.hourPillBreak]}>
                          <Ionicons name="play-forward-outline" size={14} color={Colors.primary} />
                          <Text style={styles.hourValue}>{day.break_end}</Text>
                          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
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
              {timePickerMode === 'start' ? 'Hora de apertura' :
               timePickerMode === 'end' ? 'Hora de cierre' :
               timePickerMode === 'break_start' ? 'Inicio del descanso' : 'Fin del descanso'}
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  scroll: { padding: 16, gap: 10 },
  infoCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.infoBg, borderRadius: 14, padding: 14, marginBottom: 4,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },
  dayCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
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

  // Break
  breakRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  breakLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  breakHoursRow: { marginTop: 8 },
  hourPillBreak: { borderColor: Colors.warningBg },
  toggleSmall: { width: 38, height: 22, borderRadius: 11, paddingHorizontal: 2 },
  toggleThumbSmall: { width: 16, height: 16, borderRadius: 8 },

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
