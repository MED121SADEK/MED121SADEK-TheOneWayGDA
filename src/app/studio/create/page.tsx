'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Bot,
  Palette,
  Sparkles,
  Star,
  Download,
  Code2,
  DollarSign,
  Check,
  Loader2,
  Eye,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

/* ═══════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════ */
const CATEGORIES = [
  { value: 'data_analyst', label: 'Data Analyst' },
  { value: 'ml_engineer', label: 'ML Engineer' },
  { value: 'code_gen', label: 'Code Gen' },
  { value: 'statistician', label: 'Statistician' },
  { value: 'report_writer', label: 'Report Writer' },
  { value: 'creative', label: 'Creative' },
  { value: 'domain_expert', label: 'Domain Expert' },
] as const

const CATEGORY_LABELS: Record<string, string> = {
  data_analyst: 'Data Analyst',
  ml_engineer: 'ML Engineer',
  code_gen: 'Code Gen',
  statistician: 'Statistician',
  report_writer: 'Report Writer',
  creative: 'Creative',
  domain_expert: 'Domain Expert',
}

const CATEGORY_COLORS: Record<string, string> = {
  data_analyst: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ml_engineer: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  code_gen: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  statistician: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  report_writer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  creative: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  domain_expert: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#14b8a6', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#f43f5e', '#5B8DB8',
]

const TOOLS_OPTIONS = [
  { id: 'workspace', label: 'Workspace', desc: 'Data analysis workspace tools' },
  { id: 'leaderboard', label: 'Leaderboard', desc: 'AI model benchmarking access' },
  { id: 'community', label: 'Community', desc: 'Community & sharing features' },
]

/* ═══════════════════════════════════════════════
   Form State
   ═══════════════════════════════════════════════ */
interface FormState {
  name: string
  description: string
  category: string
  systemPrompt: string
  tags: string
  avatarColor: string
  pricing: string
  price: string
  tools: string[]
}

/* ═══════════════════════════════════════════════
   Preview Card Component
   ═══════════════════════════════════════════════ */
