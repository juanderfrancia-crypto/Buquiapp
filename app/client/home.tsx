import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { ShopCard } from '@/components/ShopCard';
import { Barbershop } from '@/types';
import { Colors } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { MOCK_SHOPS } from '@/lib/mockData';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchShops(); }, []);

  async function fetchShops() {
    const { data } = await supabase.from('barbershops').select('*').eq('is_active', true).order('name');
    setShops(data && data.length > 0 ? data : MOCK_SHOPS);
    setLoading(false);
  }

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  const firstName = user?.name?.split(' ')[0] ?? 'ahí';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {firstName} 👋</Text>
          <Text style={styles.subtitle}>¿Qué barbería buscas hoy?</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar barbería o zona..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ShopCard shop={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>
              {search ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}` : 'Barberías disponibles'}
            </Text>
            <Text style={styles.sectionCount}>{filtered.length}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{loading ? '' : '🔍'}</Text>
            <Text style={styles.emptyText}>
              {loading ? 'Cargando barberías...' : 'No encontramos barberías'}
            </Text>
            {!loading && search.length > 0 && (
              <Text style={styles.emptySub}>Intenta con otro término de búsqueda</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  notifBtn: { position: 'relative', width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: Colors.primary },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 6 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.white },
  list: { paddingHorizontal: 16, paddingBottom: 30, backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 12, paddingTop: 8, flexGrow: 1 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionCount: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, backgroundColor: Colors.borderLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
