import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { TimeSlot } from '@/types';
import { Colors } from '@/constants';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
}

export function TimeSlotPicker({ slots, selectedTime, onSelect }: TimeSlotPickerProps) {
  if (slots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📅</Text>
        <Text style={styles.emptyText}>Sin disponibilidad este día</Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const isSelected = slot.time === selectedTime;
        const isOccupied = !slot.available;
        return (
          <TouchableOpacity
            key={slot.time}
            disabled={isOccupied}
            onPress={() => onSelect(slot.time)}
            style={[
              styles.slot,
              isSelected && styles.slotSelected,
              isOccupied && styles.slotOccupied,
            ]}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.slotText,
              isSelected && styles.slotTextSelected,
              isOccupied && styles.slotTextOccupied,
            ]}>
              {slot.time}
            </Text>
            {isOccupied && <View style={styles.occupiedLine} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  slot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 76,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  slotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  slotOccupied: {
    backgroundColor: Colors.background,
    borderColor: Colors.borderLight,
  },
  slotText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  slotTextSelected: { color: Colors.white },
  slotTextOccupied: { color: Colors.textMuted },
  occupiedLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: Colors.textMuted,
    left: 6,
    right: 6,
    top: '50%',
    opacity: 0.4,
  },
  emptyContainer: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
