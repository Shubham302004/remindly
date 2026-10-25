import React, { useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, Button, Card, FieldLabel, PageHeading, TextField } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { formatTime, formatTimeDisplay, localDateFromKey, localDateKey } from '../../domain/dates';
import type { ItemKind, ReminderItem } from '../../domain/types';
import { usePalette } from '../../theme';

const KIND_OPTIONS: { value: ItemKind; title: string; detail: string }[] = [
  { value: 'habit', title: 'Habit', detail: 'Repeats every day and builds a streak.' },
  { value: 'daily', title: 'Daily task', detail: 'A task that becomes pending again tomorrow.' },
  { value: 'permanent', title: 'Permanent task', detail: 'Stays pending each day until completed once.' },
];

export default function EditItemScreen() {
  const colors = usePalette();
  const { id: routeId, kind: routeKind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const { items, saveItem, deleteItem } = useApp();
  const existing = items.find((item) => item.id === id);
  const isNew = id === 'new';
  const requestedKind = Array.isArray(routeKind) ? routeKind[0] : routeKind;
  const initialKind = KIND_OPTIONS.some((option) => option.value === requestedKind) ? requestedKind as ItemKind : 'daily';
  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [kind, setKind] = useState<ItemKind>(existing?.kind ?? initialKind);
  const [times, setTimes] = useState<string[]>(existing?.reminderTimes ?? []);
  const [dueDate, setDueDate] = useState<string | null>(existing?.dueDate ?? null);
  const [picker, setPicker] = useState<'time' | 'date' | null>(null);
  const [timeDraft, setTimeDraft] = useState(() => new Date());
  const [saving, setSaving] = useState(false);

  const selectedPickerDate = useMemo(() => {
    if (picker === 'date' && dueDate) return localDateFromKey(dueDate);
    if (picker === 'time') return timeDraft;
    return new Date();
  }, [picker, dueDate, timeDraft]);

  const startTimePicker = (index: number) => {
    const existingTime = times[index];
    const date = new Date();
    if (existingTime) {
      const [hours, minutes] = existingTime.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    setTimeDraft(date);
    setPicker('time');
  };
  const addTime = () => startTimePicker(times.length);
  const saveTime = (date?: Date) => {
    setPicker(null);
    if (!date) return;
    const value = formatTime(date);
    setTimes((old) => [...new Set([...old, value])].sort());
  };

  const closeEditor = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/today'); };

  const onSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) { Alert.alert('Add a title', 'Give this habit or task a short name first.'); return; }
    setSaving(true);
    try {
      const item: ReminderItem = {
        id: isNew ? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` : id,
        title: cleanTitle,
        notes: notes.trim(),
        kind,
        reminderTimes: [...new Set(times)].sort(),
        dueDate: kind === 'habit' ? null : dueDate,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        archived: false,
      };
      await saveItem(item);
      closeEditor();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  const deleteLabel = kind === 'habit' ? 'habit' : 'task';
  const askDelete = () => Alert.alert(`Delete this ${deleteLabel}?`, 'This permanently removes the item and its completion history from this phone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: `Delete ${deleteLabel}`, style: 'destructive', onPress: () => { void deleteItem(id).then(() => closeEditor()).catch((error) => Alert.alert('Could not delete', error instanceof Error ? error.message : 'Please try again.')); } },
  ]);

  return <AppScreen>
    <PageHeading title={isNew ? 'New item' : 'Edit item'} subtitle="Make it easy to remember, and easy to keep up." action={<View style={{ flexDirection: 'row', alignItems: 'center' }}><Pressable onPress={closeEditor} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6} style={{ width: 40, height: 42, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" size={25} color={colors.muted} /></Pressable><Pressable onPress={closeEditor} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 40, height: 42, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={23} color={colors.muted} /></Pressable></View>} />
    {!isNew && !existing ? <Card><Text style={{ color: colors.text }}>This item could not be found.</Text></Card> : <>
      <View><FieldLabel>Title</FieldLabel><TextField value={title} onChangeText={setTitle} placeholder="e.g. Take a short walk" autoFocus={isNew} /></View>
      <View><FieldLabel>Type</FieldLabel><View style={{ gap: 10 }}>{KIND_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => setKind(option.value)} style={{ padding: 15, borderRadius: 15, borderWidth: 1, borderColor: kind === option.value ? colors.primary : colors.border, backgroundColor: kind === option.value ? colors.primarySoft : colors.surface }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{option.title}</Text><Text style={{ color: colors.muted, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}>{option.detail}</Text></Pressable>)}</View></View>
      <View><FieldLabel hint="Add a time if you want a reminder; no time is preselected.">Reminder times</FieldLabel><View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{times.map((time, index) => <View key={time} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 50, backgroundColor: colors.primarySoft, paddingLeft: 13, paddingRight: 5, paddingVertical: 5 }}><Pressable onPress={() => startTimePicker(index)}><Text style={{ color: colors.primary, fontWeight: '700', paddingVertical: 4 }}>{formatTimeDisplay(time)}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${formatTimeDisplay(time)}`} onPress={() => setTimes((old) => old.filter((_, i) => i !== index))} style={{ padding: 4 }}><Ionicons name="close-circle" size={17} color={colors.muted} /></Pressable></View>)}<Pressable onPress={addTime} style={{ borderRadius: 50, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, paddingHorizontal: 13, paddingVertical: 9 }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Add time</Text></Pressable>{times.length === 0 ? <Text style={{ color: colors.muted, fontSize: 12 }}>No reminder time selected</Text> : null}</View></View>
      {kind !== 'habit' ? <View><FieldLabel hint="If it passes, this task stays overdue and keeps reminding you.">Due date · optional</FieldLabel><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Pressable onPress={() => setPicker('date')} style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ color: dueDate ? colors.text : colors.muted, fontSize: 14 }}>{dueDate ?? 'No due date'}</Text></Pressable>{dueDate ? <Pressable onPress={() => setDueDate(null)} style={{ padding: 8 }}><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable> : null}</View></View> : null}
      <View><FieldLabel>Notes · optional</FieldLabel><TextField value={notes} onChangeText={setNotes} placeholder="Add a little context for later" multiline /></View>
      <Button title={saving ? 'Saving…' : 'Save item'} icon="checkmark" onPress={() => void onSave()} disabled={saving} />
      {!isNew ? <Button title={`Delete ${deleteLabel}`} icon="trash-outline" tone="danger" onPress={askDelete} /> : null}
    </>}
    {picker === 'time' && Platform.OS === 'android' ? <DateTimePicker value={selectedPickerDate} mode="time" display="default" is24Hour={false} onChange={(event, date) => {
      if (event.type === 'set' && date) saveTime(date);
      else setPicker(null);
    }} /> : null}
    {picker === 'time' && Platform.OS === 'ios' ? <Modal visible transparent animationType="fade" onRequestClose={() => setPicker(null)}>
      <View style={{ flex: 1, backgroundColor: '#0009', justifyContent: 'center', padding: 22 }}><Card style={{ width: '100%', maxWidth: 380, alignSelf: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>Choose reminder time</Text>
        <DateTimePicker value={timeDraft} mode="time" display="spinner" is24Hour={false} locale="en_US" themeVariant="dark" onValueChange={(_event, date) => setTimeDraft(date)} />
        <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button title="Cancel" tone="quiet" onPress={() => setPicker(null)} /></View><View style={{ flex: 1 }}><Button title="Save time" onPress={() => saveTime(timeDraft)} /></View></View>
      </Card></View>
    </Modal> : null}
    {picker === 'date' ? <DateTimePicker value={selectedPickerDate} mode="date" display="default" onChange={(event, date) => {
      setPicker(null);
      if (event.type === 'set' && date) setDueDate(localDateKey(date));
    }} /> : null}
  </AppScreen>;
}
