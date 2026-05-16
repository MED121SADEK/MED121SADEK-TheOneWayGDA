/**
 * Universal In-Memory Database Proxy
 *
 * Drop-in replacement for Prisma Client that works on any serverless platform.
 * Uses JavaScript Proxy to intercept model access and provide CRUD operations
 * for ANY model without pre-defining them.
 *
 * Features:
 * - findMany, findUnique, findFirst, create, update, upsert, delete, deleteMany, count
 * - Basic where clause filtering (equals, in, notIn, contains, gt, gte, lt, lte, AND, OR)
 * - select / include (basic relation resolution via foreign key convention)
 * - orderBy, take, skip, distinct
 * - _count aggregation
 */

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// Global data stores — survives across imports in same server instance
const stores = new Map<string, Map<string, Record<string, unknown>>>()

function getStore(modelName: string): Map<string, Record<string, unknown>> {
  if (!stores.has(modelName)) stores.set(modelName, new Map())
  return stores.get(modelName)!
}

// ─── Foreign key convention detection ───
// team → userId means Team has field "userId" pointing to User model
// team → owner means Team has field "ownerId" pointing to User model (relation name "TeamOwner")
const FK_PATTERNS: [RegExp, string][] = [
  [/([A-Z][a-z]+)Id$/, '$1'],           // userId → User
  [/([A-Za-z]+)_id$/, '$1'],           // user_id → user
]

function resolveRelation(modelName: string, relationName: string): { targetModel: string; fkField: string } | null {
  // Try common patterns: relation name could be "user", "owner", "team"
  const candidates = [relationName]

  // CamelCase to words: "userSession" → ["user", "Session"] → try "user"
  const words = relationName.replace(/([A-Z])/g, ' $1').trim().split(/\s+/)
  if (words.length > 1) {
    candidates.push(words[0].toLowerCase())
  }

  for (const candidate of candidates) {
    // Try fkCandidateId field in source model's store
    const sourceStore = getStore(modelName)
    if (sourceStore.size === 0) continue
    const sampleRecord = sourceStore.values().next().value
    if (!sampleRecord) continue

    const fkFields = Object.keys(sampleRecord).filter(k =>
      k.toLowerCase() === `${candidate}Id` || k.toLowerCase() === `${candidate}_id`
    )

    if (fkFields.length > 0) {
      // Capitalize first letter to get model name
      const targetModel = candidate.charAt(0).toUpperCase() + candidate.slice(1)
      return { targetModel, fkField: fkFields[0] }
    }
  }

  return null
}

// ─── Where clause matcher ───
function matchesWhere(record: Record<string, unknown>, where: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND') {
      if (!Array.isArray(value)) return matchesWhere(record, value as Record<string, unknown>)
      if (!value.every((w: Record<string, unknown>) => matchesWhere(record, w))) return false
      continue
    }
    if (key === 'OR') {
      if (!Array.isArray(value)) return matchesWhere(record, value as Record<string, unknown>)
      if (!(value as Record<string, unknown>[]).some(w => matchesWhere(record, w))) return false
      continue
    }
    if (key === 'NOT') {
      if (matchesWhere(record, value as Record<string, unknown>)) return false
      continue
    }

    const recordVal = record[key]
    if (value === null || value === undefined) {
      if (recordVal !== value) return false
      continue
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>
      for (const [op, opVal] of Object.entries(ops)) {
        if (!matchesOp(recordVal, op, opVal)) return false
      }
      continue
    }

    if (recordVal !== value) return false
  }
  return true
}

function matchesOp(recordVal: unknown, op: string, opVal: unknown): boolean {
  switch (op) {
    case 'equals': return recordVal === opVal
    case 'not': return recordVal !== opVal
    case 'in': return Array.isArray(opVal) && opVal.includes(recordVal)
    case 'notIn': return Array.isArray(opVal) && !opVal.includes(recordVal)
    case 'contains':
      if (typeof recordVal === 'string' && typeof opVal === 'string')
        return recordVal.toLowerCase().includes(opVal.toLowerCase())
      return false
    case 'startsWith':
      if (typeof recordVal === 'string' && typeof opVal === 'string')
        return recordVal.toLowerCase().startsWith(opVal.toLowerCase())
      return false
    case 'endsWith':
      if (typeof recordVal === 'string' && typeof opVal === 'string')
        return recordVal.toLowerCase().endsWith(opVal.toLowerCase())
      return false
    case 'gt': return (recordVal as number) > (opVal as number)
    case 'gte': return (recordVal as number) >= (opVal as number)
    case 'lt': return (recordVal as number) < (opVal as number)
    case 'lte': return (recordVal as number) <= (opVal as number)
    default: return true
  }
}

