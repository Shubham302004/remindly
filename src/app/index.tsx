import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { usePalette } from '../theme';

export default function IndexRoute() {
  const { ready, settings } = useApp();
  const colors = usePalette();
  if (!ready) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <Redirect href={settings.onboardingComplete ? '/(tabs)/today' : '/onboarding'} />;
}
