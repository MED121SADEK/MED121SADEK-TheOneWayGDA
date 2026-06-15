// Simple undo/redo stack for workspace data
// Stores snapshots of the data array (JSON serialized for immutability)

type Snapshot = string // JSON.stringify(data)

const MAX_HISTORY = 50

let past: Snapshot[] = []
let future: Snapshot[] = []

export function pushSnapshot(data: unknown): void {
  const serialized = JSON.stringify(data)
  // Don't push if identical to current state
  if (past.length > 0 && past[past.length - 1] === serialized) return
  past.push(serialized)
  if (past.length > MAX_HISTORY) past.shift()
  future = [] // Clear redo stack on new action
}

export function undo(currentData: unknown): unknown | null {
  if (past.length === 0) return null
  future.push(JSON.stringify(currentData))
  const previous = past.pop()!
  return JSON.parse(previous)
}

export function redo(currentData: unknown): unknown | null {
  if (future.length === 0) return null
  past.push(JSON.stringify(currentData))
  const next = future.pop()!
  return JSON.parse(next)
}

export function canUndo(): boolean { return past.length > 0 }
export function canRedo(): boolean { return future.length > 0 }
export function clearHistory(): void { past = []; future = [] }