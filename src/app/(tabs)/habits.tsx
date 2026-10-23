import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from 'date-fns';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, Button, Card, EmptyState, PageHeading, ReminderRow, SectionHeading } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { localDateKey } from '../../domain/dates';
import { calculateBestStreak, calculateCurrentStreak } from '../../domain/streaks';
import { usePalette } from '../../theme';
import type { ReminderItem } from '../../domain/types';

export default function HabitsScreen() {
  const colors = usePalette();
  const { items, completions, markDone } = useApp();
  const habits = items.filter((item) => item.kind === 'habit' && !item.archived);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = localDateKey();
  const selected = habits.find((item) => item.id === selectedId) ?? habits[0];
  const completedDates = selected ? completions[selected.id] ?? [] : [];
  const completedSet = new Set(completedDates);
  const calendarDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const blankCells = getDay(startOfMonth(month));
  const current = selected ? calculateCurrentStreak(completedDates, today) : 0;
  const best = selected ? calculateBestStreak(completedDates) : 0;
  const selectedDoneToday = selected ? completedSet.has(today) : false;

  return <AppScreen>
    <PageHeading title="Habits" subtitle="Build a rhythm, one day at a time." action={<Button title="Add" icon="add" compact onPress={() => router.push('/item/new')} />} />
    {habits.length === 0 ? <EmptyState title="Start a gentle routine" body="Add a daily habit and Remindly will keep your streak history here." action={<Button title="Add a habit" icon="add" onPress={() => router.push('/item/new')} />} /> : <>
      <SectionHeading title="Your habits" count={habits.length} />
      <Card style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
        {habits.map((habit: ReminderItem) => <View key={habit.id}>
          <ReminderRow item={habit} completed={(completions[habit.id] ?? []).includes(today)} onToggle={() => void markDone(habit.id, !(completions[habit.id] ?? []).includes(today))} onOpen={() => setSelectedId(habit.id)} />
          <Pressable onPress={() => router.push(`/item/${habit.id}`)} style={{ alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 8, marginBottom: 5 }}><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Edit habit</Text></Pressable>
        </View>)}
      </Card>
      {selected ? <>
        <SectionHeading title="Streak & history" />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Selected habit</Text><Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 3 }}>{selected.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Mark selected habit done" onPress={() => void markDone(selected.id, !selectedDoneToday)} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: selectedDoneToday ? colors.primary : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={selectedDoneToday ? 'checkmark' : 'checkmark-outline'} size={21} color={selectedDoneToday ? '#fff' : colors.primary} /></Pressable></View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, padding: 14, borderRadius: 15, backgroundColor: colors.primarySoft }}><Text style={{ color: colors.muted, fontSize: 11 }}>CURRENT STREAK</Text><Text style={{ color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 }}>{current}<Text style={{ fontSize: 13, fontWeight: '600' }}> days</Text></Text></View>
            <View style={{ flex: 1, padding: 14, borderRadius: 15, backgroundColor: colors.surfaceAlt }}><Text style={{ color: colors.muted, fontSize: 11 }}>BEST STREAK</Text><Text style={{ color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 3 }}>{best}<Text style={{ fontSize: 13, fontWeight: '600' }}> days</Text></Text></View>
          </View>
        </Card>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Pressable onPress={() => setMonth((value) => addMonths(value, -1))} hitSlop={8} style={{ padding: 6 }}><Ionicons name="chevron-back" size={20} color={colors.primary} /></Pressable><Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{format(month, 'MMMM yyyy')}</Text><Pressable onPress={() => setMonth((value) => addMonths(value, 1))} hitSlop={8} style={{ padding: 6 }}><Ionicons name="chevron-forward" size={20} color={colors.primary} /></Pressable></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 7 }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={{ width: 34, textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700' }}>{day}</Text>)}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {Array.from({ length: blankCells }, (_, index) => <View key={`blank-${index}`} style={{ width: '14.2857%', height: 39 }} />)}
            {calendarDays.map((date) => {
              const key = localDateKey(date);
              const completed = completedSet.has(key);
              const isToday = key === today;
              return <View key={key} style={{ width: '14.2857%', height: 39, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: completed ? colors.primary : 'transparent', borderWidth: isToday && !completed ? 1 : 0, borderColor: colors.accent }}><Text style={{ color: completed ? '#fff' : colors.text, fontSize: 12, fontWeight: isToday ? '800' : '500' }}>{format(date, 'd')}</Text></View></View>;
            })}
          </View>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>Filled days are complete · outlined day is today</Text>
        </Card>
      </> : null}
    </>}
  </AppScreen>;
}
