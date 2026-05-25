'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  ListTodo,
  CalendarDays,
  Flag,
  Filter,
  AlertTriangle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  dueDate: string
}

type FilterType = 'all' | 'active' | 'completed'

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'theonewaygda-todos'

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 border-amber-500/20',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  high: {
    label: 'High',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10 border-rose-500/20',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
  },
} as const

const FILTER_OPTIONS: { value: FilterType; label: string; icon: typeof ListTodo }[] = [
  { value: 'all', label: 'All', icon: ListTodo },
  { value: 'active', label: 'Active', icon: Circle },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
]

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.03 } },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadTodos(): Todo[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveTodos(todos: Todo[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch {
    /* storage full — silent fail */
  }
}

function generateId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(todo: Todo): boolean {
  if (!todo.dueDate || todo.completed) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(todo.dueDate + 'T00:00:00')
  return due < today
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TodoApp() {
  // State
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editText, setEditText] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [editDueDate, setEditDueDate] = useState('')
  const [deleteTodo, setDeleteTodo] = useState<Todo | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadTodos()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate localStorage hydration pattern
    setTodos(stored)
    setIsHydrated(true)
  }, [])

  // Persist to localStorage whenever todos change
  useEffect(() => {
    if (isHydrated) {
      saveTodos(todos)
    }
  }, [todos, isHydrated])

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleAddTask = useCallback(() => {
    const text = newTaskText.trim()
    if (!text) return

    const newTodo: Todo = {
      id: generateId(),
      text,
      completed: false,
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
      dueDate: newTaskDueDate,
    }

    setTodos(prev => [newTodo, ...prev])
    setNewTaskText('')
    setNewTaskDueDate('')
    setNewTaskPriority('medium')
  }, [newTaskText, newTaskPriority, newTaskDueDate])

  const handleToggleComplete = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }, [])

  const handleOpenEdit = useCallback((todo: Todo) => {
    setEditingTodo(todo)
    setEditText(todo.text)
    setEditPriority(todo.priority)
    setEditDueDate(todo.dueDate)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingTodo) return
    const text = editText.trim()
    if (!text) return

    setTodos(prev =>
      prev.map(todo =>
        todo.id === editingTodo.id
          ? { ...todo, text, priority: editPriority, dueDate: editDueDate }
          : todo
      )
    )
    setEditingTodo(null)
  }, [editingTodo, editText, editPriority, editDueDate])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTodo) return
    setTodos(prev => prev.filter(todo => todo.id !== deleteTodo.id))
    setDeleteTodo(null)
  }, [deleteTodo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAddTask()
      }
    },
    [handleAddTask]
  )

  // ─── Computed Values ─────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter(t => t.completed).length
    const active = total - completed
    return { total, completed, active }
  }, [todos])

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(t => !t.completed)
      case 'completed':
        return todos.filter(t => t.completed)
      default:
        return todos
    }
  }, [todos, filter])

  const overdueCount = useMemo(
    () => todos.filter(t => isOverdue(t)).length,
    [todos]
  )

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ─── Header Card ─────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListTodo className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl">Tasks</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Stay organized and track your progress
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-3 py-2 flex-1 min-w-[100px]">
              <ListTodo className="size-3.5 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Total</p>
                <p className="text-sm font-semibold leading-tight">{stats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-3 py-2 flex-1 min-w-[100px]">
              <Circle className="size-3.5 text-sky-400" />
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Active</p>
                <p className="text-sm font-semibold leading-tight">{stats.active}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/30 border border-border/50 px-3 py-2 flex-1 min-w-[100px]">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Done</p>
                <p className="text-sm font-semibold leading-tight">{stats.completed}</p>
              </div>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 flex-1 min-w-[100px]">
                <AlertTriangle className="size-3.5 text-rose-400" />
                <div>
                  <p className="text-[10px] text-rose-400 leading-none">Overdue</p>
                  <p className="text-sm font-semibold leading-tight text-rose-400">
                    {overdueCount}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Progress</span>
                <span>{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={false}
                  animate={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add Task Card ────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="What needs to be done?"
              value={newTaskText}
              onChange={e => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 h-10 bg-muted/30 border-border/50 text-sm"
            />
            <Button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              size="sm"
              className="h-10 gap-1.5 px-4"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Task</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[140px]">
              <Flag className="size-3.5 text-muted-foreground flex-shrink-0" />
              <Select
                value={newTaskPriority}
                onValueChange={v => setNewTaskPriority(v as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger size="sm" className="h-8 w-full text-xs bg-muted/30 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="high" className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-rose-500" />
                      High
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <CalendarDays className="size-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                className="h-8 text-xs bg-muted/30 border-border/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Filter + Task List Card ──────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex gap-1 bg-muted/30 rounded-lg p-1 flex-1 overflow-x-auto">
              {FILTER_OPTIONS.map(option => {
                const Icon = option.icon
                const isActive = filter === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-background text-foreground shadow-sm border border-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="size-3" />
                    {option.label}
                    {option.value === 'active' && stats.active > 0 && (
                      <span className="text-[10px] ml-0.5 opacity-70">({stats.active})</span>
                    )}
                    {option.value === 'completed' && stats.completed > 0 && (
                      <span className="text-[10px] ml-0.5 opacity-70">({stats.completed})</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Task list */}
          {!isHydrated ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-14 text-center"
            >
              <div className="size-14 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center mb-4">
                {filter === 'completed' ? (
                  <CheckCircle2 className="size-7 text-muted-foreground/40" />
                ) : filter === 'active' ? (
                  <Circle className="size-7 text-muted-foreground/40" />
                ) : (
                  <ListTodo className="size-7 text-muted-foreground/40" />
                )}
              </div>
              <h3 className="text-sm font-semibold mb-1">
                {filter === 'completed'
                  ? 'No completed tasks yet'
                  : filter === 'active'
                  ? 'All tasks are done!'
                  : 'No tasks yet'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                {filter === 'completed'
                  ? 'Complete some tasks and they will show up here.'
                  : filter === 'active'
                  ? stats.total > 0
                    ? 'Great job! All tasks are completed.'
                    : 'Add your first task above to get started.'
                  : 'Add your first task above to get started.'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-2 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {filteredTodos.map(todo => {
                  const priority = PRIORITY_CONFIG[todo.priority]
                  const overdue = isOverdue(todo)

                  return (
                    <motion.div
                      key={todo.id}
                      variants={fadeUp}
                      layout
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 transition-all',
                        todo.completed
                          ? 'bg-muted/20 border-border/30 opacity-60'
                          : 'bg-muted/30 border-border/50 hover:bg-muted/50',
                        overdue && 'border-rose-500/30 bg-rose-500/5'
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(todo.id)}
                        className="flex-shrink-0 mt-0.5"
                        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <p
                            className={cn(
                              'text-sm leading-snug flex-1',
                              todo.completed && 'line-through text-muted-foreground'
                            )}
                          >
                            {todo.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-4 font-medium gap-1 border',
                              priority.badge
                            )}
                          >
                            <Flag className="size-2" />
                            {priority.label}
                          </Badge>
                          {todo.dueDate && (
                            <span
                              className={cn(
                                'text-[10px] flex items-center gap-1',
                                overdue ? 'text-rose-400' : 'text-muted-foreground'
                              )}
                            >
                              <CalendarDays className="size-2.5" />
                              {formatDate(todo.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                        <button
                          onClick={() => handleOpenEdit(todo)}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Edit task"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTodo(todo)}
                          className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                          aria-label="Delete task"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* ─── Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!editingTodo} onOpenChange={open => !open && setEditingTodo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="size-4" />
              Edit Task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Task text */}
            <div className="space-y-2">
              <Label htmlFor="edit-task-text" className="text-xs">
                Task
              </Label>
              <Input
                id="edit-task-text"
                placeholder="Task description..."
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                className="bg-muted/30 border-border/50 text-sm"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs">Priority</Label>
              <Select
                value={editPriority}
                onValueChange={v => setEditPriority(v as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger className="bg-muted/30 border-border/50 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-rose-500" />
                      High
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-due-date" className="text-xs">
                Due Date
              </Label>
              <Input
                id="edit-due-date"
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
                className="bg-muted/30 border-border/50 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingTodo(null)}
              size="sm"
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editText.trim()}
              size="sm"
              className="text-xs"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTodo} onOpenChange={open => !open && setDeleteTodo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-500" />
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">&ldquo;{deleteTodo?.text}&rdquo;</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
