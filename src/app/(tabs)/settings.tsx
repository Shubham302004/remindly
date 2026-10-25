import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { AppScreen, Button, Card, ChoiceChip, FieldLabel, PageHeading } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { createBackup, isBackupData } from '../../db/database';
import { formatTime, formatTimeDisplay } from '../../domain/dates';
import { getLastScheduleReport, getReminderPermissionStatus, requestExactAlarmPermission, requestNotificationPermission, scheduleTestNotification } from '../../services/notifications';
import { usePalette } from '../../theme';

const PRESETS = [5, 10, 15, 30, 60];

export default function SettingsScreen() {
  const colors = usePalette();
  const { settings, updateSettings, importBackup } = useApp();
  const [permissions, setPermissions] = useState({ notifications: false, exactAlarms: false });
  const [picker, setPicker] = useState<'start' | 'end' | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState(String(settings.nagIntervalMinutes));
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(getLastScheduleReport);

  const refresh = useCallback(async () => {
    setPermissions(await getReminderPermissionStatus());
    setReport(getLastScheduleReport());
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [refresh]);

  const setNagInterval = async (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 720) { Alert.alert('Invalid interval', 'Choose Off or an interval from 1 to 720 minutes.'); return; }
    await updateSettings({ nagIntervalMinutes: Math.round(minutes) });
  };

  const askPermission = async () => { await requestNotificationPermission(); await refresh(); };
  const askExact = async () => { try { await requestExactAlarmPermission(); } catch { Alert.alert('Exact alarms', 'Open Android Settings and allow Alarms & reminders for Remindly.'); } await refresh(); };
  const openBatterySettings = async () => {
    try { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS); }
    catch { await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS); }
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const backup = await createBackup();
      const file = new File(Paths.cache, `remindly-backup-${new Date().toISOString().slice(0, 10)}.json`);
      await file.write(JSON.stringify(backup, null, 2));
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Remindly backup' });
    } catch (error) { Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true, multiple: false });
      if (picked.canceled || !picked.assets[0]) return;
      const text = await new File(picked.assets[0].uri).text();
      const parsed: unknown = JSON.parse(text);
      if (!isBackupData(parsed)) throw new Error('This file is not a supported Remindly backup.');
      Alert.alert('Replace local data?', 'Importing will replace the items and history currently stored on this phone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Import backup', onPress: () => { void importBackup(parsed).then(() => Alert.alert('Backup restored', 'Your local data has been restored.')).catch((error) => Alert.alert('Import failed', String(error))); } },
      ]);
    } catch (error) { Alert.alert('Import failed', error instanceof Error ? error.message : 'Please choose a valid backup file.'); }
    finally { setBusy(false); }
  };

  const timeValue = (key: 'start' | 'end') => {
    const value = settings.quietHours[key];
    const [hour, minute] = value.split(':').map(Number);
    const date = new Date(); date.setHours(hour, minute, 0, 0); return date;
  };

  return <AppScreen>
    <PageHeading title="Settings" subtitle="Shape reminders around your day." />
    <Card>
      <FieldLabel hint="If an item is still pending, Remindly repeats a nudge at this interval until the day ends.">Nag interval</FieldLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><ChoiceChip title="Off" selected={settings.nagIntervalMinutes === 0} onPress={() => void setNagInterval(0)} />{PRESETS.map((value) => <ChoiceChip key={value} title={`${value} min`} selected={settings.nagIntervalMinutes === value} onPress={() => void setNagInterval(value)} />)}<ChoiceChip title="Custom" selected={settings.nagIntervalMinutes > 0 && !PRESETS.includes(settings.nagIntervalMinutes)} onPress={() => { setCustomValue(String(settings.nagIntervalMinutes || 30)); setCustomOpen(true); }} /></View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Current: {settings.nagIntervalMinutes === 0 ? 'Off' : `every ${settings.nagIntervalMinutes} minutes`}</Text>
    </Card>
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flex: 1, paddingRight: 12 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Quiet hours</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>No reminders or nags are scheduled during this window.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: settings.quietHours.enabled }} onPress={() => void updateSettings({ quietHours: { ...settings.quietHours, enabled: !settings.quietHours.enabled } })} style={{ width: 48, height: 28, borderRadius: 20, padding: 3, backgroundColor: settings.quietHours.enabled ? colors.primary : colors.border, justifyContent: 'center' }}><View style={{ width: 22, height: 22, borderRadius: 12, backgroundColor: '#fff', alignSelf: settings.quietHours.enabled ? 'flex-end' : 'flex-start' }} /></Pressable></View>
      {settings.quietHours.enabled ? <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['start', 'end'] as const).map((key) => <Pressable key={key} onPress={() => setPicker(key)} style={{ flex: 1, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12 }}><Text style={{ color: colors.muted, fontSize: 11 }}>{key === 'start' ? 'STARTS' : 'ENDS'}</Text><Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 }}>{formatTimeDisplay(settings.quietHours[key])}</Text></Pressable>)}
      </View> : null}
    </Card>
    <Card>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Notification access</Text>
      <View style={{ gap: 10 }}>
        <StatusLine label="Notifications" value={permissions.notifications ? 'Allowed' : 'Not allowed'} good={permissions.notifications} />
        {Platform.OS === 'android' ? <StatusLine label="Exact alarms" value={permissions.exactAlarms ? 'Allowed' : 'Needs access'} good={permissions.exactAlarms} /> : null}
      </View>
      {!permissions.notifications ? <Button title="Allow notifications" icon="notifications-outline" onPress={() => void askPermission()} /> : null}
      {Platform.OS === 'android' && !permissions.exactAlarms ? <Button title="Enable exact alarms" icon="alarm-outline" tone="secondary" onPress={() => void askExact()} /> : null}
      {Platform.OS === 'android' ? <Button title="Battery optimization help" icon="battery-half-outline" tone="quiet" onPress={() => void openBatterySettings()} /> : null}
      <Button title="Send test notification" icon="paper-plane-outline" tone="secondary" onPress={() => void scheduleTestNotification().then(() => Alert.alert('Test scheduled', 'A local test reminder should arrive in about five seconds.')).catch((error) => Alert.alert('Could not schedule test', String(error)))} />
      {report.omitted > 0 ? <Text style={{ color: colors.danger, fontSize: 12, lineHeight: 18 }}>The current schedule reached its {report.limit}-notification queue budget; {report.omitted} later reminders await the next schedule refresh.</Text> : <Text style={{ color: colors.muted, fontSize: 11 }}>Scheduled locally: {report.scheduled} reminders across the next 24 hours. Android power policies may still delay delivery.</Text>}
    </Card>
    <Card>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Backup & restore</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Export a JSON copy for safekeeping or import a previous Remindly backup. Your data remains on this phone unless you choose where to save the file.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button title={busy ? 'Working…' : 'Export JSON'} icon="download-outline" tone="secondary" disabled={busy} onPress={() => void doExport()} /></View><View style={{ flex: 1 }}><Button title="Import JSON" icon="folder-open-outline" tone="quiet" disabled={busy} onPress={() => void doImport()} /></View></View>
    </Card>
    <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' }}>Remindly works offline. No account or cloud service is used by the app.</Text>
    {picker ? <DateTimePicker value={timeValue(picker)} mode="time" display="default" is24Hour={false} locale={Platform.OS === 'ios' ? 'en_US' : undefined} onChange={(_event, date) => {
      const key = picker; setPicker(null);
      if (_event.type === 'set' && date) void updateSettings({ quietHours: { ...settings.quietHours, [key]: formatTime(date) } });
    }} /> : null}
    <Modal visible={customOpen} transparent animationType="fade" onRequestClose={() => setCustomOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: 24 }}><Card style={{ width: '100%', maxWidth: 380 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Custom nag interval</Text><Text style={{ color: colors.muted, fontSize: 13 }}>Enter a whole number of minutes, from 1 to 720.</Text><TextInput value={customValue} onChangeText={setCustomValue} keyboardType="number-pad" selectTextOnFocus style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, borderRadius: 13, padding: 13, fontSize: 17 }} /><View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button title="Cancel" tone="quiet" onPress={() => setCustomOpen(false)} /></View><View style={{ flex: 1 }}><Button title="Save interval" onPress={() => { setCustomOpen(false); void setNagInterval(Number(customValue)); }} /></View></View></Card></View>
    </Modal>
  </AppScreen>;
}

function StatusLine({ label, value, good }: { label: string; value: string; good: boolean }) {
  const colors = usePalette();
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text><Text style={{ color: good ? colors.success : colors.accent, fontSize: 12, fontWeight: '700' }}>{value}</Text></View>;
}
