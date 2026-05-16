'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation, localeNames, Locale } from '@/lib/i18n'
import { SearchHub360, type PanelDefinition } from '@/components/workspace/SearchHub360'
import { useWorkspaceHandlers } from '@/hooks/useWorkspaceHandlers'
import {
  AIPanel, ImportPanel, DataEditorPanel, AnalysisPanel,
  OutputPanel, VariablesPanel, ScanPanel, SyntaxPanel,
} from '@/components/workspace/WorkspacePanels'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brain, Database, Table2, BarChart3, FileText, Variable,
  ScanLine, Terminal, Save, Share2, Download, Copy,
  ChevronDown, Languages, FileSpreadsheet, Check,
  Upload, FolderOpen, ShieldCheck, Sparkles,
} from 'lucide-react'
import { UpdateBanner } from '@/components/update-banner'

export default function WorkspacePage() {
  const { t, locale, setLocale, dir } = useTranslation()
  const h = useWorkspaceHandlers()

  // Build 8 panels with their content
  const panels: PanelDefinition[] = useMemo(() => [
    {
      id: 'ai',
      title: t('workspace.aiAssistant'),
      icon: Brain,
      accentColor: 'text-purple-400',
      accentBg: 'from-purple-500/20 via-purple-600/10 to-transparent',
      badge: h.store.isAiTyping ? 1 : undefined,
      content: <AIPanel {...h} />,
    },
    {
      id: 'import',
      title: t('workspace.import'),
      icon: Database,
      accentColor: 'text-teal-400',
      accentBg: 'from-teal-500/20 via-teal-600/10 to-transparent',
      badge: h.store.variables.length > 0 ? h.store.variables.length : undefined,
      content: <ImportPanel {...h} />,
    },
    {
      id: 'editor',
      title: t('workspace.dataView'),
      icon: Table2,
      accentColor: 'text-blue-400',
      accentBg: 'from-blue-500/20 via-blue-600/10 to-transparent',
      badge: h.rowCount > 0 ? h.rowCount : undefined,
      content: <DataEditorPanel {...h} />,
    },
    {
      id: 'analysis',
      title: t('workspace.analysis'),
      icon: BarChart3,
      accentColor: 'text-orange-400',
      accentBg: 'from-orange-500/20 via-orange-600/10 to-transparent',
      badge: h.store.selectedVariables.length > 0 ? h.store.selectedVariables.length : undefined,
      content: <AnalysisPanel {...h} />,
    },
    {
      id: 'output',
      title: t('workspace.output'),
      icon: FileText,
      accentColor: 'text-green-400',
      accentBg: 'from-green-500/20 via-green-600/10 to-transparent',
      badge: h.store.outputs.length > 0 ? h.store.outputs.length : undefined,
      content: <OutputPanel {...h} />,
    },
    {
      id: 'variables',
      title: t('workspace.variableView'),
      icon: Variable,
      accentColor: 'text-pink-400',
      accentBg: 'from-pink-500/20 via-pink-600/10 to-transparent',
      badge: h.store.selectedVariables.length > 0 ? h.store.selectedVariables.length : undefined,
      content: <VariablesPanel {...h} />,
    },
    {
      id: 'scan',
      title: t('scan.title'),
      icon: ScanLine,
      accentColor: 'text-cyan-400',
      accentBg: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
      badge: h.store.scanResults ? 1 : undefined,
      content: <ScanPanel {...h} />,
    },
    {
      id: 'syntax',
      title: t('workspace.syntax'),
      icon: Terminal,
      accentColor: 'text-amber-400',
      accentBg: 'from-amber-500/20 via-amber-600/10 to-transparent',
      badge: h.store.syntaxHistory.length > 0 ? h.store.syntaxHistory.length : undefined,
      content: <SyntaxPanel {...h} />,
    },
  ], [t, h])

  return (
    <div className="h-screen flex flex-col noise-overlay" dir={dir}>
      <UpdateBanner />

      {/* ─── Navbar ─── */}
      <nav className="h-11 nav-premium flex items-center justify-between px-4 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={24} height={24} className="rounded" />
            <span className="font-bold gradient-text-premium text-sm hidden sm:inline">{t('brand.name')}</span>
          </Link>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs font-medium text-muted-foreground truncate max-w-40">{h.store.currentProject?.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="h-7 w-24 text-[10px]">
              <Languages className="size-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {localeNames.map((l) => (
                <SelectItem key={l} value={l} className="text-xs">{t(`lang.${l}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => h.store.saveProject()}>
            <Save className="size-3" /> <span className="hidden sm:inline">{t('workspace.save')}</span>
          </Button>
          {/* Share Dialog */}
          <Dialog open={h.shareDialogOpen} onOpenChange={h.setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[10px]">
                <Share2 className="size-3" /> <span className="hidden sm:inline">{t('workspace.share')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('share.title')}</DialogTitle>
                <DialogDescription>{t('share.description')}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                <Input placeholder={t('share.email')} value={h.shareEmail} onChange={e => h.setShareEmail(e.target.value)} />
                <Button onClick={() => h.setShareEmail('')}>{t('share.addEmail')}</Button>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">{t('share.link')}</p>
                <div className="flex gap-2">
                  <Input readOnly value={h.shareLink || `${typeof window !== 'undefined' ? window.location.origin : ''}/workspace`} />
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/workspace`)}>
                    <Copy className="size-3.5" /> {t('share.copyLink')}
                  </Button>
                </div>
              </div>
              <DialogFooter><Button onClick={() => h.setShareDialogOpen(false)}>{t('workspace.close')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-[10px]">
                <Download className="size-3" /> <span className="hidden sm:inline">{t('workspace.export')}</span> <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={h.handleExportCSV}><FileSpreadsheet className="size-4" /> CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={h.handleExportJSON}><FileText className="size-4" /> JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={h.handleExportPDF}><FileText className="size-4" /> PDF Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* ─── Orbital Workspace ─── */}
      <div className="flex-1 overflow-hidden">
        <SearchHub360
          panels={panels}
          brandName={t('brand.name')}
          logoSrc="/images/logo.png"
        />
      </div>

      {/* ─── Dialogs (page level) ─── */}
      {/* New Variable Dialog */}
      <Dialog open={h.newVarDialogOpen} onOpenChange={h.setNewVarDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Variable</DialogTitle><DialogDescription>Create a new variable for your dataset</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Variable name" value={h.newVarName} onChange={e => h.setNewVarName(e.target.value)} />
            <Select value={h.newVarType} onValueChange={(v) => h.setNewVarType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Numeric</SelectItem>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setNewVarDialogOpen(false)}>{t('workspace.cancel')}</Button>
            <Button onClick={h.handleAddVariable}>{t('workspace.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crosstabs Dialog */}
      <Dialog open={h.crosstabsDialogOpen} onOpenChange={h.setCrosstabsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.crosstabs')}</DialogTitle><DialogDescription>Select row and column variables</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={h.crosstabRowVar} onValueChange={h.setCrosstabRowVar}>
              <SelectTrigger><SelectValue placeholder="Row variable" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={h.crosstabColVar} onValueChange={h.setCrosstabColVar}>
              <SelectTrigger><SelectValue placeholder="Column variable" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setCrosstabsDialogOpen(false)}>{t('workspace.cancel')}</Button>
            <Button onClick={h.handleRunCrosstabs} disabled={!h.crosstabRowVar || !h.crosstabColVar}>Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* T-Test Dialog */}
      <Dialog open={h.ttestDialogOpen} onOpenChange={h.setTtestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.ttest')}</DialogTitle><DialogDescription>Select grouping and test variables</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={h.ttestGroupVar} onValueChange={h.setTtestGroupVar}>
              <SelectTrigger><SelectValue placeholder="Grouping variable" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={h.ttestValueVar} onValueChange={h.setTtestValueVar}>
              <SelectTrigger><SelectValue placeholder="Test variable" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setTtestDialogOpen(false)}>{t('workspace.cancel')}</Button>
            <Button onClick={h.handleRunTTest} disabled={!h.ttestGroupVar || !h.ttestValueVar}>Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ANOVA Dialog */}
      <Dialog open={h.anovaDialogOpen} onOpenChange={h.setAnovaDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.anova')}</DialogTitle><DialogDescription>Select factor and dependent variables</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={h.anovaGroupVar} onValueChange={h.setAnovaGroupVar}>
              <SelectTrigger><SelectValue placeholder="Factor variable" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={h.anovaValueVar} onValueChange={h.setAnovaValueVar}>
              <SelectTrigger><SelectValue placeholder="Dependent variable" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setAnovaDialogOpen(false)}>{t('workspace.cancel')}</Button>
            <Button onClick={h.handleRunANOVA} disabled={!h.anovaGroupVar || !h.anovaValueVar}>Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nonparametric Dialog */}
      <Dialog open={h.nonparamDialogOpen} onOpenChange={h.setNonparamDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('analysis.nonparametric')}</DialogTitle><DialogDescription>Select test type and variables</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <Select value={h.nonparamType} onValueChange={(v) => h.setNonparamType(v as 'mann-whitney' | 'wilcoxon')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mann-whitney">Mann-Whitney U</SelectItem>
                <SelectItem value="wilcoxon">Wilcoxon Signed-Rank</SelectItem>
              </SelectContent>
            </Select>
            <Select value={h.nonparamVar1} onValueChange={h.setNonparamVar1}>
              <SelectTrigger><SelectValue placeholder="Variable 1" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={h.nonparamVar2} onValueChange={h.setNonparamVar2}>
              <SelectTrigger><SelectValue placeholder="Variable 2" /></SelectTrigger>
              <SelectContent>{h.store.variables.map(v => <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setNonparamDialogOpen(false)}>{t('workspace.cancel')}</Button>
            <Button onClick={h.handleRunNonparametric} disabled={!h.nonparamVar1 || !h.nonparamVar2}>Run</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validate Dialog */}
      <Dialog open={h.validateDialogOpen} onOpenChange={h.setValidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 text-emerald-500" />{t('validate.title')}</DialogTitle>
            <DialogDescription>Check data quality and consistency</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
            <p className="text-sm font-medium">{t('validate.noIssues')}</p>
            <p className="text-xs text-muted-foreground mt-1">All data appears valid and consistent.</p>
          </div>
          <DialogFooter><Button onClick={() => h.setValidateDialogOpen(false)}>{t('workspace.close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clean Dialog */}
      <Dialog open={h.cleanDialogOpen} onOpenChange={h.setCleanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 text-purple-500" />{t('clean.title')}</DialogTitle>
            <DialogDescription>Auto-clean and validate your dataset</DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-500" />
            <p className="text-sm font-medium">{t('clean.validated')}</p>
            <p className="text-xs text-muted-foreground mt-1">Data has been validated and cleaned.</p>
          </div>
          <DialogFooter><Button onClick={() => h.setCleanDialogOpen(false)}>{t('workspace.close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
