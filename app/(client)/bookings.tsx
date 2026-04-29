import { useEffect } from 'react';
import { router } from 'expo-router';

export default function BookingsRedirect() {
  useEffect(() => { router.replace('/client/bookings'); }, []);
  return null;
}
