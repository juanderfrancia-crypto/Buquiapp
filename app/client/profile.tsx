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
import { GradientView } from '@/components/ui/GradientView';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';

interface SettingsRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const { user, signOut, setUser } = useAuthStore();
  const [stats, setStats] = useState({ totalBookings: 0, uniqueBarbers: 0, nextBooking: null as any });
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);
  const [uploading, setUploading] = useState(false);

  // Edit profile modal
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings modals
  const [notifVisible, setNotifVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  // Notification permission status
  const [notifStatus, setNotifStatus] = useState<string>('');

  useEffect(() => {
    loadStats();
    checkNotifPermission();
  }, []);

  const checkNotifPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifStatus(status);
  };

  const loadStats = async () => {
    try {
      if (!user?.id) return;

      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      const { data: bookings } = await supabase
        .from('bookings')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');
      const uniqueBarbers = new Set(bookings?.map((b: any) => b.barbershop_id)).size;

      const { data: nextBooking } = await supabase
        .from('bookings')
        .select('*, barbershops(name)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      setStats({
        totalBookings: bookingCount || 0,
        uniqueBarbers,
        nextBooking: nextBooking || null,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextBookingText = () => {
    if (!stats.nextBooking) return '–';
    return new Date(stats.nextBooking.booking_date + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

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
    if (status !== 'granted') {
      Linking.openSettings();
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para cambiar tu foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const ext = (asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const path = `${user!.id}/avatar.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const { error: uploadError } = await supabase.storage
        .from('shop-images')
        .upload(path, decode(base64), { contentType: mime, upsert: true });
      if (uploadError) { Alert.alert('Error', uploadError.message); return; }
      const { data: { publicUrl } } = supabase.storage.from('shop-images').getPublicUrl(path);
      setAvatarUrl(publicUrl);
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user!.id);
      setUser({ ...user!, avatar_url: publicUrl });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Ocurrió un error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const rows: SettingsRow[] = [
    { icon: 'person-outline', label: 'Editar perfil', sublabel: 'Nombre y datos de contacto', onPress: openEdit },
    { icon: 'notifications-outline', label: 'Notificaciones', sublabel: 'Alertas y recordatorios', onPress: () => setNotifVisible(true) },
    { icon: 'shield-checkmark-outline', label: 'Privacidad', sublabel: 'Datos y seguridad', onPress: () => setPrivacyVisible(true) },
    { icon: 'help-circle-outline', label: 'Ayuda y soporte', sublabel: 'FAQ y contacto', onPress: () => setHelpVisible(true) },
    { icon: 'information-circle-outline', label: 'Acerca de Barberly', sublabel: 'Versión 1.0.0', onPress: () => setAboutVisible(true) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gradientStart} />
      <GradientView direction="top-bottom">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.85}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarCameraBtn}>
              {uploading
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Ionicons name="camera" size={14} color={Colors.white} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name ?? 'Usuario'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={user?.role === 'barber' ? 'storefront-outline' : 'person-outline'} size={13} color={Colors.white} />
            <Text style={styles.roleText}>{user?.role === 'barber' ? 'Propietario' : 'Cliente'}</Text>
          </View>
        </View>
      </GradientView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats (only for clients) */}
        {user?.role === 'client' && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <>
                <Text style={styles.statNum}>{stats.totalBookings}</Text>
                <Text style={styles.statLabel}>Reservas</Text>
              </>}
            </View>
            <View style={[styles.statCard, styles.statCardMid]}>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <>
                <Text style={styles.statNum}>{stats.uniqueBarbers}</Text>
                <Text style={styles.statLabel}>Negocios</Text>
              </>}
            </View>
            <View style={styles.statCard}>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <>
                {stats.nextBooking ? (
                  <>
                    <Text style={styles.statNextDay}>
                      {new Date(stats.nextBooking.booking_date + 'T12:00:00')
                        .toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '').toUpperCase()}
                    </Text>
                    <Text style={styles.statNextDate} numberOfLines={1} adjustsFontSizeToFit>
                      {new Date(stats.nextBooking.booking_date + 'T12:00:00')
                        .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '')}
                    </Text>
                    <Text style={styles.statNextTime}>
                      {(() => {
                        const [h, m] = (stats.nextBooking.start_time ?? '').split(':');
                        const hour = parseInt(h, 10);
                        return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
                      })()}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.statNum}>–</Text>
                )}
                <Text style={styles.statLabel}>Próxima</Text>
              </>}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Configuración</Text>
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

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Barberly v1.0.0</Text>
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
              label="Teléfono"
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
                    ? 'Recibirás alertas cuando tu cita sea confirmada o cancelada.'
                    : 'Activa las notificaciones para no perderte ninguna actualización de tus citas.'}
                </Text>
              </View>
            </View>

            {notifStatus !== 'granted' && (
              <Button
                title="Activar notificaciones"
                onPress={handleEnableNotifications}
                style={{ marginBottom: 20 }}
              />
            )}

            <Text style={styles.notifSectionTitle}>¿Qué notificaciones recibirás?</Text>
            {[
              { icon: 'checkmark-circle-outline', text: 'Confirmación de tu reserva por el negocio' },
              { icon: 'close-circle-outline', text: 'Cancelación o cambio de tu cita' },
              { icon: 'alarm-outline', text: 'Recordatorio 1 hora antes de tu cita' },
              { icon: 'star-outline', text: 'Invitación a calificar tu experiencia' },
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
              <Text style={styles.privacyHeroSub}>Barberly protege tu información y nunca la comparte con terceros.</Text>
            </View>

            {[
              {
                icon: 'person-outline',
                title: 'Datos que recopilamos',
                body: 'Nombre, correo electrónico y número de teléfono. Solo lo necesario para gestionar tus reservas.',
              },
              {
                icon: 'lock-closed-outline',
                title: 'Cómo los usamos',
                body: 'Tus datos se usan exclusivamente para crear y gestionar citas con las barberías que eliges.',
              },
              {
                icon: 'people-outline',
                title: 'Compartición',
                body: 'Solo compartimos tu nombre y contacto con el negocio de tu cita. Jamás vendemos tus datos.',
              },
              {
                icon: 'notifications-off-outline',
                title: 'Notificaciones push',
                body: 'Solo enviamos alertas relacionadas con tus reservas. Puedes desactivarlas en cualquier momento.',
              },
              {
                icon: 'trash-outline',
                title: 'Eliminar tu cuenta',
                body: 'Puedes solicitar la eliminación completa de tu cuenta y datos escribiéndonos a soporte@barberly.app.',
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

            <Text style={styles.privacyFooter}>Última actualización: enero 2026 · © Barberly</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Help & Support Modal ── */}
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
                q: '¿Cómo hago una reserva?',
                a: 'Ve a Inicio → busca o selecciona una barbería → elige el servicio → escoge el día y hora disponible → confirma tu cita.',
              },
              {
                q: '¿Cómo cancelo una cita?',
                a: 'Ve a Mis citas → toca la cita que quieres cancelar → presiona el botón Cancelar. Recibirás una confirmación.',
              },
              {
                q: '¿Cuándo se confirma mi reserva?',
                a: 'Tu cita queda en estado "pendiente" hasta que el negocio la confirme. Te notificaremos en cuanto lo haga.',
              },
              {
                q: '¿Puedo cambiar el horario de una cita?',
                a: 'Por ahora debes cancelar la cita actual y crear una nueva. Pronto añadiremos la opción de reprogramar.',
              },
              {
                q: '¿Qué pasa si el negocio cancela?',
                a: 'Recibirás una notificación de inmediato y podrás reservar en otro horario.',
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
            <Text style={styles.modalTitle}>Acerca de Barberly</Text>
            <View style={{ width: 38 }} />
          </View>
          <ScrollView contentContainerStyle={[styles.modalBody, styles.aboutBody]} showsVerticalScrollIndicator={false}>
            <View style={styles.aboutLogo}>
              <Ionicons name="sparkles" size={44} color={Colors.white} />
            </View>
            <Text style={styles.aboutAppName}>Barberly</Text>
            <Text style={styles.aboutVersion}>Versión 1.0.0</Text>
            <Text style={styles.aboutTagline}>Tu turno, a un toque de distancia.</Text>

            <View style={styles.aboutDivider} />

            <Text style={styles.aboutDesc}>
              Barberly conecta clientes con las mejores barberías de su ciudad de forma rápida, sencilla y sin llamadas.
              Reserva, gestiona y confirma citas en segundos.
            </Text>

            {[
              { icon: 'flash-outline', label: 'Reservas en segundos' },
              { icon: 'notifications-outline', label: 'Confirmaciones en tiempo real' },
              { icon: 'map-outline', label: 'Barberías cerca de ti' },
              { icon: 'star-outline', label: 'Sin colas ni esperas' },
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

            <Text style={styles.aboutCopy}>© 2026 Barberly. Todos los derechos reservados.</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    alignItems: 'center',
    paddingTop: 24, paddingBottom: 28, paddingHorizontal: 24,
  },
  avatarWrap: {
    position: 'relative', marginBottom: 14,
  },
  avatar: {
    width: 78, height: 78, borderRadius: 24,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarPhoto: {
    width: 78, height: 78, borderRadius: 24,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarCameraBtn: {
    position: 'absolute', bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primary,
    borderWidth: 2, borderColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  name: { fontSize: 20, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginTop: 10,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: 16,
    marginTop: 16, borderRadius: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statNextDay: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 1 },
  statNextDate: { fontSize: 18, fontWeight: '800', color: Colors.primary, letterSpacing: -0.3 },
  statNextTime: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 1 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  settingsCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
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
  privacySection: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 8,
  },
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
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
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
