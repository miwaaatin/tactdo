import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery } from '@apollo/client/react';
import { CREATE_TODO, DELETE_TODO, TODOS, UPDATE_TODO } from '../graphql';
import { useAuth } from '../auth';
import { colors, gradient } from '../theme';

export default function TodosScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const { data, loading, error: queryError, refetch } = useQuery(TODOS);
  const todos = data?.todos ?? [];

  const [createTodo, { loading: creating }] = useMutation(CREATE_TODO, {
    update(cache, { data: { createTodo } }) {
      cache.updateQuery({ query: TODOS }, (prev) => ({ todos: [createTodo, ...(prev?.todos ?? [])] }));
    },
  });
  const [updateTodo] = useMutation(UPDATE_TODO);
  const [deleteTodo] = useMutation(DELETE_TODO, {
    update(cache, { data: { deleteTodo: id } }) {
      cache.evict({ id: cache.identify({ __typename: 'Todo', id }) });
      cache.gc();
    },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'TactDo',
      headerRight: () => (
        <Pressable testID="logout-button" onPress={signOut} hitSlop={10}>
          <Text style={{ color: colors.brandLight, fontWeight: '600' }}>Log out</Text>
        </Pressable>
      ),
    });
  }, [navigation, signOut]);

  const run = (p) => p.catch((e) => setError(e.message));

  const add = () => {
    const t = title.trim();
    if (!t) return;
    setError('');
    setTitle('');
    run(createTodo({ variables: { title: t } }));
  };

  const toggle = (todo) =>
    run(
      updateTodo({
        variables: { id: todo.id, completed: !todo.completed },
        optimisticResponse: { updateTodo: { ...todo, completed: !todo.completed } },
      })
    );

  const remove = (todo) => run(deleteTodo({ variables: { id: todo.id }, optimisticResponse: { deleteTodo: todo.id } }));

  const startEditing = (todo) => {
    setError('');
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  const saveEdit = async () => {
    const nextTitle = editTitle.trim();
    if (!nextTitle || saving) return;
    setError('');
    setSaving(true);
    try {
      await updateTodo({ variables: { id: editingId, title: nextTitle } });
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const done = todos.filter((t) => t.completed).length;
  const pct = todos.length ? done / todos.length : 0;
  const visibleTodos = todos.filter((todo) =>
    filter === 'all' || (filter === 'done' ? todo.completed : !todo.completed)
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.summary}>
          <View style={styles.summaryText}>
            <Text style={styles.heading}>My tasks</Text>
            <Text style={styles.count}>{`${done} of ${todos.length} completed`}</Text>
          </View>
          <Text testID="completion-percentage" style={styles.percentage}>{Math.round(pct * 100)}%</Text>
        </View>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }} style={styles.track}>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.bar, { width: `${pct * 100}%` }]} />
        </View>
      </View>

      <View style={styles.addRow}>
        <TextInput
          testID="new-todo-input"
          style={styles.input}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.dim}
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable testID="add-todo-button" onPress={add} disabled={creating || !title.trim()}>
          <LinearGradient colors={gradient} style={[styles.addBtn, !title.trim() && { opacity: 0.5 }]}>
            <Text style={styles.addText}>+ Add</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filters}>
          {['all', 'active', 'done'].map((value) => (
            <Pressable
              key={value}
              testID={`filter-${value}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === value, disabled: saving }}
              disabled={saving}
              onPress={() => { setFilter(value); setEditingId(null); }}
              style={[styles.filterButton, filter === value && styles.filterSelected]}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextSelected]}>
                {value === 'all' ? 'All' : value === 'active' ? 'Active' : 'Done'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!!(error || (queryError && !data)) && (
        <Text style={styles.error}>{error || `Offline – showing cached tasks. (${queryError.message})`}</Text>
      )}

      {loading && !data ? (
        <ActivityIndicator color={colors.brandLight} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visibleTodos}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={colors.brandLight} />}
          ListEmptyComponent={<Text style={styles.empty}>{filter === 'all' ? 'Add your first task above' : `No ${filter} tasks`}</Text>}
          renderItem={({ item }) => (
            <View style={styles.item}>
              {editingId === item.id ? (
                <View style={styles.editor}>
                  <Text style={styles.editLabel}>Edit task</Text>
                  <TextInput
                    testID={`edit-input-${item.id}`}
                    accessibilityLabel="Task title"
                    style={[styles.input, styles.editInput]}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    editable={!saving}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveEdit}
                  />
                  <View style={styles.editActions}>
                    <Pressable onPress={() => setEditingId(null)} disabled={saving} style={styles.actionButton}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      testID={`save-${item.id}`}
                      onPress={saveEdit}
                      disabled={saving || !editTitle.trim()}
                      style={[styles.actionButton, (saving || !editTitle.trim()) && styles.disabled]}
                    >
                      <Text style={styles.editText}>{saving ? 'Saving...' : 'Save'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
              <Pressable testID={`toggle-${item.id}`} onPress={() => toggle(item)} hitSlop={8}>
                {item.completed ? (
                  <LinearGradient colors={gradient} style={styles.check}>
                    <Text style={styles.checkMark}>✓</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.check, styles.checkEmpty]} />
                )}
              </Pressable>
              <Text style={[styles.itemText, item.completed && styles.itemDone]}>{item.title}</Text>
              <Pressable testID={`edit-${item.id}`} accessibilityLabel={`Edit ${item.title}`} onPress={() => startEditing(item)} disabled={saving} style={styles.actionButton}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
              <Pressable testID={`delete-${item.id}`} onPress={() => remove(item)} hitSlop={8}>
                <Text style={styles.delete}>🗑</Text>
              </Pressable>
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  summaryText: { flex: 1 },
  heading: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -1 },
  percentage: { color: colors.accent, fontSize: 34, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  email: { color: colors.dim, fontSize: 13 },
  count: { color: colors.muted, fontSize: 15, marginTop: 2 },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 20, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  addRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  input: { flex: 1, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 16 },
  addBtn: { minWidth: 82, minHeight: 50, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  filterRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  filters: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, padding: 4, borderRadius: 14 },
  filterButton: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 10 },
  filterSelected: { backgroundColor: 'rgba(255,255,255,0.10)' },
  filterText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  filterTextSelected: { color: colors.text },
  error: { color: colors.danger, paddingHorizontal: 20, marginBottom: 8 },
  empty: { color: colors.dim, textAlign: 'center', marginTop: 48, fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkEmpty: { borderWidth: 2, borderColor: '#475569' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  itemText: { flex: 1, color: colors.text, fontSize: 16 },
  itemDone: { color: colors.dim, textDecorationLine: 'line-through' },
  delete: { fontSize: 16, opacity: 0.7 },
  editor: { flex: 1, gap: 10 },
  editLabel: { color: colors.muted, fontSize: 13 },
  editInput: { flex: 0 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  actionButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  editText: { color: colors.brandLight, fontWeight: '600' },
  cancelText: { color: colors.muted },
  disabled: { opacity: 0.5 },
});
