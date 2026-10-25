import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../../theme';

const icons = {
  today: ['today-outline', 'today'],
  habits: ['flame-outline', 'flame'],
  tasks: ['checkbox-outline', 'checkbox'],
  settings: ['settings-outline', 'settings'],
} satisfies Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]>;

interface PaletteColors {
  primary: string;
  muted: string;
}

function tabIcon(pair: typeof icons[keyof typeof icons], colors: PaletteColors) {
  const Icon = ({ size, focused }: { size: number; focused: boolean }) =>
    <Ionicons name={focused ? pair[1] : pair[0]} size={size} color={focused ? colors.primary : colors.muted} />;
  Icon.displayName = 'TabIcon';
  return Icon;
}

export default function TabLayout() {
  const colors = usePalette();
  return <Tabs backBehavior="history" detachInactiveScreens={false} screenOptions={{
    headerShown: false,
    freezeOnBlur: true,
    lazy: false,
    animation: 'none',
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.border, height: 62, paddingTop: 7, paddingBottom: 5 },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
  }}>
    <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: tabIcon(icons.today, colors) }} />
    <Tabs.Screen name="habits" options={{ title: 'Habits', tabBarIcon: tabIcon(icons.habits, colors) }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: tabIcon(icons.tasks, colors) }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: tabIcon(icons.settings, colors) }} />
  </Tabs>;
}
