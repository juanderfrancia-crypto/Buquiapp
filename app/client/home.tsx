import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, StatusBar, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ShopCard } from '@/components/ShopCard';
import { Barbershop, BusinessType } from '@/types';
import { Colors, BUSINESS_TYPES } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';

type FilterType = 'all' | BusinessType;

const FILTER_OPTIONS: { value: FilterType; label: string; icon: string }[] = [
  { value: 'all',          label: 'Todos',     icon: 'apps-outline' },
  { value: 'barbershop',   label: 'Barberías', icon: 'cut-outline' },
  { value: 'beauty_salon', label: 'Salones',   icon: 'sparkles-outline' },
  { value: 'spa',          label: 'Spas',      icon: 'leaf-outline' },
  { value: 'other',        label: 'Otros',     icon: 'storefront-outline' },
];

const SUBTITLES: Record<FilterType, string> = {
  all:          '¿Qué negocio buscas hoy?',
  barbershop:   '¿Qué barbería buscas hoy?',
  beauty_salon: '¿Qué salón buscas hoy?',
  spa:          '¿Qué spa buscas hoy?',
  other:        '¿Qué negocio buscas hoy?',
};

const SECTION_LABELS: Record<FilterType, string> = {
  all:          'Negocios disponibles',
  barbershop:   'Barberías disponibles',
  beauty_salon: 'Salones disponibles',
  spa:          'Spas disponibles',
  other:        'Negocios disponibles',
};

export default function HomeScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => { fetchShops(); }, [filter]);

  async function fetchShops(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let query = supabase
        .from('barbershops')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (filter !== 'all') {
        query = query.eq('business_type', filter);
      }

      const { data, error } = await query;
      if (!error) setShops(data ?? []);
    } catch (e) {
      console.error('Shops fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  const firstName = user?.name?.split(' ')[0] ?? 'ahí';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      <GradientView direction="top-bottom">
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {firstName}</Text>
            <Text style={styles.subtitle}>{SUBTITLES[filter]}</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/client/profile')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o zona..."
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

        {/* Filtros */}
        <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterStrip}
        style={styles.filterScrollView}
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => { setFilter(opt.value); setSearch(''); }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={opt.icon as any}
                size={13}
                color={active ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </GradientView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ShopCard shop={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        onRefresh={() => fetchShops(true)}
        refreshing={refreshing}
        ListHeaderComponent={
          !loading ? (
            <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>
                {search
                  ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
                  : SECTION_LABELS[filter]}
              </Text>
              <Text style={styles.sectionCount}>{filtered.length}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Buscando negocios...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={search.length > 0 ? 'search-outline' : 'location-outline'}
                  size={36}
                  color={Colors.textMuted}
                />
              </View>
              <Text style={styles.emptyText}>
                {search.length > 0
                  ? 'Sin resultados para esa búsqueda'
                  : `No hay ${filter === 'all' ? 'negocios' : BUSINESS_TYPES[filter]?.label.toLowerCase() ?? 'negocios'} disponibles`}
              </Text>
              {search.length > 0 ? (
                <Text style={styles.emptySub}>Intenta con otro término</Text>
              ) : (
                <Text style={styles.emptySub}>Pronto habrá más cerca tuyo</Text>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.gradientStart },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  notifBtn: {
    width: 42, height: 42, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  filterScrollView: { flexGrow: 0, marginBottom: 6 },
  filterStrip: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: Colors.white,
    backgroundColor: Colors.white,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.white },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterLabelActive: { color: Colors.primary },
  list: {
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: 8, paddingTop: 8, flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionCount: {
    fontSize: 13, fontWeight: '600', color: Colors.textMuted,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  loadingState: { alignItems: 'center', paddingTop: 72, gap: 14 },
  loadingText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginTop: 8 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});
