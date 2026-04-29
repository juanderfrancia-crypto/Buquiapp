import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';

export default function Index() {
  const { session, user, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth/login');
    } else if (user?.role === 'barber') {
      router.replace('/barber/dashboard');
    } else {
      router.replace('/client/home');
    }
  }, [session, user, loading]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
      <ActivityIndicator color={Colors.white} size="large" />
    </View>
  );
}
