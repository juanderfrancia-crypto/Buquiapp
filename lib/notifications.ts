import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

if (Device.isDevice) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId
  );
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const projectId = getProjectId();
    if (!projectId) return; // sin EAS configurado, no hay push token en Expo Go

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Barberly',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2F6BFF',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('users').update({ push_token: token }).eq('id', userId);
  } catch {
    // Nunca romper el flujo por fallos de notificación
  }
}

export async function notifyBarber(
  barbershopId: string,
  clientName: string,
  serviceName: string,
  dateStr: string,
  time: string
): Promise<void> {
  try {
    const { data: shop } = await supabase
      .from('barbershops').select('owner_id').eq('id', barbershopId).single();
    if (!shop) return;

    const { data: barber } = await supabase
      .from('users').select('push_token').eq('id', shop.owner_id).single();
    if (!barber?.push_token) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: barber.push_token,
        title: '¡Nueva reserva!',
        body: `${clientName} reservó ${serviceName} para el ${dateStr} a las ${time}`,
        sound: 'default',
        data: { barbershopId },
      }),
    });
  } catch {
    // Nunca romper el flujo de reserva por fallos de notificación
  }
}
