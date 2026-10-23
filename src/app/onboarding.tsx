import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { AppScreen, Button, Card, PageHeading } from '../components/ui';
import { useApp } from '../context/AppContext';
import { getReminderPermissionStatus, requestExactAlarmPermission, requestNotificationPermission } from '../services/notifications';
import { usePalette } from '../theme';

interface PermissionStepProps {
  title: string;
  detail: string;
  done?: boolean;
  onPress?: () => void;
  button?: string;
  working?: boolean;
}

function PermissionStep({ title, detail, done = false, onPress, button, working = false }: PermissionStepProps) {
  const colors = usePalette();
  return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
    <View style={{ width: 27, height: 27, borderRadius: 10, backgroundColor: done ? colors.primary : colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}><Ionicons name={done ? 'checkmark' : 'ellipse-outline'} size={16} color={done ? '#fff' : colors.primary} /></View>
    <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{detail}</Text>{onPress && button ? <Pressable onPress={onPress} disabled={working} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>{button}</Text></Pressable> : null}</View>
  </View>;
}

export default function OnboardingScreen() {
  const colors = usePalette();
  const { updateSettings } = useApp();
  const [permissions, setPermissions] = useState({ notifications: false, exactAlarms: Platform.OS !== 'android' });
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => { setPermissions(await getReminderPermissionStatus()); }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [refresh]);

  const allowReminders = async () => {
    setWorking(true);
    try { await requestNotificationPermission(); await refresh(); }
    finally { setWorking(false); }
  };
  const allowExact = async () => {
    setWorking(true);
    try { await requestExactAlarmPermission(); await refresh(); }
    catch { await refresh(); }
    finally { setWorking(false); }
  };
  const openBatterySettings = async () => {
    try { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS); }
    catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS); }
  };
  const finish = async () => { await updateSettings({ onboardingComplete: true }); router.replace('/(tabs)/today'); };

  return <AppScreen>
    <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 4 }}><View style={{ width: 66, height: 66, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="leaf" size={30} color={colors.primary} /></View></View>
    <PageHeading title="Let reminders reach you" subtitle="A quick setup helps Remindly stay dependable, even when the app is closed." />
    <Card>
      <PermissionStep title="Allow notifications" detail="Remindly uses on-device notifications only. It never sends your reminders to a server." done={permissions.notifications} onPress={() => void allowReminders()} button={permissions.notifications ? 'Allowed' : 'Allow notifications'} working={working} />
      {Platform.OS === 'android' ? <PermissionStep title="Allow exact alarms" detail="Android uses this access to deliver scheduled reminders closer to their chosen times." done={permissions.exactAlarms} onPress={() => void allowExact()} button={permissions.exactAlarms ? 'Allowed' : 'Open exact-alarm settings'} working={working} /> : null}
      {Platform.OS === 'android' ? <PermissionStep title="Review battery optimization" detail="Some phone makers delay reminders to save battery. Exempting Remindly can improve delivery; the setting is optional and you control it." onPress={() => void openBatterySettings()} button="Open battery settings" working={working} /> : null}
    </Card>
    <Card style={{ backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Your data stays on this phone</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>Habits, tasks, and completion history are stored locally. Remindly works offline.</Text>
    </Card>
    <Button title="Continue to Remindly" icon="arrow-forward" onPress={() => void finish()} />
    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' }}>You can change notification access later in Android Settings. Android may still delay alarms under device power-saving policies.</Text>
  </AppScreen>;
}
