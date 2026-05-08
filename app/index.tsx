import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants';

const ONBOARDING_KEY = '@barberly:onboarding_done';

export default function Index() {
  const { session, user, loading } = useAuthStore();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
      setCheckingOnboarding(false);
    });
  }, []);

  useEffect(() => {
    if (loading || checkingOnboarding) return;

    if (!onboardingDone) {
      router.replace('/onboarding');
      return;
    }

    if (!session) {
      router.replace('/auth/login');
    } else if (user?.role === 'barber') {
      router.replace('/barber/dashboard');
    } else {
      router.replace('/client/home');
    }
  }, [session, user, loading, checkingOnboarding, onboardingDone]);

  return <View style={{ flex: 1, backgroundColor: Colors.white }} />;
}
