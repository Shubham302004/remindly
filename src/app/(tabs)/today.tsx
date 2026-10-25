import React, { useCallback } from 'react';
import { LayoutAnimation, Platform, Text, UIManager, View } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { AppScreen, Button, Card, EmptyState, PageHeading, ReminderRow, SectionHeading } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { localDateKey } from '../../domain/dates';
import { usePalette } from '../../theme';
import type { ReminderItem } from '../../domain/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Group({ title, items, doneIds, today, onDone, onOpen }: {
  title: string; items: ReminderItem[]; doneIds: Set<string>; today: string; onDone: (item: ReminderItem, completed: boolean) => void; onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return <View style={{ gap: 7 }}><SectionHeading title={title} count={items.length} /><Card style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
    {items.map((item) => <ReminderRow key={item.id} item={item} completed={doneIds.has(item.id)} overdue={Boolean(item.kind !== 'habit' && item.dueDate && item.dueDate < today)} onToggle={() => onDone(item, !doneIds.has(item.id))} onOpen={() => onOpen(item.id)} />)}
  </Card></View>;
}

export default function TodayScreen() {
  const colors = usePalette();
  const { items, completions, markDone } = useApp();
  const today = localDateKey();
  const active = items.filter((item) => !item.archived);
  const doneIds = new Set(active.filter((item) => (completions[item.id] ?? []).includes(today)).map((item) => item.id));

  const dueTodayItems = active.filter((item) => {
    const completedDates = completions[item.id] ?? [];
    if (item.kind === 'habit') return true;
    if (item.kind === 'daily') return !item.dueDate || item.dueDate <= today;
    // Permanent tasks: pending if no due date or due date reached, until completed once
    return (!item.dueDate || item.dueDate <= today) && (completedDates.length === 0 || completedDates.includes(today));
  });

  const doneToday = dueTodayItems.filter((item) => doneIds.has(item.id));
  const pending = dueTodayItems.filter((item) => item.kind === 'permanent' ? (completions[item.id] ?? []).length === 0 : !doneIds.has(item.id));
  const overdue = pending.filter((item) => item.kind !== 'habit' && Boolean(item.dueDate && item.dueDate < today));
  const dueToday = pending.filter((item) => item.kind !== 'habit' && item.dueDate === today);
  const habits = pending.filter((item) => item.kind === 'habit');
  const tasks = pending.filter((item) => item.kind !== 'habit' && !item.dueDate);
  const total = dueTodayItems.length;
  const doneCount = doneToday.length;
  const progress = total ? Math.min(1, doneCount / total) : 1;

  const handleToggle = useCallback((item: ReminderItem, completed: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void markDone(item.id, completed);
  }, [markDone]);

  return <AppScreen>
    <PageHeading title="Today" subtitle={format(new Date(), 'EEEE, MMMM d')} action={<Button title="Add" icon="add" compact onPress={() => router.push({ pathname: '/item/new', params: { kind: 'daily' } })} />} />
    <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primarySoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Your day, at a glance</Text><Text style={{ color: colors.primary, fontSize: 13, fontWeight: '800' }}>{doneCount}/{total} done</Text></View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: doneCount }}
        style={{ height: 9, borderRadius: 10, backgroundColor: colors.surface, overflow: 'hidden' }}
      >
        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 10 }} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{total === 0 ? 'Add a habit or task to begin.' : progress === 1 ? 'You’re all caught up for today.' : 'Small steps count. Keep going at your pace.'}</Text>
    </Card>
    {pending.length === 0 && doneToday.length === 0 ? <EmptyState title="A clear day" body="Nothing is waiting for you yet. Add one small habit or task to get started." action={<Button title="Add your first item" icon="add" onPress={() => router.push({ pathname: '/item/new', params: { kind: 'daily' } })} />} /> : null}
    <Group title="Overdue" items={overdue} doneIds={doneIds} today={today} onDone={handleToggle} onOpen={(id) => router.push(`/item/${id}`)} />
    <Group title="Due today" items={dueToday} doneIds={doneIds} today={today} onDone={handleToggle} onOpen={(id) => router.push(`/item/${id}`)} />
    <Group title="Habits" items={habits} doneIds={doneIds} today={today} onDone={handleToggle} onOpen={(id) => router.push(`/item/${id}`)} />
    <Group title="Tasks" items={tasks} doneIds={doneIds} today={today} onDone={handleToggle} onOpen={(id) => router.push(`/item/${id}`)} />
    <Group title="Done today" items={doneToday} doneIds={doneIds} today={today} onDone={handleToggle} onOpen={(id) => router.push(`/item/${id}`)} />
  </AppScreen>;
}
