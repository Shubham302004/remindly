import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../../theme';

export default function TabLayout() {
  const colors = usePalette();
  return <Tabs backBehavior="history" screenOptions={({ route }) => ({
    headerShown: false,
    freezeOnBlur: true,
    animation: 'none',
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.border, height: 62, paddingTop: 7, paddingBottom: 5 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    tabBarIcon: ({ color, size, focused }) => {
      const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
        today: ['today-outline', 'today'], habits: ['flame-outline', 'flame'], tasks: ['checkbox-outline', 'checkbox'], settings: ['settings-outline', 'settings'],
      };
      const pair = icons[route.name] ?? ['ellipse-outline', 'ellipse'];
      return <Ionicons name={focused ? pair[1] : pair[0]} size={size} color={focused ? colors.primary : colors.muted} />;
    },
  })}>
    <Tabs.Screen name="today" options={{ title: 'Today' }} />
    <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
  </Tabs>;
}