// ─── Select / Include field filtering ───
function applySelect(record: Record<string, unknown>, select: Record<string, unknown> | undefined, include: Record<string, unknown> | undefined, modelName: string): unknown {
  if (!select && !include) return record

  const result: Record<string, unknown> = {}

  if (select) {
    for (const [key, val] of Object.entries(select)) {
      if (key === '_count') {
        // Handle _count aggregation
        const countSelect = val as Record<string, unknown>
        const counts: Record<string, number> = {}
        for (const [relationName] of Object.entries(countSelect)) {
          const rel = resolveRelation(modelName, relationName)
          if (rel) {
            const targetStore = getStore(rel.targetModel)
            const fkField = rel.fkField
            let count = 0
            for (const targetRecord of targetStore.values()) {
              if (targetRecord[fkField] === record['id']) count++
            }
            counts[relationName] = count
          }
        }
        result._count = counts
        continue
      }
      if (val === true && record[key] !== undefined) {
        result[key] = record[key]
      } else if (typeof val === 'object' && val !== null && record[key] !== undefined) {
        // Nested select on a relation — just include the raw value for now
        result[key] = record[key]
      }
    }
  } else {
    // No select — include all scalar fields
    for (const [key, val] of Object.entries(record)) {
      // Skip relation fields (arrays and complex objects that look like relations)
      if (Array.isArray(val)) continue
      if (typeof val === 'object' && val !== null && 'id' in (val as object)) continue
      result[key] = val
    }
  }

  if (include) {
    for (const [relationName, incVal] of Object.entries(include)) {
      const rel = resolveRelation(modelName, relationName)
      if (!rel) continue

      const targetStore = getStore(rel.targetModel)
      const fkField = rel.fkField
      const relatedRecords: unknown[] = []

      for (const targetRecord of targetStore.values()) {
        if (targetRecord[fkField] === record['id']) {
          if (incVal === true) {
            relatedRecords.push(targetRecord)
          } else if (typeof incVal === 'object') {
            relatedRecords.push(applySelect(targetRecord, (incVal as Record<string, unknown>).select as Record<string, unknown>, (incVal as Record<string, unknown>).include as Record<string, unknown>, rel.targetModel))
          }
        }
      }

      // If only one match expected (e.g., belongs-to relation), return single object
      if (relatedRecords.length <= 1) {
        result[relationName] = relatedRecords[0] || null
      } else {
        result[relationName] = relatedRecords
      }
    }
  }

  return result
}

// ─── Sorting ───
function applyOrderBy(records: Record<string, unknown>[], orderBy: unknown): Record<string, unknown>[] {
  if (!orderBy) return records
  if (typeof orderBy === 'string') return records // Not supported

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy]

  return [...records].sort((a, b) => {
    for (const order of orders) {
      const o = order as Record<string, unknown>
      for (const [field, dir] of Object.entries(o)) {
        const aVal = a[field]
        const bVal = b[field]
        const mult = dir === 'desc' ? -1 : 1
        if (aVal == null && bVal == null) continue
        if (aVal == null) return 1 * mult
        if (bVal == null) return -1 * mult
        if (aVal < bVal) return -1 * mult
        if (aVal > bVal) return 1 * mult
      }
    }
    return 0
  })
}

