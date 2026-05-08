import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GradientView } from '@/components/ui/GradientView';
import { useAuthStore } from '@/stores/authStore';
import { Service } from '@/types';
import { Colors } from '@/constants';

export default function ServicesScreen() {
  const { user } = useAuthStore();
  const [services, setServices] = useState<Service[]>([]);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchData = async () => {
    if (!user) return;
    const { data: shop } = await supabase.from('barbershops').select('id').eq('owner_id', user.id).single();
    if (!shop) {
      // Redirigir a setup si no tiene barbería
      router.replace('/barber/setup');
      return;
    }
    setBarbershopId(shop.id);
    const { data } = await supabase.from('services').select('*').eq('barbershop_id', shop.id).order('name');
    setServices(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setDuration(service.duration_minutes.toString());
      setPrice(service.price.toString());
    } else {
      setEditingService(null);
      setName('');
      setDuration('');
      setPrice('');
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingService(null);
    setName('');
    setDuration('');
    setPrice('');
  };

  const handleSave = async () => {
    if (!name.trim() || !duration || !price || !barbershopId) {
      Alert.alert('Campos requeridos', 'Completa todos los campos');
      return;
    }

    const durationNum = parseInt(duration, 10);
    const priceNum = parseFloat(price);

    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Duración inválida', 'La duración debe ser mayor a 0 minutos');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido (puede ser 0 para servicios gratuitos)');
      return;
    }

    setSaving(true);
    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: name.trim(),
            duration_minutes: durationNum,
            price: priceNum,
          })
          .eq('id', editingService.id);

        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('¡Actualizado!', 'El servicio ha sido actualizado.');
          handleCloseModal();
          fetchData();
        }
      } else {
        // Crear nuevo servicio
        const { error } = await supabase.from('services').insert({
          barbershop_id: barbershopId,
          name: name.trim(),
          duration_minutes: durationNum,
          price: priceNum,
          is_active: true,
        });

        if (error) {
          Alert.alert('Error', error.message);
        } else {
          handleCloseModal();
          fetchData();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Eliminar servicio',
      `¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('services').update({ is_active: false }).eq('id', service.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleToggle = async (svc: Service) => {
    await supabase.from('services').update({ is_active: !svc.is_active }).eq('id', svc.id);
    fetchData();
  };

  const activeCount = services.filter(s => s.is_active).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      <GradientView direction="top-bottom">
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mis servicios</Text>
            <Text style={styles.headerSub}>{activeCount} activo{activeCount !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenModal()}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </GradientView>

      {loading
        ? <ActivityIndicator style={{ marginTop: 48 }} color={Colors.primary} />
        : (
          <FlatList
            data={services}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: item.is_active ? Colors.primary : Colors.border }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.svcName, !item.is_active && styles.svcNameOff]}>{item.name}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenModal(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-bin" size={16} color={Colors.danger} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.toggle, item.is_active && styles.toggleOn]}
                        onPress={() => handleToggle(item)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.toggleThumb, item.is_active && styles.toggleThumbOn]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{item.duration_minutes} min</Text>
                    </View>
                    <View style={[styles.metaChip, styles.priceChip]}>
                      <Text style={styles.priceText}>${item.price.toLocaleString('es-CO')}</Text>
                    </View>
                    {!item.is_active && <Text style={styles.hiddenLabel}>Oculto</Text>}
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="pricetag-outline" size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>Sin servicios aún</Text>
                <Text style={styles.emptySub}>Toca + para agregar tu primer servicio</Text>
                <Button title="Agregar servicio" onPress={() => handleOpenModal()} style={{ marginTop: 20, paddingHorizontal: 32 }} />
              </View>
            }
          />
        )
      }

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingService ? 'Editar servicio' : 'Nuevo servicio'}</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={styles.modalBody}>
            <Input label="Nombre del servicio" value={name} onChangeText={setName} placeholder="Ej: Corte de cabello" icon="pricetag-outline" />
            <Input label="Duración (minutos)" value={duration} onChangeText={setDuration} placeholder="30" keyboardType="numeric" icon="time-outline" />
            <Input label="Precio (COP)" value={price} onChangeText={setPrice} placeholder="15000" keyboardType="numeric" icon="cash-outline" />
            <Button title={editingService ? 'Actualizar servicio' : 'Guardar servicio'} onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.buttonBg, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  colorBar: { width: 5 },
  cardContent: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  svcName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  svcNameOff: { color: Colors.textMuted },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  deleteBtn: { borderColor: Colors.danger },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.background, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  metaText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  priceChip: { backgroundColor: Colors.accentLight },
  priceText: { fontSize: 13, fontWeight: '700', color: Colors.accentDark },
  hiddenLabel: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCloseBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalBody: { padding: 20 },
});
