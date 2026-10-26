import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { CREATE_TODO, DELETE_TODO, TODOS, UPDATE_TODO } from '../graphql'
import { useAuth } from '../auth'
import { Logo } from '../components/Background'

const FILTERS = ['all', 'active', 'done']

export default function TodosPage() {
  const { user, signOut } = useAuth()
  const [title, setTitle] = useState('')
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  const { data, loading, error: queryError } = useQuery(TODOS)
  const todos = data?.todos ?? []

  const [createTodo, { loading: creating }] = useMutation(CREATE_TODO, {
    update(cache, { data: { createTodo } }) {
      cache.updateQuery({ query: TODOS }, (prev) => ({ todos: [createTodo, ...(prev?.todos ?? [])] }))
    },
  })
  const [updateTodo] = useMutation(UPDATE_TODO)
  const [deleteTodo] = useMutation(DELETE_TODO, {
    update(cache, { data: { deleteTodo: id } }) {
      cache.evict({ id: cache.identify({ __typename: 'Todo', id }) })
      cache.gc()
    },
  })

  const run = async (p) => {
    setError('')
    try {
      await p
    } catch (e) {
      setError(e.message)
    }
  }

  const onAdd = (e) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    setTitle('')
    run(createTodo({ variables: { title: t } }))
  }

  const toggle = (todo) =>
    run(
      updateTodo({
        variables: { id: todo.id, completed: !todo.completed },
        optimisticResponse: { updateTodo: { ...todo, completed: !todo.completed } },
      })
    )

  const remove = (todo) =>
    run(deleteTodo({ variables: { id: todo.id }, optimisticResponse: { deleteTodo: todo.id } }))

  const visible = useMemo(
    () => todos.filter((t) => (filter === 'all' ? true : filter === 'done' ? t.completed : !t.completed)),
    [todos, filter]
  )
  const doneCount = todos.filter((t) => t.completed).length
  const progress = todos.length ? Math.round((doneCount / todos.length) * 100) : 0

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:py-10">
      <header className="mb-8 flex items-center justify-between animate-fade-up">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-400 sm:inline">{user?.email}</span>
          <button id="logout-button" onClick={signOut} className="btn-ghost">
            Log out
          </button>
        </div>
      </header>

      <main className="glass flex-1 rounded-3xl p-6 sm:p-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My tasks</h1>
            <p className="mt-1 text-slate-400">
              {todos.length === 0 ? 'Nothing here yet' : `${doneCount} of ${todos.length} completed`}
            </p>
          </div>
          <div className="text-right">
            <span className="bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-3xl font-bold text-transparent">
              {progress}%
            </span>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <form onSubmit={onAdd} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            id="new-todo-input"
            className="input"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <button id="add-todo-button" type="submit" disabled={creating || !title.trim()} className="btn-primary shrink-0">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add
          </button>
        </form>

        <div className="mt-6 inline-flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
          {FILTERS.map((f) => (
            <button
              key={f}
              id={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-1.5 text-sm capitalize transition cursor-pointer ${
                filter === f ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {(error || queryError) && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error || queryError.message}
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {loading &&
            [0, 1, 2].map((i) => <li key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}

          {!loading && visible.length === 0 && (
            <li className="flex flex-col items-center py-14 text-center text-slate-500">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-2xl">✨</div>
              {filter === 'all' ? 'Add your first task above' : `No ${filter} tasks`}
            </li>
          )}

          {visible.map((todo) => (
            <li
              key={todo.id}
              className="group flex items-center gap-3 rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3 transition hover:border-brand-400/40 hover:bg-slate-900/70 animate-fade-up"
            >
              <button
                id={`toggle-${todo.id}`}
                aria-label={todo.completed ? 'Mark as not done' : 'Mark as done'}
                onClick={() => toggle(todo)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition cursor-pointer ${
                  todo.completed
                    ? 'border-transparent bg-gradient-to-br from-brand-500 to-accent-400'
                    : 'border-slate-600 hover:border-brand-400'
                }`}
              >
                {todo.completed && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 break-words transition ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}
              >
                {todo.title}
              </span>
              <button
                id={`delete-${todo.id}`}
                aria-label="Delete task"
                onClick={() => remove(todo)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