// ─── Distinct ───
function applyDistinct(records: Record<string, unknown>[], distinct: string[]): Record<string, unknown>[] {
  if (!distinct || distinct.length === 0) return records
  const seen = new Set<string>()
  return records.filter(record => {
    const key = distinct.map(d => String(record[d])).join('||')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Create model handler (Proxy target) ───
function createModelHandler(modelName: string) {
  return {
    findMany: async (args: Record<string, unknown> = {}) => {
      const store = getStore(modelName)
      let records = Array.from(store.values())

      // Apply where filter
      if (args.where) {
        records = records.filter(r => matchesWhere(r, args.where as Record<string, unknown>))
      }

      // Apply orderBy
      records = applyOrderBy(records, args.orderBy)

      // Apply skip
      if (args.skip) {
        records = records.slice(args.skip as number)
      }

      // Apply take
      if (args.take) {
        records = records.slice(0, args.take as number)
      }

      // Apply distinct
      if (args.distinct) {
        records = applyDistinct(records, args.distinct as string[])
      }

      // Apply select/include
      return records.map(r => applySelect(r, args.select as Record<string, unknown>, args.include as Record<string, unknown>, modelName))
    },

    findUnique: async (args: Record<string, unknown>) => {
      const store = getStore(modelName)
      const where = args.where as Record<string, unknown>

      // Handle compound unique keys like { name_provider: { name: 'x', provider: 'y' } }
      for (const [key, val] of Object.entries(where)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          // Compound key
          const compoundWhere = val as Record<string, unknown>
          for (const record of store.values()) {
            let match = true
            for (const [ck, cv] of Object.entries(compoundWhere)) {
              if (record[ck] !== cv) { match = false; break }
            }
            if (match) {
              return applySelect(record, args.select as Record<string, unknown>, args.include as Record<string, unknown>, modelName)
            }
          }
          return null
        }

        // Simple unique field lookup
        for (const record of store.values()) {
          if (record[key] === val) {
            return applySelect(record, args.select as Record<string, unknown>, args.include as Record<string, unknown>, modelName)
          }
        }
      }
      return null
    },

    findFirst: async (args: Record<string, unknown> = {}) => {
      const store = getStore(modelName)
      let records = Array.from(store.values())

      if (args.where) {
        records = records.filter(r => matchesWhere(r, args.where as Record<string, unknown>))
      }

      records = applyOrderBy(records, args.orderBy)
      records = records.slice(0, 1)

      if (records.length === 0) return null
      return applySelect(records[0], args.select as Record<string, unknown>, args.include as Record<string, unknown>, modelName)
    },

    create: async (args: Record<string, unknown>) => {
      const store = getStore(modelName)
      const data = args.data as Record<string, unknown>
      const now = new Date()

      const record: Record<string, unknown> = {
        id: data.id || cuid(),
        ...data,
      }

      // Auto-set timestamps if fields exist in the data
      if (!record.createdAt) record.createdAt = now
      if (!record.updatedAt) record.updatedAt = now

      store.set(record.id as string, record)
      return applySelect(record, args.select as Record<string, unknown>, args.include as Record<string, unknown>, modelName)
    },

    update: async (args: Record<string, unknown>) => {
      const store = getStore(modelName)
      const where = args.where as Record<string, unknown>
      const data = args.data as Record<string, unknown>

      let targetRecord: Record<string, unknown> | undefined

      for (const [key, val] of Object.entries(where)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          const compoundWhere = val as Record<string, unknown>
          for (const record of store.values()) {
            let match = true
            for (const [ck, cv] of Object.entries(compoundWhere)) {
              if (record[ck] !== cv) { match = false; break }
            }
            if (match) { targetRecord = record; break }
          }
        } else {
          for (const record of store.values()) {
            if (record[key] === val) { targetRecord = record; break }
          }
        }
      }

      if (!targetRecord) throw new Error(`Record not found in ${modelName}`)

      const updated: Record<string, unknown> = { ...targetRecord, ...data, updatedAt: new Date() }
      store.set(String(updated.id), updated)

      return applySelect(updated, args.select as Record<string, unknown>, args.include as Record<string, unknown>, modelName)
    },

    upsert: async (args: Record<string, unknown>) => {
      const handler = createModelHandler(modelName)
      const existing = await handler.findUnique({ where: args.where })
      if (existing) {
        return handler.update({ where: args.where, data: args.update, ...args })
      }
      return handler.create({ data: args.create, ...args })
    },

    delete: async (args: Record<string, unknown>) => {
      const store = getStore(modelName)
      const where = args.where as Record<string, unknown>

      for (const [key, val] of Object.entries(where)) {
        for (const [id, record] of store.entries()) {
          if (record[key] === val) {
            store.delete(id)
            return record
          }
        }
      }
      return null
    },

    deleteMany: async (args: Record<string, unknown> = {}) => {
      const store = getStore(modelName)
      if (!args.where || Object.keys(args.where).length === 0) {
        const count = store.size
        store.clear()
        return { count }
      }

      let deleted = 0
      for (const [id, record] of store.entries()) {
        if (matchesWhere(record, args.where as Record<string, unknown>)) {
          store.delete(id)
          deleted++
        }
      }
      return { count: deleted }
    },

    count: async (args: Record<string, unknown> = {}) => {
      const store = getStore(modelName)
      let records = Array.from(store.values())

      if (args.where) {
        records = records.filter(r => matchesWhere(r, args.where as Record<string, unknown>))
      }

      return records.length
    },

    groupBy: async (args: Record<string, unknown> = {}) => {
      const store = getStore(modelName)
      let records = Array.from(store.values())

      if (args.where) {
        records = records.filter(r => matchesWhere(r, args.where as Record<string, unknown>))
      }

      const by = args.by as string[]
      const groups = new Map<string, Record<string, unknown>[]>()

      for (const record of records) {
        const key = by.map(b => String(record[b] ?? 'null')).join('||')
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(record)
      }

      let result = Array.from(groups.entries()).map(([key, groupRecords]) => {
        const groupKey: Record<string, unknown> = {}
        by.forEach((b, i) => {
          groupKey[b] = groupRecords[0][b]
        })
        return { ...groupKey, _count: groupRecords.length, _key: key }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = applyOrderBy(result as any, args.orderBy) as any[]
      if (args.take) result = result.slice(0, args.take as number)

      return result
    },

    aggregate: async (args: Record<string, unknown> = {}) => {
      const store = getStore(modelName)
      let records = Array.from(store.values())

      if (args.where) {
        records = records.filter(r => matchesWhere(r, args.where as Record<string, unknown>))
      }

      const result: Record<string, unknown> = { _count: records.length }

      for (const [aggOp, aggFields] of Object.entries(args)) {
        if (!aggOp.startsWith('_')) continue
        const fields = aggFields as Record<string, unknown>
        for (const [field] of Object.entries(fields)) {
          const values = records.map(r => r[field] as number).filter(v => typeof v === 'number')
          if (values.length === 0) continue

          switch (aggOp) {
            case '_avg':
              result._avg = result._avg || {}
              ;(result._avg as Record<string, unknown>)[field] = values.reduce((a, b) => a + b, 0) / values.length
              break
            case '_sum':
              result._sum = result._sum || {}
              ;(result._sum as Record<string, unknown>)[field] = values.reduce((a, b) => a + b, 0)
              break
            case '_min':
              result._min = result._min || {}
              ;(result._min as Record<string, unknown>)[field] = Math.min(...values)
              break
            case '_max':
              result._max = result._max || {}
              ;(result._max as Record<string, unknown>)[field] = Math.max(...values)
              break
          }
        }
      }

      return result
    },
  }
}

// ─── Main proxy ───
const modelHandlers = new Map<string, ReturnType<typeof createModelHandler>>()

export function createUniversalMemDb() {
  return new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === '$connect' || prop === '$disconnect' || prop === '$transaction' || prop === '$extends') {
        return async () => {}
      }
      if (prop === '$on' || prop === '$use' || prop === '$queryRaw' || prop === '$executeRaw' || prop === '$runCommandRaw') {
        return async () => ({})
      }

      if (!modelHandlers.has(prop)) {
        modelHandlers.set(prop, createModelHandler(prop))
      }
      return modelHandlers.get(prop)
    },
  })
}

// Singleton
let _instance: ReturnType<typeof createUniversalMemDb> | null = null

export function getUniversalMemDb(): ReturnType<typeof createUniversalMemDb> {
  if (!_instance) _instance = createUniversalMemDb()
  return _instance
}
