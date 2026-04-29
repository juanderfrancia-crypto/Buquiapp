import { useEffect } from 'react';
import { router } from 'expo-router';

export default function BarberDashboardRedirect() {
  useEffect(() => { router.replace('/barber/dashboard'); }, []);
  return null;
}
