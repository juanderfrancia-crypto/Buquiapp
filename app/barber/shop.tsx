import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
// Profile screen is a separate route — see app/barber/profile.tsx
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { Colors, getBusinessConfig } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';
import { BusinessType } from '@/types';

export default function ShopProfileScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Shop state
  const [shopId, setShopId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('barbershop');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);


  useEffect(() => { loadShop(); }, [user]);

  const loadShop = async () => {
    if (!user) return;
    const { data: shop } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!shop) { setLoading(false); return; }

    setShopId(shop.id);
    setBusinessType((shop.business_type ?? 'barbershop') as BusinessType);
    setName(shop.name ?? '');
    setAddress(shop.address ?? '');
    setPhone(shop.phone ?? '');
    setDescription(shop.description ?? '');
    setImageUrl(shop.image_url ?? null);
    setLoading(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar la foto de portada.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const path = `${user!.id}/${Date.now()}.${ext}`;

      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });

      const { error: uploadError } = await supabase.storage
        .from('shop-images')
        .upload(path, decode(base64), { contentType: mime, upsert: true });

      if (uploadError) {
        Alert.alert('Error al subir', uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('shop-images')
        .getPublicUrl(path);

      setImageUrl(publicUrl);

      if (shopId) {
        await supabase.from('barbershops').update({ image_url: publicUrl }).eq('id', shopId);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Ocurrió un error al procesar la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Campos requeridos', 'El nombre y la dirección son obligatorios.');
      return;
    }
    if (!shopId) return;

    setSaving(true);
    const { error } = await supabase
      .from('barbershops')
      .update({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim() || null,
        description: description.trim() || null,
        image_url: imageUrl,
      })
      .eq('id', shopId);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('¡Guardado!', 'Los datos de tu negocio fueron actualizados correctamente.');
    }
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const biz = getBusinessConfig(businessType);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      {/* Header */}
      <GradientView style={styles.header} direction="top-bottom">
        <View>
          <Text style={styles.headerTitle}>Mi negocio</Text>
          <View style={styles.typeBadge}>
            <Ionicons name={biz.ionicon as any} size={10} color={Colors.white} />
            <Text style={styles.typeBadgeText}>{biz.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/barber/profile')} activeOpacity={0.8}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </GradientView>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover photo */}
        <TouchableOpacity style={styles.coverWrap} onPress={handlePickImage} activeOpacity={0.85}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name={biz.ionicon as any} size={52} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.coverOverlay}>
            {uploading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <View style={styles.cameraBtn}>
                  <Ionicons name="camera" size={20} color={Colors.white} />
                </View>
                <Text style={styles.coverHint}>
                  {imageUrl ? 'Cambiar foto de portada' : 'Agregar foto de portada'}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        {imageUrl && (
          <TouchableOpacity
            style={styles.removePhotoBtn}
            onPress={() => Alert.alert('Quitar foto', '¿Quitar la foto de portada?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Quitar', style: 'destructive', onPress: async () => {
                  setImageUrl(null);
                  if (shopId) {
                    await supabase.from('barbershops').update({ image_url: null }).eq('id', shopId);
                  }
                }
              },
            ])}
          >
            <Ionicons name="trash-outline" size={14} color={Colors.danger} />
            <Text style={styles.removePhotoText}>Quitar foto</Text>
          </TouchableOpacity>
        )}

        <View style={styles.form}>
          <Text style={styles.sectionLabel}>Información del negocio</Text>
          <Input
            label="Nombre *"
            value={name}
            onChangeText={setName}
            placeholder="Nombre de tu negocio"
            icon="storefront-outline"
          />
          <Input
            label="Dirección *"
            value={address}
            onChangeText={setAddress}
            placeholder="Dirección completa"
            icon="location-outline"
          />
          <Input
            label="Teléfono de contacto"
            value={phone}
            onChangeText={setPhone}
            placeholder="3001234567"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <Input
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            placeholder="Cuéntale a tus clientes qué ofreces..."
            icon="information-circle-outline"
          />

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
            <Text style={styles.noticeText}>
              Los cambios son visibles para los clientes de inmediato.
            </Text>
          </View>

          <Button title="Guardar cambios" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  profileBtn: { padding: 2 },
  profileAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 14, fontWeight: '800', color: Colors.text },

  scroll: { gap: 0 },

  // Cover
  coverWrap: { height: 190, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: {
    flex: 1, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  cameraBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  coverHint: { fontSize: 13, fontWeight: '600', color: Colors.white },
  removePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8,
  },
  removePhotoText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

  // Form
  form: { padding: 20, gap: 4 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.infoBg, borderRadius: 12,
    padding: 12, marginTop: 8,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.info, lineHeight: 19 },

});
