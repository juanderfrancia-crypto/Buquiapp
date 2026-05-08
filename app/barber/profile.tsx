import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, StatusBar, ActivityIndicator, Modal, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';
import { GradientView } from '@/components/ui/GradientView';

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function BarberProfileScreen() {
  const { user, signOut, setUser } = useAuthStore();
  const [stats, setStats] = useState({ totalBookings: 0, activeServices: 0, rating: 0 });
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings modals
  const [notifVisible, setNotifVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const [notifStatus, setNotifStatus] = useState<string>('');

  useEffect(() => {
    loadStats();
    checkNotifPermission();
    loadAvatar();
  }, []);

  const loadAvatar = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('users').select('avatar_url').eq('id', user.id).single();
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const path = `${user!.id}/avatar.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const { error: uploadError } = await supabase.storage
        .from('shop-images')
        .upload(path, decode(base64), { contentType: mime, upsert: true });
      if (uploadError) { Alert.alert('Error al subir', uploadError.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('shop-images').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user!.id);
      setUser({ ...user!, avatar_url: publicUrl } as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Ocurrió un error al procesar la imagen.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const checkNotifPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifStatus(status);
  };

  const loadStats = async () => {
    try {
      if (!user?.id) return;

      const { data: shop } = await supabase
        .from('barbershops')
        .select('id, rating')
        .eq('owner_id', user.id)
        .single();

      if (!shop) { setLoading(false); return; }

      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', shop.id)
        .neq('status', 'cancelled');

      const { count: serviceCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', shop.id)
        .eq('is_active', true);

      setStats({
        totalBookings: bookingCount ?? 0,
        activeServices: serviceCount ?? 0,
        rating: shop.rating ?? 0,
      });
    } catch (e) {
      console.error('Error loading stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const initials = (user?.name ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const openEdit = () => {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
    setEditVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { Alert.alert('El nombre es requerido'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ name: editName.trim(), phone: editPhone.trim() || null })
      .eq('id', user!.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setUser({ ...user!, name: editName.trim(), phone: editPhone.trim() || undefined });
    setEditVisible(false);
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Cambiar contraseña',
      `Se enviará un enlace a ${user?.email} para restablecer tu contraseña.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar enlace', onPress: async () => {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Enviado', 'Revisa tu correo para continuar.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => { await signOut(); router.replace('/auth/login'); },
      },
    ]);
  };

  const handleEnableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifStatus(status);
    if (status !== 'granted') Linking.openSettings();
  };

  const rows: SettingsRow[] = [
    { icon: 'person-outline', label: 'Editar perfil', sublabel: 'Nombre y datos de contacto', onPress: openEdit },
    { icon: 'notifications-outline', label: 'Notificaciones', sublabel: 'Alertas de nuevas reservas', onPress: () => setNotifVisible(true) },
    { icon: 'lock-closed-outline', label: 'Cambiar contraseña', sublabel: 'Enlace de restablecimiento al correo', onPress: handleResetPassword },
    { icon: 'shield-checkmark-outline', label: 'Privacidad', sublabel: 'Datos y seguridad', onPress: () => setPrivacyVisible(true) },
    { icon: 'help-circle-outline', label: 'Ayuda y soporte', sublabel: 'FAQ y contacto', onPress: () => setHelpVisible(true) },
    { icon: 'information-circle-outline', label: 'Acerca de Buqui', sublabel: 'Versión 1.0.0', onPress: () => setAboutVisible(true) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />

      <GradientView direction="top-bottom">
        {/* Back header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Mi perfil</Text>
          <TouchableOpacity onPress={() => setNotifVisible(true)} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Avatar hero */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.85}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar
                ? <ActivityIndicator size={10} color={Colors.white} />
                : <Ionicons name="camera" size={12} color={Colors.white} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name ?? 'Propietario'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="storefront-outline" size={13} color={Colors.white} />
            <Text style={styles.roleText}>Propietario</Text>
          </View>
        </View>
      </GradientView>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            {loading ? <ActivityIndicator color={Colors.primary} /> : <>
              <Text style={styles.statNum}>{stats.totalBookings}</Text>
              <Text style={styles.statLabel}>Citas</Text>
            </>}
          </View>
          <View style={[styles.statCard, styles.statCardMid]}>
            {loading ? <ActivityIndicator color={Colors.primary} /> : <>
              <Text style={styles.statNum}>{stats.activeServices}</Text>
              <Text style={styles.statLabel}>Servicios</Text>
            </>}
          </View>
          <View style={styles.statCard}>
            {loading ? <ActivityIndicator color={Colors.primary} /> : <>
              <Text style={styles.statNum}>{stats.rating > 0 ? stats.rating.toFixed(1) : '–'}</Text>
              <Text style={styles.statLabel}>Calificación</Text>
            </>}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Configuración</Text>
          <View style={styles.settingsCardShadow}>
          <View style={styles.settingsCard}>
            {rows.map((row, i) => (
              <TouchableOpacity
                key={row.label}
                style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
                onPress={row.onPress}
                activeOpacity={0.6}
              >
                <View style={[styles.rowIcon, row.danger && styles.rowIconDanger]}>
                  <Ionicons name={row.icon} size={18} color={row.danger ? Colors.danger : Colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, row.danger && styles.rowLabelDanger]}>{row.label}</Text>
                  {row.sublabel && <Text style={styles.rowSub}>{row.sublabel}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Buqui v1.0.0</Text>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <View style={{ width: 38 }} />
          </View>
          <View style={styles.modalBody}>
            <Input
              label="Nombre completo"
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre"
              icon="person-outline"
            />
            <Input
              label="Teléfono personal"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="3001234567"
              keyboardType="phone-pad"
              icon="call-outline"
            />
            <Button title="Guardar cambios" onPress={handleSaveProfile} loading={saving} style={{ marginTop: 8 }} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Notifications Modal ── */}
      <Modal visible={notifVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotifVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notificaciones</Text>
            <View style={{ width: 38 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.notifStatusCard}>
              <View style={[styles.notifDot, { backgroundColor: notifStatus === 'granted' ? Colors.success : Colors.danger }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifStatusTitle}>
                  {notifStatus === 'granted' ? 'Notificaciones activas' : 'Notificaciones desactivadas'}
                </Text>
                <Text style={styles.notifStatusSub}>
                  {notifStatus === 'granted'
                    ? 'Recibirás alertas cuando tus clientes hagan una nueva reserva.'
                    : 'Activa las notificaciones para saber de inmediato cuando llegue una reserva.'}
                </Text>
              </View>
            </View>

            {notifStatus !== 'granted' && (
              <Button title="Activar notificaciones" onPress={handleEnableNotifications} style={{ marginBottom: 8 }} />
            )}

            <Text style={styles.notifSectionTitle}>¿Qué notificaciones recibirás?</Text>
            {[
              { icon: 'calendar-outline', text: 'Nueva reserva de un cliente' },
              { icon: 'close-circle-outline', text: 'Cancelación de una cita existente' },
              { icon: 'repeat-outline', text: 'Reprogramación solicitada por un cliente' },
              { icon: 'alert-circle-outline', text: 'Recordatorio de citas del día' },
            ].map(item => (
              <View key={item.text} style={styles.notifItem}>
                <Ionicons name={item.icon as any} size={18} color={Colors.primary} />
                <Text style={styles.notifItemText}>{item.text}</Text>
              </View>
            ))}

            {notifStatus === 'granted' && (
              <TouchableOpacity style={styles.settingsLink} onPress={() => Linking.openSettings()}>
                <Ionicons name="settings-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.settingsLinkText}>Gestionar en ajustes del sistema</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Privacy Modal ── */}
      <Modal visible={privacyVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPrivacyVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacidad</Text>
            <View style={{ width: 38 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.privacyHero}>
              <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
              <Text style={styles.privacyHeroTitle}>Tus datos están seguros</Text>
              <Text style={styles.privacyHeroSub}>Buqui protege tu información y la de tus clientes en todo momento.</Text>
            </View>

            {[
              {
                icon: 'person-outline',
                title: 'Datos que recopilamos',
                body: 'Nombre, correo, teléfono y datos de tu negocio (nombre, dirección, foto). Solo lo necesario para operar la plataforma.',
              },
              {
                icon: 'people-outline',
                title: 'Datos de tus clientes',
                body: 'Accedes al nombre y teléfono de los clientes que reservan en tu negocio. Estos datos solo deben usarse para gestionar las citas.',
              },
              {
                icon: 'lock-closed-outline',
                title: 'Cómo los usamos',
                body: 'Los datos del negocio se muestran a los clientes para que puedan encontrarte y reservar. Nunca los vendemos ni compartimos con terceros.',
              },
              {
                icon: 'notifications-off-outline',
                title: 'Notificaciones push',
                body: 'Solo recibimos notificaciones relacionadas con reservas de tu negocio. Puedes desactivarlas en cualquier momento.',
              },
              {
                icon: 'trash-outline',
                title: 'Eliminar tu cuenta',
                body: 'Puedes solicitar la eliminación completa de tu cuenta y los datos de tu negocio escribiéndonos a soporte@barberly.app.',
              },
            ].map(section => (
              <View key={section.title} style={styles.privacySection}>
                <View style={styles.privacySectionHeader}>
                  <View style={styles.privacyIconBox}>
                    <Ionicons name={section.icon as any} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.privacySectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.privacySectionBody}>{section.body}</Text>
              </View>
            ))}

            <Text style={styles.privacyFooter}>Última actualización: enero 2026 · © Buqui</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Help Modal ── */}
      <Modal visible={helpVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ayuda y soporte</Text>
            <View style={{ width: 38 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.helpSectionLabel}>Preguntas frecuentes</Text>

            {[
              {
                q: '¿Cómo confirmo una reserva?',
                a: 'Ve a la Agenda → toca la cita pendiente → presiona "Confirmar". El cliente recibirá una notificación de inmediato.',
              },
              {
                q: '¿Cómo rechazo o cancelo una cita?',
                a: 'En la Agenda, toca la cita → presiona "Rechazar" (si está pendiente) o "Cancelar cita" (si ya estaba confirmada). El cliente será notificado.',
              },
              {
                q: '¿Cómo configuro mis horarios de atención?',
                a: 'Ve a la pestaña "Horarios" → activa o desactiva los días que atiendes y ajusta la hora de inicio y fin para cada día.',
              },
              {
                q: '¿Cómo agrego un nuevo servicio?',
                a: 'Ve a "Servicios" → toca el botón "+" → ingresa el nombre, duración y precio → guarda. El servicio queda visible para los clientes de inmediato.',
              },
              {
                q: '¿Cómo actualizo la foto y datos de mi negocio?',
                a: 'Ve a "Mi negocio" → toca la imagen de portada para cambiarla, o edita los campos de nombre, dirección y descripción → guarda los cambios.',
              },
              {
                q: '¿Por qué no recibo notificaciones de nuevas reservas?',
                a: 'Asegúrate de tener las notificaciones activadas en este perfil y en los ajustes del sistema de tu teléfono. También verifica que tu EAS Project ID esté configurado.',
              },
            ].map(({ q, a }) => (
              <View key={q} style={styles.faqItem}>
                <View style={styles.faqQuestion}>
                  <Ionicons name="help-circle" size={18} color={Colors.primary} />
                  <Text style={styles.faqQ}>{q}</Text>
                </View>
                <Text style={styles.faqA}>{a}</Text>
              </View>
            ))}

            <Text style={[styles.helpSectionLabel, { marginTop: 8 }]}>¿Necesitas más ayuda?</Text>
            <View style={styles.contactCard}>
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Escríbenos por correo</Text>
                <Text style={styles.contactSub}>soporte@barberly.app · Respondemos en menos de 24h</Text>
              </View>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL('mailto:soporte@barberly.app')}
              >
                <Text style={styles.contactBtnText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── About Modal ── */}
      <Modal visible={aboutVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAboutVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Acerca de Buqui</Text>
            <View style={{ width: 38 }} />
          </View>
          <ScrollView contentContainerStyle={[styles.modalBody, styles.aboutBody]} showsVerticalScrollIndicator={false}>
            <View style={styles.aboutLogo}>
              <Ionicons name="sparkles" size={44} color={Colors.white} />
            </View>
            <Text style={styles.aboutAppName}>Buqui</Text>
            <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
            <Text style={styles.aboutTagline}>Tu turno, a un toque de distancia.</Text>

            <View style={styles.aboutDivider} />

            <Text style={styles.aboutDesc}>
              Buqui conecta clientes con los mejores negocios de bienestar y belleza de forma rápida, sencilla y sin llamadas.
              Gestiona tu agenda, servicios y horarios desde un solo lugar.
            </Text>

            {[
              { icon: 'flash-outline', label: 'Agenda en tiempo real' },
              { icon: 'notifications-outline', label: 'Notificaciones instantáneas' },
              { icon: 'pricetag-outline', label: 'Gestión de servicios y precios' },
              { icon: 'bar-chart-outline', label: 'Estadísticas de tu negocio' },
            ].map(f => (
              <View key={f.label} style={styles.aboutFeature}>
                <View style={styles.aboutFeatureIcon}>
                  <Ionicons name={f.icon as any} size={16} color={Colors.primary} />
                </View>
                <Text style={styles.aboutFeatureText}>{f.label}</Text>
              </View>
            ))}

            <View style={styles.aboutDivider} />

            <TouchableOpacity
              style={styles.aboutContactRow}
              onPress={() => Linking.openURL('mailto:hola@barberly.app')}
            >
              <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.aboutContactText}>hola@barberly.app</Text>
            </TouchableOpacity>

            <Text style={styles.aboutCopy}>© 2026 Buqui. Todos los derechos reservados.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: Colors.white },
  notifBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  hero: {
    alignItems: 'center',
    paddingBottom: 28, paddingHorizontal: 24,
  },
  avatarWrap: { marginBottom: 16, position: 'relative' },
  avatar: {
    width: 110, height: 110, borderRadius: 32,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarImg: {
    width: 110, height: 110, borderRadius: 32,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: { fontSize: 38, fontWeight: '800', color: Colors.text },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.buttonBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  name: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.white },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  settingsCardShadow: {
    borderRadius: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  settingsCard: {
    backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: Colors.errorBg },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowLabelDanger: { color: Colors.danger },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: 14, paddingVertical: 14,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginVertical: 28 },

  // Shared modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCloseBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalBody: { padding: 20, gap: 12 },

  // Notifications
  notifStatusCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
  },
  notifDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  notifStatusTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  notifStatusSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  notifSectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8 },
  notifItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  notifItemText: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },
  settingsLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 10 },
  settingsLinkText: { fontSize: 13, color: Colors.textSecondary },

  // Privacy
  privacyHero: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  privacyHeroTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  privacyHeroSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  privacySection: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 8 },
  privacySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  privacySectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  privacySectionBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  privacyFooter: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: 8 },

  // Help
  helpSectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  faqItem: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 8 },
  faqQuestion: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  faqA: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
  },
  contactTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  contactSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  contactBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  contactBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white },

  // About
  aboutBody: { alignItems: 'center' },
  aboutLogo: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  aboutAppName: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.4 },
  aboutVersion: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  aboutTagline: { fontSize: 15, color: Colors.textSecondary, marginTop: 8, textAlign: 'center' },
  aboutDivider: { width: '100%', height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  aboutDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  aboutFeature: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', paddingVertical: 6 },
  aboutFeatureIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  aboutFeatureText: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  aboutContactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  aboutContactText: { fontSize: 14, color: Colors.textSecondary },
  aboutCopy: { fontSize: 12, color: Colors.textMuted, marginTop: 16, textAlign: 'center' },
});
