import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, Button, Card, FieldLabel, PageHeading, TextField } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { formatTime, localDateFromKey, localDateKey } from '../../domain/dates';
import type { ItemKind, ReminderItem } from '../../domain/types';
import { usePalette } from '../../theme';

const KIND_OPTIONS: { value: ItemKind; title: string; detail: string }[] = [
  { value: 'habit', title: 'Habit', detail: 'Repeats every day and builds a streak.' },
  { value: 'daily', title: 'Daily task', detail: 'A task that becomes pending again tomorrow.' },
  { value: 'permanent', title: 'Permanent task', detail: 'Stays pending each day until completed once.' },
];

export default function EditItemScreen() {
  const colors = usePalette();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const { items, saveItem, archiveItem } = useApp();
  const existing = items.find((item) => item.id === id);
  const isNew = id === 'new';
  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [kind, setKind] = useState<ItemKind>(existing?.kind ?? 'daily');
  const [times, setTimes] = useState<string[]>(existing?.reminderTimes ?? ['08:00']);
  const [dueDate, setDueDate] = useState<string | null>(existing?.dueDate ?? null);
  const [picker, setPicker] = useState<'time' | 'date' | null>(null);
  const [pickerForIndex, setPickerForIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const selectedPickerDate = useMemo(() => {
    if (picker === 'date' && dueDate) return localDateFromKey(dueDate);
    if (picker === 'time' && times[pickerForIndex]) {
      const [hours, minutes] = times[pickerForIndex].split(':').map(Number);
      const date = new Date(); date.setHours(hours, minutes, 0, 0); return date;
    }
    return new Date();
  }, [picker, dueDate, times, pickerForIndex]);

  const addTime = () => { setPickerForIndex(times.length); setPicker('time'); };
  const saveTime = (date?: Date) => {
    setPicker(null);
    if (!date) return;
    const value = formatTime(date);
    setTimes((old) => [...new Set([...old, value])].sort());
  };

  const onSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) { Alert.alert('Add a title', 'Give this habit or task a short name first.'); return; }
    if (times.length === 0) { Alert.alert('Choose a reminder time', 'Add at least one time of day for this item.'); return; }
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
      router.back();
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  const askArchive = () => Alert.alert('Archive this item?', 'It will stop appearing in your lists and reminders.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Archive', style: 'destructive', onPress: () => { void archiveItem(id).then(() => router.back()); } },
  ]);

  return <AppScreen>
    <PageHeading title={isNew ? 'New item' : 'Edit item'} subtitle="Make it easy to remember, and easy to keep up." action={<Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={23} color={colors.muted} /></Pressable>} />
    {!isNew && !existing ? <Card><Text style={{ color: colors.text }}>This item could not be found.</Text></Card> : <>
      <View><FieldLabel>Title</FieldLabel><TextField value={title} onChangeText={setTitle} placeholder="e.g. Take a short walk" autoFocus={isNew} /></View>
      <View><FieldLabel>Type</FieldLabel><View style={{ gap: 8 }}>{KIND_OPTIONS.map((option) => <Pressable key={option.value} onPress={() => setKind(option.value)} style={{ padding: 13, borderRadius: 15, borderWidth: 1, borderColor: kind === option.value ? colors.primary : colors.border, backgroundColor: kind === option.value ? colors.primarySoft : colors.surface }}><Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{option.title}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{option.detail}</Text></Pressable>)}</View></View>
      <View><FieldLabel hint="Reminders repeat until you complete this item or the day ends.">Reminder times</FieldLabel><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{times.map((time, index) => <View key={time} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 50, backgroundColor: colors.primarySoft, paddingLeft: 13, paddingRight: times.length > 1 ? 5 : 13, paddingVertical: 5 }}><Pressable onPress={() => { setPickerForIndex(index); setPicker('time'); }}><Text style={{ color: colors.primary, fontWeight: '700', paddingVertical: 4 }}>{time}</Text></Pressable>{times.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${time}`} onPress={() => setTimes((old) => old.filter((_, i) => i !== index))} style={{ padding: 4 }}><Ionicons name="close-circle" size={17} color={colors.muted} /></Pressable> : null}</View>)}<Pressable onPress={addTime} style={{ borderRadius: 50, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, paddingHorizontal: 13, paddingVertical: 9 }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>+ Add time</Text></Pressable></View></View>
      {kind !== 'habit' ? <View><FieldLabel hint="If it passes, this task stays overdue and keeps reminding you.">Due date · optional</FieldLabel><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Pressable onPress={() => setPicker('date')} style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface, paddingHorizontal: 14, justifyContent: 'center' }}><Text style={{ color: dueDate ? colors.text : colors.muted, fontSize: 14 }}>{dueDate ?? 'No due date'}</Text></Pressable>{dueDate ? <Pressable onPress={() => setDueDate(null)} style={{ padding: 8 }}><Ionicons name="close-circle" size={22} color={colors.muted} /></Pressable> : null}</View></View> : null}
      <View><FieldLabel>Notes · optional</FieldLabel><TextField value={notes} onChangeText={setNotes} placeholder="Add a little context for later" multiline /></View>
      <Button title={saving ? 'Saving…' : 'Save item'} icon="checkmark" onPress={() => void onSave()} disabled={saving} />
      {!isNew ? <Button title="Archive item" icon="archive-outline" tone="quiet" onPress={askArchive} /> : null}
    </>}
    {picker ? <DateTimePicker value={selectedPickerDate} mode={picker} display="default" onChange={(_event, date) => {
      if (picker === 'time') saveTime(date);
      else { setPicker(null); if (date) setDueDate(localDateKey(date)); }
    }} /> : null}
  </AppScreen>;
}
