import { useEffect } from 'react';
import { router } from 'expo-router';

export default function ProfileRedirect() {
  useEffect(() => { router.replace('/client/profile'); }, []);
  return null;
}
