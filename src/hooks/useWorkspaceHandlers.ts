'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useAppStore } from '@/lib/store'
import { generateQuickReport } from '@/components/workspace/ReportGenerator'
import { useAnalysisHandlers } from '@/hooks/workspace/analysis-handlers'
import { useDataQualityHandlers } from '@/hooks/workspace/data-quality-handlers'
import { useAIHandlers } from '@/hooks/workspace/ai-handlers'

/* ─── Hook ─── */
export function useWorkspaceHandlers() {
  const { t } = useTranslation()
  const store = useAppStore()

  // Dialog states
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [newVarDialogOpen, setNewVarDialogOpen] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarType, setNewVarType] = useState<'numeric' | 'string' | 'date' | 'currency'>('numeric')
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false)
  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [nonparamDialogOpen, setNonparamDialogOpen] = useState(false)
  const [nonparamType, setNonparamType] = useState<'mann-whitney' | 'wilcoxon'>('mann-whitney')
  const [nonparamVar1, setNonparamVar1] = useState('')
  const [nonparamVar2, setNonparamVar2] = useState('')
  const [crosstabsDialogOpen, setCrosstabsDialogOpen] = useState(false)
  const [crosstabRowVar, setCrosstabRowVar] = useState('')
  const [crosstabColVar, setCrosstabColVar] = useState('')
  const [ttestDialogOpen, setTtestDialogOpen] = useState(false)
  const [ttestGroupVar, setTtestGroupVar] = useState('')
  const [ttestValueVar, setTtestValueVar] = useState('')
  const [anovaDialogOpen, setAnovaDialogOpen] = useState(false)
  const [anovaGroupVar, setAnovaGroupVar] = useState('')
  const [anovaValueVar, setAnovaValueVar] = useState('')

  // Form states
  const [chatInput, setChatInput] = useState('')

  // Computation loading states
  const [isValidating, setIsValidating] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchInputRef = useRef<HTMLInputElement>(null)
  const chatAbortRef = useRef<AbortController | null>(null)
  const agentAbortRef = useRef<AbortController | null>(null)

  // Set workspace view on mount
  useEffect(() => {
    store.setView('workspace')
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [store.chatMessages, store.isAiTyping])

  const getNumericVals = useCallback((varName: string): number[] => {
    return (store.data[varName] || []).map(v => typeof v === 'string' ? parseFloat(v) : v).filter((v): v is number => typeof v === 'number' && !isNaN(v))
  }, [store.data])

  const handleImportCSV = useCallback(() => {
    if (!importText.trim()) return
    store.importCSV(importText.trim())
    setImportDialogOpen(false)
    setImportText('')
  }, [importText, store])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    store.importFile(file)
    setImportDialogOpen(false)
  }, [store])

  const handleExportCSV = useCallback(() => {
    const csv = store.exportCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${store.currentProject?.name || 'data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [store])

  const handleExportJSON = useCallback(() => {
    const json = store.exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.json'
    a.click()
  }, [store])

  const handleAddVariable = useCallback(() => {
    if (!newVarName.trim()) return
    store.addVariable({
      id: Date.now().toString(36),
      name: newVarName.trim(),
      type: newVarType,
      label: newVarName.trim(),
      width: 8,
      decimals: newVarType === 'numeric' ? 2 : 0,
      missing: '',
      values: {},
    })
    setNewVarName('')
    setNewVarDialogOpen(false)
  }, [newVarName, newVarType, store])

  const handleExportPDF = useCallback(() => {
    generateQuickReport(store.outputs, store.currentProject?.name)
  }, [store.outputs, store.currentProject?.name])

  // ─── Sub-hooks ───
  const analysisHandlers = useAnalysisHandlers({
    store, t, getNumericVals,
    crosstabRowVar, crosstabColVar,
    ttestGroupVar, ttestValueVar,
    anovaGroupVar, anovaValueVar,
    nonparamType, nonparamVar1, nonparamVar2,
    setCrosstabsDialogOpen, setTtestDialogOpen, setAnovaDialogOpen, setNonparamDialogOpen,
  })

  const dataQualityHandlers = useDataQualityHandlers({
    store, getNumericVals,
    isValidating, isCleaning, isTransforming,
    setIsValidating, setIsCleaning, setIsTransforming, setCleanDialogOpen,
  })

  const aiHandlers = useAIHandlers({
    store, chatInput, setChatInput, chatAbortRef, agentAbortRef,
  })

  const rowCount = store.variables.length > 0 ? Math.max(0, ...Object.values(store.data).map(a => a.length)) : 0

  return {
    // Store
    store,
    t,
    rowCount,

    // Dialog states
    shareDialogOpen, setShareDialogOpen,
    shareEmail, setShareEmail,
    shareLink, setShareLink,
    importDialogOpen, setImportDialogOpen,
    importText, setImportText,
    newVarDialogOpen, setNewVarDialogOpen,
    newVarName, setNewVarName,
    newVarType, setNewVarType,
    scanDialogOpen, setScanDialogOpen,
    cleanDialogOpen, setCleanDialogOpen,
    validateDialogOpen, setValidateDialogOpen,
    scanFile, setScanFile,
    scanPreview, setScanPreview,
    editedFields, setEditedFields,
    nonparamDialogOpen, setNonparamDialogOpen,
    nonparamType, setNonparamType,
    nonparamVar1, setNonparamVar1,
    nonparamVar2, setNonparamVar2,
    crosstabsDialogOpen, setCrosstabsDialogOpen,
    crosstabRowVar, setCrosstabRowVar,
    crosstabColVar, setCrosstabColVar,
    ttestDialogOpen, setTtestDialogOpen,
    ttestGroupVar, setTtestGroupVar,
    ttestValueVar, setTtestValueVar,
    anovaDialogOpen, setAnovaDialogOpen,
    anovaGroupVar, setAnovaGroupVar,
    anovaValueVar, setAnovaValueVar,

    // Form states
    chatInput, setChatInput,

    // Refs
    chatEndRef,
    fileInputRef,
    batchInputRef,

    // Validation & Cleaning
    validationResults: dataQualityHandlers.validationResults,
    setValidationResults: dataQualityHandlers.setValidationResults,
    isValidating, isCleaning, isTransforming,
    handleValidate: dataQualityHandlers.handleValidate,
    handleClean: dataQualityHandlers.handleClean,

    // Transformations
    handleTransformZScore: dataQualityHandlers.handleTransformZScore,
    handleTransformNormalize: dataQualityHandlers.handleTransformNormalize,
    handleTransformLog: dataQualityHandlers.handleTransformLog,

    // Auto Profile
    handleAutoProfile: dataQualityHandlers.handleAutoProfile,

    // Handlers
    handleImportCSV,
    handleFileUpload,
    handleExportCSV,
    handleExportJSON,
    handleAddVariable,
    getNumericVals,
    handleRunDescriptive: analysisHandlers.handleRunDescriptive,
    handleRunCorrelation: analysisHandlers.handleRunCorrelation,
    handleRunRegression: analysisHandlers.handleRunRegression,
    handleRunFrequencies: analysisHandlers.handleRunFrequencies,
    handleRunCrosstabs: analysisHandlers.handleRunCrosstabs,
    handleRunTTest: analysisHandlers.handleRunTTest,
    handleRunANOVA: analysisHandlers.handleRunANOVA,
    handleRunChiSquare: analysisHandlers.handleRunChiSquare,
    handleRunNonparametric: analysisHandlers.handleRunNonparametric,
    handleExportPDF,
    handleSendChat: aiHandlers.handleSendChat,
    handleRunAgentAnalysis: aiHandlers.handleRunAgentAnalysis,
    handleCancelAgent: aiHandlers.handleCancelAgent,
  }
}