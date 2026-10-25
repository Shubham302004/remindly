import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProvider, useApp } from '../context/AppContext';
import { usePalette } from '../theme';
import '../services/backgroundRefresh';

function NavigationShell() {
  const router = useRouter();
  const { ready, settings } = useApp();
  const onboardingComplete = settings.onboardingComplete;
  const colors = usePalette();
  useEffect(() => {
    let disposed = false;
    const openTarget = (response: Notifications.NotificationResponse) => {
      if (disposed || !onboardingComplete) return;
      const data = response.notification.request.content.data as { itemIds?: unknown };
      const itemIds = Array.isArray(data.itemIds) ? data.itemIds : [];
      if (itemIds.length > 0) router.push(`/item/${String(itemIds[0])}`);
      else router.push('/(tabs)/today');
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openTarget);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openTarget(response); });
    return () => { disposed = true; subscription.remove(); };
  }, [router, ready, onboardingComplete]);
  return <><StatusBar style="light" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="onboarding" />
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="item/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
  </Stack></>;
}

export default function RootLayout() {
  return <AppProvider><NavigationShell /></AppProvider>;
}
