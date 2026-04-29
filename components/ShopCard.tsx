import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Barbershop } from '@/types';
import { Colors } from '@/constants';

interface ShopCardProps {
  shop: Barbershop;
}

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/client/${shop.id}`)}
    >
      {/* Cover */}
      <View style={styles.cover}>
        {shop.image_url
          ? <Image source={{ uri: shop.image_url }} style={styles.coverImage} />
          : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverEmoji}>✂️</Text>
            </View>
          )
        }
        <View style={styles.openBadge}>
          <View style={styles.dot} />
          <Text style={styles.openText}>Abierto</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
          {shop.rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={Colors.accent} />
              <Text style={styles.ratingText}>{shop.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.address} numberOfLines={1}>{shop.address}</Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.cta}>Ver disponibilidad</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#0D0D1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cover: {
    height: 130,
    position: 'relative',
  },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 44 },
  openBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  openText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  info: { padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontWeight: '700', color: Colors.accentDark },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  address: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 3, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  cta: { fontSize: 13, fontWeight: '600', color: Colors.accent },
});
