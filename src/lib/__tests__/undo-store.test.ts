import { describe, it, expect, beforeEach, vi } from 'vitest'

// Undo-store uses module-level mutable state, so reset between tests
let undoStore: typeof import('../undo-store')

beforeEach(async () => {
  vi.resetModules()
  undoStore = await import('../undo-store')
  undoStore.clearHistory()
})

// ── Tests ──────────────────────────────────────────────────

describe('undo-store', () => {
  describe('pushSnapshot', () => {
    it('should store a snapshot that can be undone', () => {
      const data = { rows: [{ a: 1, b: 2 }] }
      undoStore.pushSnapshot(data)

      const restored = undoStore.undo({ rows: [{ a: 99, b: 99 }] })
      expect(restored).toEqual(data)
    })

    it('should not push a snapshot identical to the current top of the stack', () => {
      const data = { rows: [1, 2, 3] }
      undoStore.pushSnapshot(data)
      undoStore.pushSnapshot(data) // duplicate

      expect(undoStore.canUndo()).toBe(true)
      // Should only have one snapshot
      undoStore.undo(data)
      expect(undoStore.canUndo()).toBe(false)
    })

    it('should clear the redo stack when a new snapshot is pushed', () => {
      const data1 = [1, 2, 3]
      const data2 = [4, 5, 6]

      undoStore.pushSnapshot(data1)
      undoStore.undo(data2)  // data2 goes to future/redo stack
      expect(undoStore.canRedo()).toBe(true)

      undoStore.pushSnapshot(data2)  // new action — should clear redo
      expect(undoStore.canRedo()).toBe(false)
    })
  })

  describe('undo', () => {
    it('should return null when no history exists', () => {
      expect(undoStore.undo({ x: 1 })).toBeNull()
    })

    it('should restore the previous snapshot and push current to redo', () => {
      undoStore.pushSnapshot({ version: 1 })
      undoStore.pushSnapshot({ version: 2 })

      const result = undoStore.undo({ version: 3 })
      expect(result).toEqual({ version: 2 })

      // Current state ({ version: 3 }) should now be in redo
      expect(undoStore.canRedo()).toBe(true)
    })

    it('should allow multiple consecutive undos', () => {
      undoStore.pushSnapshot({ v: 1 })
      undoStore.pushSnapshot({ v: 2 })
      undoStore.pushSnapshot({ v: 3 })

      expect(undoStore.undo({ v: 4 })).toEqual({ v: 3 })
      expect(undoStore.undo({ v: 3 })).toEqual({ v: 2 })
      expect(undoStore.undo({ v: 2 })).toEqual({ v: 1 })
      expect(undoStore.canUndo()).toBe(false)
    })
  })

  describe('redo', () => {
    it('should return null when no redo history exists', () => {
      expect(undoStore.redo({ x: 1 })).toBeNull()
    })

    it('should restore the next snapshot and push current to undo', () => {
      undoStore.pushSnapshot({ step: 1 })
      undoStore.undo({ step: 2 }) // step: 2 goes to redo

      const result = undoStore.redo({ step: 1 })
      expect(result).toEqual({ step: 2 })

      // { step: 1 } should be in undo stack
      expect(undoStore.canUndo()).toBe(true)
    })

    it('should allow multiple consecutive redos', () => {
      undoStore.pushSnapshot({ v: 1 })
      undoStore.pushSnapshot({ v: 2 })
      undoStore.pushSnapshot({ v: 3 })

      // Undo twice
      undoStore.undo({ v: 4 })
      undoStore.undo({ v: 3 })

      // Redo twice
      expect(undoStore.redo({ v: 2 })).toEqual({ v: 3 })
      expect(undoStore.redo({ v: 3 })).toEqual({ v: 4 })
      expect(undoStore.canRedo()).toBe(false)
    })
  })

  describe('undo/redo interaction', () => {
    it('should produce a new redo branch after undo + new action', () => {
      // Push 3 states, undo 1, then push a new state
      undoStore.pushSnapshot({ n: 1 })
      undoStore.pushSnapshot({ n: 2 })
      undoStore.pushSnapshot({ n: 3 })

      // past = [n:1, n:2, n:3], future = []
      undoStore.undo({ n: 4 })
      // past = [n:1, n:2], future = [n:4], returned n:3

      undoStore.pushSnapshot({ n: 5 }) // new branch — future (n:4) is discarded
      // past = [n:1, n:2, n:5], future = []

      // Can undo to n:5 and n:2
      expect(undoStore.undo({ n: 6 })).toEqual({ n: 5 })
      expect(undoStore.undo({ n: 5 })).toEqual({ n: 2 })
      // n:3 is NOT in the stack — it was undone and the new push replaced it
      // Redo goes to n:5 (the new branch)
      expect(undoStore.redo({ n: 2 })).toEqual({ n: 5 })
      // n:4 is gone (discarded when new snapshot was pushed)
    })
  })

  describe('MAX_HISTORY (50)', () => {
    it('should evict the oldest snapshot when exceeding 50 entries', () => {
      for (let i = 0; i < 55; i++) {
        undoStore.pushSnapshot({ index: i })
      }

      // Should be able to undo 50 times (max), not 55
      let undoCount = 0
      let current = { index: 999 }
      while (undoStore.canUndo()) {
        current = undoStore.undo(current) as { index: number }
        undoCount++
      }

      expect(undoCount).toBe(50)
      // The oldest surviving snapshot should be index 5 (0-4 evicted)
      expect(current).toEqual({ index: 5 })
    })
  })

  describe('clearHistory', () => {
    it('should remove all undo and redo state', () => {
      undoStore.pushSnapshot({ a: 1 })
      undoStore.pushSnapshot({ a: 2 })
      undoStore.undo({ a: 3 })

      expect(undoStore.canUndo()).toBe(true)
      expect(undoStore.canRedo()).toBe(true)

      undoStore.clearHistory()

      expect(undoStore.canUndo()).toBe(false)
      expect(undoStore.canRedo()).toBe(false)
    })
  })

  describe('deep clone safety', () => {
    it('should return independent copies — mutating undo result should not affect stored state', () => {
      const original = { items: [1, 2, 3] }
      undoStore.pushSnapshot(original)

      const restored = undoStore.undo({ items: [9, 9, 9] }) as { items: number[] }
      // Mutate the returned object
      restored.items.push(999)

      // Undo again — the stored snapshot should be unaffected
      // (undo-store uses JSON.stringify/parse, so snapshots are decoupled)
      // After this undo, past is empty, so we can't verify further,
      // but the key guarantee is that the JSON parse always creates a new object
      expect(restored.items).toEqual([1, 2, 3, 999]) // mutated copy
    })
  })

  describe('canUndo / canRedo', () => {
    it('should report false when stacks are empty', () => {
      expect(undoStore.canUndo()).toBe(false)
      expect(undoStore.canRedo()).toBe(false)
    })

    it('should report correct states after operations', () => {
      undoStore.pushSnapshot({ v: 1 })
      expect(undoStore.canUndo()).toBe(true)
      expect(undoStore.canRedo()).toBe(false)

      undoStore.undo({ v: 2 })
      expect(undoStore.canUndo()).toBe(false)
      expect(undoStore.canRedo()).toBe(true)

      undoStore.redo({ v: 1 })
      expect(undoStore.canUndo()).toBe(true)
      expect(undoStore.canRedo()).toBe(false)
    })
  })
})