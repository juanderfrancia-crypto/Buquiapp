import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Barbershop } from '@/types';
import { Colors } from '@/constants';
import { getBusinessConfig } from '@/constants';

interface ShopCardProps {
  shop: Barbershop;
}

export function ShopCard({ shop }: ShopCardProps) {
  const biz = getBusinessConfig(shop.business_type);

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
              <Ionicons name={biz.ionicon as any} size={44} color={Colors.white} />
            </View>
          )
        }
        {/* Tipo de negocio badge */}
        <View style={styles.typeBadge}>
          <Ionicons name={biz.ionicon as any} size={11} color={Colors.primary} />
          <Text style={styles.typeText}>{biz.label}</Text>
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
          <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
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
    shadowColor: '#000000',
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
  typeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
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
  cta: { fontSize: 13, fontWeight: '600', color: Colors.primary },
});
