'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Code2,
  BookOpen,
  Terminal,
  Plug,
  Zap,
  Copy,
  CheckCircle2,
  ExternalLink,
  FileJson,
  Webhook,
  Shield,
  Box,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/* ─── Animation ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}
const stagger = { visible: { transition: { staggerChildren: 0.08 } } }

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={stagger} className={className}>
      {children}
    </motion.div>
  )
}

/* ─── Code block with copy ─── */
function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast({ title: 'Copied!', description: 'Code copied to clipboard.' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group rounded-xl bg-muted/50 border border-border/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/30">
        <span className="text-[10px] font-mono text-muted-foreground">{language}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={handleCopy}>
          {copied ? <CheckCircle2 className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
        </Button>
      </div>
      <pre className="p-4 text-xs font-mono text-foreground/80 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function SdkDocsPage() {
  const { dir } = useTranslation()
  const [sdkData, setSdkData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSdk = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/sdk')
      const data = await res.json()
      setSdkData(data)
    } catch {
      console.error('Failed to fetch SDK docs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSdk() }, [fetchSdk])

  const endpoints = (sdkData?.endpoints as Array<{ method: string; path: string; description: string; auth: boolean }>) || []
  const hooks = (sdkData?.hooks as Array<{ name: string; description: string; params: string[] }>) || []

  return (
    <div className="min-h-screen flex flex-col mesh-gradient noise-overlay" dir={dir}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-premium">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Link>
            <Image src="/images/logo.png" alt="TheOneWayGDA" width={28} height={28} className="rounded-lg flex-shrink-0" />
            <span className="text-lg font-bold gradient-text-premium whitespace-nowrap">SDK Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/ai/extensions">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <Plug className="size-3.5" />
                <span className="hidden sm:inline">Extensions</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Hero */}
        <section className="hero-gradient rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/5 pointer-events-none" />
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10">
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-cyan-500/30 bg-cyan-500/5 mb-4">
                <Code2 className="size-3.5 text-cyan-400 me-1.5" />
                Developer API
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text-premium">The One-Way SDK</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Build custom extensions, automate workflows, and integrate with external tools.
              Full REST API access with comprehensive SDK support for TypeScript, Python, and more.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">v{(sdkData?.sdk as Record<string, string>)?.version || '1.0.0'}</Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">{endpoints.length} Endpoints</Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">{hooks.length} Hooks</Badge>
            </motion.div>
          </motion.div>
        </section>

        <Tabs defaultValue="quickstart" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quickstart" className="gap-2 text-xs">
              <Terminal className="size-3.5" />
              <span className="hidden sm:inline">Quick Start</span>
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-2 text-xs">
              <FileJson className="size-3.5" />
              <span className="hidden sm:inline">API Reference</span>
            </TabsTrigger>
            <TabsTrigger value="hooks" className="gap-2 text-xs">
              <Webhook className="size-3.5" />
              <span className="hidden sm:inline">Extension Hooks</span>
            </TabsTrigger>
            <TabsTrigger value="examples" className="gap-2 text-xs">
              <BookOpen className="size-3.5" />
              <span className="hidden sm:inline">Examples</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Start */}
          <TabsContent value="quickstart" className="mt-8 space-y-6">
            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">Installation</h3>
                <p className="text-sm text-muted-foreground mb-4">Install the SDK and initialize with your API credentials.</p>
                <CodeBlock
                  language="bash"
                  code={`npm install @oneway/sdk`}
                />
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">Initialize the Client</h3>
                <p className="text-sm text-muted-foreground mb-4">Set up the SDK with your base URL and authentication token.</p>
                <CodeBlock
                  language="typescript"
                  code={`import OnewaySDK from '@oneway/sdk';

const sdk = new OnewaySDK({
  baseUrl: 'https://api.theoneway.ai',
  token: process.env.ONEWAY_API_KEY,
});

// Verify connection
const health = await sdk.health.check();
console.log('Platform status:', health.status);`}
                />
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-4">Include your token in request headers. Use either Bearer token or visitor-id header.</p>
                <CodeBlock
                  language="typescript"
                  code={`// Method 1: Bearer token (recommended)
headers: {
  'Authorization': 'Bearer your-api-token',
}

// Method 2: Visitor ID header
headers: {
  'x-visitor-id': 'visitor-email@example.com',
}`}
                />
              </motion.div>
            </AnimatedSection>
          </TabsContent>

          {/* API Reference */}
          <TabsContent value="endpoints" className="mt-8 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <AnimatedSection>
                <div className="space-y-3">
                  {endpoints.map((ep, i) => (
                    <motion.div key={ep.path + ep.method} variants={fadeUp} custom={i}>
                      <Card className="card-premium hover:border-primary/20 transition-all duration-300">
                        <CardContent className="p-4 flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className={`text-xs font-mono font-bold min-w-[60px] justify-center ${
                              ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              ep.method === 'POST' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {ep.method}
                          </Badge>
                          <code className="text-sm font-mono text-foreground/80 flex-1">{ep.path}</code>
                          <span className="text-xs text-muted-foreground hidden sm:block max-w-xs truncate">{ep.description}</span>
                          {ep.auth && (
                            <Badge variant="secondary" className="text-[9px] gap-1">
                              <Shield className="size-2" />Auth
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </AnimatedSection>
            )}
          </TabsContent>

          {/* Extension Hooks */}
          <TabsContent value="hooks" className="mt-8 space-y-6">
            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">Available Hook Points</h3>
                <p className="text-sm text-muted-foreground mb-4">Extension hooks allow you to inject custom behavior at specific points in the analysis pipeline.</p>
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="space-y-3">
                {hooks.map((hook, i) => (
                  <motion.div key={hook.name} variants={fadeUp} custom={i}>
                    <Card className="card-premium hover:border-primary/20 transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <Webhook className="size-4 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <code className="text-sm font-mono text-foreground/90 font-semibold">{hook.name}</code>
                            <p className="text-xs text-muted-foreground mt-0.5">{hook.description}</p>
                            <div className="flex gap-1.5 mt-2">
                              {hook.params.map((p) => (
                                <Badge key={p} variant="secondary" className="text-[9px] font-mono">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>
          </TabsContent>

          {/* Examples */}
          <TabsContent value="examples" className="mt-8 space-y-6">
            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">AI Copilot Chat</h3>
                <p className="text-sm text-muted-foreground mb-4">Send messages to the AI Copilot and receive intelligent analysis suggestions.</p>
                <CodeBlock
                  language="typescript"
                  code={`const response = await sdk.ai.chat({
  message: 'What statistical test should I use for comparing two groups?',
  context: 'workspace',  // 'workspace' | 'leaderboard' | 'community'
  sessionId: 'my-session-id',
});

console.log(response.message);  // AI response text
console.log(response.tokens);   // Token usage`}
                />
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">Generate Workflow Pipeline</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a complete analysis pipeline from a natural language intent.</p>
                <CodeBlock
                  language="typescript"
                  code={`const pipeline = await sdk.ai.createWorkflow({
  intent: 'Analyze correlation between marketing spend and revenue',
  context: 'workspace',
  pageData: {
    datasetInfo: { rows: 5000, columns: 12 },
  },
});

console.log(pipeline.name);        // 'Marketing Spend Correlation Analysis'
console.log(pipeline.steps);       // Array of analysis steps
console.log(pipeline.execSummary); // AI-generated summary`}
                />
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <motion.div variants={fadeUp}>
                <h3 className="text-lg font-bold mb-2">Build a Custom Extension</h3>
                <p className="text-sm text-muted-foreground mb-4">Register a custom extension that hooks into the platform event system.</p>
                <CodeBlock
                  language="typescript"
                  code={`// Register a custom visualization extension
const extension = await sdk.extensions.register({
  name: 'My Custom Chart',
  type: 'visualization',
  version: '1.0.0',
  hooks: ['workspace:chart'],
  config: { chartType: 'radar', animated: 'true' },
});

console.log(extension.id); // 'ext-...'`}
                />
              </motion.div>
            </AnimatedSection>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
