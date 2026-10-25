import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '../theme';
import { formatTimeDisplay } from '../domain/dates';
import type { ReminderItem } from '../domain/types';

export function AppScreen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const colors = usePalette();
  const insets = useSafeAreaInsets();
  const bottomPadding = styles.screenContent.paddingBottom + insets.bottom;
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {scroll ? <ScrollView contentContainerStyle={[styles.screenContent, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {children}
      </ScrollView> : <View style={[styles.screenContent, { paddingBottom: bottomPadding }]}>{children}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const colors = usePalette();
  return <View style={styles.headingRow}><View style={{ flex: 1 }}><Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>{action}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = usePalette();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function Button({ title, onPress, tone = 'primary', icon, disabled = false, compact = false }: {
  title: string; onPress: () => void; tone?: 'primary' | 'secondary' | 'quiet' | 'danger'; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; compact?: boolean;
}) {
  const colors = usePalette();
  const background = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.dangerSoft : tone === 'secondary' ? colors.primarySoft : 'transparent';
  const foreground = tone === 'primary' ? '#fff' : tone === 'danger' ? colors.danger : colors.primary;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.76 : 1, paddingVertical: compact ? 9 : 13, paddingHorizontal: compact ? 13 : 17 }]}>
    {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}<Text style={[styles.buttonText, { color: foreground, fontSize: compact ? 13 : 15 }]}>{title}</Text>
  </Pressable>;
}

export function IconButton({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  const colors = usePalette();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}><Ionicons name={icon} size={21} color={colors.primary} /></Pressable>;
}

export function SectionHeading({ title, count }: { title: string; count?: number }) {
  const colors = usePalette();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>{count !== undefined ? <Text style={[styles.count, { color: colors.muted }]}>{count}</Text> : null}</View>;
}

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  const colors = usePalette();
  return <View style={{ marginBottom: 7 }}><Text style={[styles.fieldLabel, { color: colors.text }]}>{children}</Text>{hint ? <Text style={[styles.hint, { color: colors.muted }]}>{hint}</Text> : null}</View>;
}

export function TextField({ value, onChangeText, placeholder, multiline = false, keyboardType, autoFocus = false }: {
  value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric'; autoFocus?: boolean;
}) {
  const colors = usePalette();
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} autoFocus={autoFocus} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, multiline && styles.multiline]} />;
}

export function ChoiceChip({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  const colors = usePalette();
  return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.primarySoft : colors.surface, borderColor: selected ? colors.primary : colors.border }]}><Text style={{ color: selected ? colors.primary : colors.muted, fontWeight: selected ? '700' : '500', fontSize: 13 }}>{title}</Text></Pressable>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  const colors = usePalette();
  return <Card style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="notifications-outline" size={24} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.emptyBody, { color: colors.muted }]}>{body}</Text>{action}</Card>;
}

export const ReminderRow = React.memo(function ReminderRow({ item, completed = false, overdue = false, onToggle, onOpen }: {
  item: ReminderItem; completed?: boolean; overdue?: boolean; onToggle: () => void; onOpen: () => void;
}) {
  const colors = usePalette();
  const kindLabel = item.kind === 'habit' ? 'Habit' : item.kind === 'daily' ? 'Daily task' : 'Permanent task';
  return <View style={[styles.reminderRow, { borderBottomColor: colors.border }]}>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: completed }} accessibilityLabel={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`} onPress={onToggle} style={[styles.check, { borderColor: completed ? colors.primary : colors.border, backgroundColor: completed ? colors.primary : 'transparent' }]}>
      {completed ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
    </Pressable>
    <Pressable onPress={onOpen} style={{ flex: 1, minHeight: 58, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 6 }}><Text numberOfLines={2} style={[styles.reminderTitle, { color: completed ? colors.muted : colors.text, textDecorationLine: completed ? 'line-through' : 'none' }]}>{item.title}</Text>{overdue && !completed ? <View style={{ borderRadius: 5, alignSelf: 'flex-start' }}><Text style={[styles.overdueTag, { color: colors.danger, backgroundColor: colors.dangerSoft }]}>OVERDUE</Text></View> : null}</View>
      <Text style={[styles.reminderMeta, { color: colors.muted }]}>{kindLabel}{item.reminderTimes.length ? ` · ${item.reminderTimes.map(formatTimeDisplay).join(' · ')}` : ''}{item.dueDate ? ` · due ${item.dueDate}` : ''}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={onOpen} hitSlop={8} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={19} color={colors.muted} /></Pressable>
  </View>;
}, (previous, next) => {
  const previousItem = previous.item;
  const nextItem = next.item;
  const sameTimes = previousItem.reminderTimes.length === nextItem.reminderTimes.length &&
    previousItem.reminderTimes.every((time, index) => time === nextItem.reminderTimes[index]);
  // Handler closures are safe to retain while the row's visible/completion state is unchanged.
  return previous.completed === next.completed && previous.overdue === next.overdue &&
    previousItem.id === nextItem.id && previousItem.title === nextItem.title && previousItem.kind === nextItem.kind &&
    previousItem.dueDate === nextItem.dueDate && previousItem.archived === nextItem.archived && sameTimes;
});

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 22, paddingTop: 15, paddingBottom: 36, gap: 18 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 2 },
  pageTitle: { fontSize: 29, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  card: { borderRadius: 19, borderWidth: 1, padding: 16, gap: 12 },
  button: { minHeight: 44, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonText: { fontWeight: '700' },
  iconButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  count: { fontSize: 13, fontWeight: '600' },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 94, textAlignVertical: 'top' },
  chip: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 13, paddingVertical: 9 },
  empty: { alignItems: 'center', paddingVertical: 26 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  check: { width: 25, height: 25, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  reminderMeta: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  overdueTag: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden', borderRadius: 5 },
});
