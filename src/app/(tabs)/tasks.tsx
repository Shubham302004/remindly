import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AppScreen, Button, Card, ChoiceChip, EmptyState, PageHeading, ReminderRow } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { localDateKey } from '../../domain/dates';
import type { ReminderItem } from '../../domain/types';

type Filter = 'Pending' | 'Overdue' | 'Completed';

export default function TasksScreen() {
  const { items, completions, markDone } = useApp();
  const [filter, setFilter] = useState<Filter>('Pending');
  const today = localDateKey();
  const tasks = items.filter((item) => item.kind !== 'habit' && !item.archived);
  const completedToday = useMemo(() => new Set(tasks.filter((item) => (completions[item.id] ?? []).includes(today)).map((item) => item.id)), [tasks, completions, today]);
  const filtered = tasks.filter((item) => {
    const dates = completions[item.id] ?? [];
    const isCompleted = item.kind === 'permanent' ? dates.length > 0 : completedToday.has(item.id);
    const isOverdue = !isCompleted && Boolean(item.dueDate && item.dueDate < today);
    if (filter === 'Completed') return isCompleted;
    if (filter === 'Overdue') return isOverdue;
    return !isCompleted && !isOverdue;
  });

  return <AppScreen>
    <PageHeading title="Tasks" subtitle="Keep one-off and daily tasks in view." action={<Button title="Add" icon="add" compact onPress={() => router.push('/item/new')} />} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['Pending', 'Overdue', 'Completed'] as Filter[]).map((value) => <ChoiceChip key={value} title={value} selected={filter === value} onPress={() => setFilter(value)} />)}
    </View>
    {filtered.length === 0 ? <EmptyState title={filter === 'Completed' ? 'Nothing completed yet' : filter === 'Overdue' ? 'No overdue tasks' : 'All clear for now'} body={filter === 'Pending' ? 'Add a daily or permanent task and choose when you want a reminder.' : 'Items in this view will show up here when they match.'} action={filter === 'Pending' ? <Button title="Add a task" icon="add" onPress={() => router.push('/item/new')} /> : undefined} /> : <Card style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
      {filtered.map((item: ReminderItem) => {
        const completed = item.kind === 'permanent' ? (completions[item.id] ?? []).length > 0 : completedToday.has(item.id);
        return <ReminderRow key={item.id} item={item} completed={completed} overdue={!completed && Boolean(item.dueDate && item.dueDate < today)} onToggle={() => void markDone(item.id, !completed)} onOpen={() => router.push(`/item/${item.id}`)} />;
      })}
    </Card>}
    {filter === 'Pending' && filtered.length > 0 ? <View><Button title="Add another task" tone="secondary" icon="add" onPress={() => router.push('/item/new')} /></View> : null}
  </AppScreen>;
}