function CopilotPreviewCard({ form }: { form: FormState }) {
  const initials = form.name
    ? form.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AB'

  const tagList = form.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="card-premium overflow-hidden border-border/40 bg-card/80 p-0">
        <div className="relative h-20 bg-gradient-to-r from-primary/20 via-purple-500/10 to-pink-500/10">
          <div className="absolute -bottom-6 left-4">
            <div
              className="size-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ring-4 ring-card"
              style={{
                backgroundColor: form.avatarColor,
                boxShadow: `0 8px 24px ${form.avatarColor}33`,
              }}
            >
              {initials}
            </div>
          </div>
        </div>

        <CardContent className="pt-10 pb-4 px-4">
          <h3 className="text-sm font-semibold truncate">
            {form.name || 'Your Copilot Name'}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">by You · v1.0.0</p>

          <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {form.description || 'Your copilot description will appear here...'}
          </p>

          <div className="mt-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  className="text-muted-foreground/20"
                />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">New</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {form.category && (
              <Badge
                variant="outline"
                className={`text-[9px] font-medium px-1.5 py-0 ${CATEGORY_COLORS[form.category] || 'border-border/60 text-muted-foreground'}`}
              >
                {CATEGORY_LABELS[form.category] || form.category}
              </Badge>
            )}
            {form.pricing === 'paid' && form.price && (
              <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[9px] font-medium text-amber-400 px-1.5 py-0">
                ${form.price}/mo
              </Badge>
            )}
            {tagList.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="border-border/40 text-[9px] text-muted-foreground px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>

          <Separator className="my-3 bg-border/30" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Download size={11} />
                0
              </span>
            </div>
            <Button size="sm" className="h-7 gap-1 rounded-md px-2.5 text-[11px]">
              {form.pricing === 'paid' && form.price ? `$${form.price}/mo` : 'Free'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   Main Create Page
   ═══════════════════════════════════════════════ */
export default function CreateCopilotPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    category: '',
    systemPrompt: '',
    tags: '',
    avatarColor: '#5B8DB8',
    pricing: 'free',
    price: '',
    tools: [],
  })

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleTool(toolId: string) {
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter((t) => t !== toolId)
        : [...prev.tools, toolId],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      toast.error('Please enter a copilot name')
      return
    }
    if (!form.description.trim()) {
      toast.error('Please enter a description')
      return
    }
    if (!form.category) {
      toast.error('Please select a category')
      return
    }
    if (!form.systemPrompt.trim()) {
      toast.error('Please enter a system prompt')
      return
    }
    if (form.pricing === 'paid' && (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)) {
      toast.error('Please enter a valid price')
      return
    }

    setSubmitting(true)
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      const res = await fetch('/api/studio/copilots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags,
          price: form.pricing === 'paid' ? Number(form.price) : null,
          authorId: 'studio-user@theonewaygda.com',
          authorName: 'Studio User',
        }),
      })

      if (res.ok) {
        toast.success('Copilot created successfully! 🎉')
        router.push('/studio')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create copilot')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* ── Header ── */}
        <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Link href="/studio">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Back to Studio</span>
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-5 bg-border/60" />
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-primary" />
                <span className="text-sm font-medium">Create Copilot</span>
              </div>
            </div>

            <Link href="/studio">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs">
                <Eye size={13} />
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-4">
              <Sparkles size={14} />
              <span>Create Your AI Assistant</span>
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Build Your Custom Copilot
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
              Define its personality, capabilities, and tools. Your copilot will be available in the marketplace for others to discover and install.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* ── Left: Form ── */}
              <div className="space-y-6">
                {/* Basic Info */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <Card className="border-border/40 bg-card/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Code2 size={16} className="text-primary" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Copilot Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="e.g. BioData Analyst, Quantum ML Engineer..."
                          value={form.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          maxLength={60}
                          className="rounded-xl border-border/60 bg-muted/20"
                        />
                        <p className="text-xs text-muted-foreground/70">
                          {form.name.length}/60 characters
                        </p>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium">
                          Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Describe what your copilot does, its specialties, and who it's for..."
                          value={form.description}
                          onChange={(e) => updateField('description', e.target.value)}
                          rows={3}
                          maxLength={500}
                          className="rounded-xl border-border/60 bg-muted/20 resize-none"
                        />
                        <p className="text-xs text-muted-foreground/70">
                          {form.description.length}/500 characters
                        </p>
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium">
                          Category <span className="text-destructive">*</span>
                        </Label>
                        <Select value={form.category} onValueChange={(v) => updateField('category', v)}>
                          <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/20">
                            <SelectValue placeholder="Select a category..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* System Prompt */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <Card className="border-border/40 bg-card/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Bot size={16} className="text-primary" />
                        System Prompt <span className="text-destructive">*</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Textarea
                        placeholder="You are a specialized AI assistant that helps with... Always provide step-by-step explanations and code examples when applicable."
                        value={form.systemPrompt}
                        onChange={(e) => updateField('systemPrompt', e.target.value)}
                        rows={8}
                        maxLength={4000}
                        className="rounded-xl border-border/60 bg-muted/20 font-mono text-sm resize-none"
                      />
                      <p className="text-xs text-muted-foreground/70">
                        {form.systemPrompt.length}/4000 characters — This defines how your copilot behaves
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Tools, Tags, Appearance */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <Card className="border-border/40 bg-card/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Palette size={16} className="text-primary" />
                        Customization
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Tools */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Enabled Tools</Label>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {TOOLS_OPTIONS.map((tool) => (
                            <label
                              key={tool.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                                form.tools.includes(tool.id)
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-border/60 hover:border-border'
                              }`}
                            >
                              <Checkbox
                                checked={form.tools.includes(tool.id)}
                                onCheckedChange={() => toggleTool(tool.id)}
                                className="mt-0.5"
                              />
                              <div>
                                <span className="text-sm font-medium">{tool.label}</span>
                                <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <Separator className="bg-border/40" />

                      {/* Tags */}
                      <div className="space-y-2">
                        <Label htmlFor="tags" className="text-sm font-medium">
                          Tags
                        </Label>
                        <Input
                          id="tags"
                          placeholder="python, ML, statistics, R (comma separated)"
                          value={form.tags}
                          onChange={(e) => updateField('tags', e.target.value)}
                          className="rounded-xl border-border/60 bg-muted/20"
                        />
                        <p className="text-xs text-muted-foreground/70">
                          Separate with commas. Max 10 tags recommended.
                        </p>
                      </div>

                      <Separator className="bg-border/40" />

                      {/* Avatar Color */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Avatar Color</Label>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              type="button"
                              key={color}
                              onClick={() => updateField('avatarColor', color)}
                              className={`size-8 rounded-lg transition-all ${
                                form.avatarColor === color
                                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110'
                                  : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Label htmlFor="customColor" className="text-xs text-muted-foreground">
                            Custom:
                          </Label>
                          <Input
                            id="customColor"
                            type="color"
                            value={form.avatarColor}
                            onChange={(e) => updateField('avatarColor', e.target.value)}
                            className="h-8 w-16 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
                          />
                          <Input
                            value={form.avatarColor}
                            onChange={(e) => updateField('avatarColor', e.target.value)}
                            className="h-8 w-28 rounded-lg border-border/60 bg-muted/20 font-mono text-xs"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Pricing */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                >
                  <Card className="border-border/40 bg-card/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <DollarSign size={16} className="text-primary" />
                        Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3">
                        {(['free', 'paid'] as const).map((p) => (
                          <button
                            type="button"
                            key={p}
                            onClick={() => updateField('pricing', p)}
                            className={`flex-1 rounded-xl border p-3 text-center transition-all ${
                              form.pricing === p
                                ? 'border-primary/40 bg-primary/5'
                                : 'border-border/60 hover:border-border'
                            }`}
                          >
                            <span className="text-sm font-medium capitalize">
                              {p === 'free' ? '🆓 Free' : '💰 Paid'}
                            </span>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {p === 'free'
                                ? 'Available for everyone'
                                : 'Monthly subscription'}
                            </p>
                          </button>
                        ))}
                      </div>

                      {form.pricing === 'paid' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <Label htmlFor="price" className="text-sm font-medium">
                            Monthly Price (USD)
                          </Label>
                          <div className="relative">
                            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="price"
                              type="number"
                              step="0.01"
                              min="0.99"
                              placeholder="9.99"
                              value={form.price}
                              onChange={(e) => updateField('price', e.target.value)}
                              className="rounded-xl border-border/60 bg-muted/20 pl-8"
                            />
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Submit */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <p className="text-xs text-muted-foreground/70">
                      By creating a copilot, you agree to our community guidelines. Your copilot will be public in the marketplace.
                    </p>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="btn-glow gap-2 rounded-xl px-8 shadow-lg shadow-primary/20"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Publish Copilot
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>

              {/* ── Right: Preview ── */}
              <div className="hidden lg:block">
                <div className="sticky top-20">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Eye size={14} />
                    Live Preview
                  </div>

                  <CopilotPreviewCard form={form} />

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-border/40 bg-card/40 p-3">
                      <p className="text-[11px] font-medium text-muted-foreground mb-2">Completion Checklist</p>
                      {[
                        { label: 'Name', done: !!form.name.trim() },
                        { label: 'Description', done: !!form.description.trim() },
                        { label: 'Category', done: !!form.category },
                        { label: 'System Prompt', done: !!form.systemPrompt.trim() },
                        { label: 'Avatar Color', done: !!form.avatarColor },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2 text-xs">
                          <div
                            className={`size-4 rounded-full flex items-center justify-center ${
                              item.done
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-muted/40 text-muted-foreground/40'
                            }`}
                          >
                            {item.done ? (
                              <Check size={10} />
                            ) : (
                              <span className="text-[8px]">○</span>
                            )}
                          </div>
                          <span className={item.done ? 'text-foreground' : 'text-muted-foreground/60'}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Card className="border-border/40 bg-card/40 p-3">
                      <p className="text-[11px] font-medium text-muted-foreground mb-2">Tips</p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground/70">
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          Write a clear system prompt for best results
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          Add relevant tags to improve discoverability
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          Choose an avatar color that matches your brand
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          Enable tools to unlock extra capabilities
                        </li>
                      </ul>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </TooltipProvider>
  )
}
