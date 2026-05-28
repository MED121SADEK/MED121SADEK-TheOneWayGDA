const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, TableOfContents, LevelFormat, SectionType,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════
// PALETTE: GO-1 (Graphite Orange) — Proposals / PRD / Roadmap
// ═══════════════════════════════════════════════════════════
const P = {
  bg: "1A2330",
  primary: "000000",
  body: "2C2C2C",
  secondary: "5A6080",
  accent: "D4875A",
  surface: "F8F0EB",
  tableHeaderBg: "D4875A",
  tableHeaderText: "FFFFFF",
  tableAccentLine: "D4875A",
  tableInnerLine: "DDD0C8",
  tableSurface: "F8F0EB",
  cover: {
    bg: "1A2330",
    titleColor: "FFFFFF",
    subtitleColor: "B0B8C0",
    metaColor: "90989F",
    accent: "D4875A",
    footerColor: "687078",
  },
};

const c = (hex) => hex.replace("#", "");

// ═══════════════════════════════════════════════════════════
// BORDER HELPERS
// ═══════════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([
    ...",.;:!?-", ...' \t',
  ]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - SAFETY;
  const titleHeight = titleLineCount * titlePt * 23;
  const englishLabelHeight = hasEnglishLabel ? 500 : 0;
  const subtitleHeight = hasSubtitle ? 400 : 0;
  const metaHeight = metaLineCount * 350;
  const totalContent = titleHeight + englishLabelHeight + subtitleHeight + metaHeight + fixedHeight;
  const remainingSpace = usableHeight - totalContent;
  const topSpacing = Math.min(5000, Math.max(2000, Math.floor(remainingSpace * 0.55)));
  const midSpacing = Math.max(300, Math.floor(remainingSpace * 0.15));
  const bottomSpacing = Math.max(1000, usableHeight - topSpacing - totalContent - midSpacing);
  return { topSpacing, midSpacing, bottomSpacing };
}

// ═══════════════════════════════════════════════════════════
// COVER BUILDER: R1 Pure Paragraph Left
// ═══════════════════════════════════════════════════════════
function buildCoverR1(config) {
  const CP = P.cover;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: CP.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: CP.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: CP.accent, font: { ascii: "Calibri" }, characterSpacing: 40 })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: CP.titleColor, font: { ascii: "Arial" } })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: CP.subtitleColor,
        font: { ascii: "Arial" } })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: CP.metaColor, font: { ascii: "Arial" } })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: CP.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: CP.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                                          " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: CP.footerColor, font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: CP.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════════
// CONTENT BUILDERS
// ═══════════════════════════════════════════════════════════
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.primary), font: { ascii: "Times New Roman" } })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.primary), font: { ascii: "Times New Roman" } })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: c(P.primary), font: { ascii: "Times New Roman" } })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman" } })],
  });
}

function bodyBold(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman" }, bold: true })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 80, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman" } })],
  });
}

function bulletBold(label, text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 80, line: 312 },
    children: [
      new TextRun({ text: label, size: 24, color: c(P.body), font: { ascii: "Times New Roman" }, bold: true }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Times New Roman" } }),
    ],
  });
}

function makeTable(headers, rows) {
  const headerCells = headers.map(h => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 21, color: P.tableHeaderText, font: { ascii: "Calibri" } })] })],
    shading: { type: ShadingType.CLEAR, fill: P.tableHeaderBg },
    borders: { top: NB, bottom: NB, left: NB, right: NB },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  }));

  const dataRows = rows.map((row, idx) => new TableRow({
    cantSplit: true,
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 21, color: c(P.body), font: { ascii: "Calibri" } })] })],
      shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: P.tableSurface } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      borders: { top: NB, bottom: NB, left: NB, right: NB },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.tableAccentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.tableAccentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.tableInnerLine },
      insideVertical: NB,
    },
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }), ...dataRows],
  });
}

function tableCaption(text) {
  return new Paragraph({
    spacing: { before: 60, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, size: 21, color: c(P.secondary), font: { ascii: "Calibri" }, italics: true })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

// ═══════════════════════════════════════════════════════════
// PAGE NUMBER FOOTERS
// ═══════════════════════════════════════════════════════════
function romanFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PAGE  \\* ROMAN  \\* MERGEFORMAT", size: 18, color: "808080", font: { ascii: "Calibri" } })],
    })],
  });
}

function arabicFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PAGE  \\* arabic  \\* MERGEFORMAT", size: 18, color: "808080", font: { ascii: "Calibri" } })],
    })],
  });
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════

// --- SECTION 1: COVER ---
const coverChildren = buildCoverR1({
  title: "TheOneWayGDA Digital Marketing Roadmap",
  englishLabel: "STRATEGIC GROWTH PLAN 2025-2026",
  subtitle: "SEO | Paid Advertising | Content Marketing | Email Automation | ABM",
  metaLines: [
    "Comprehensive Acquisition & Conversion Strategy",
    "Targeting Researchers, Data Scientists & AI Decision-Makers",
  ],
  footerLeft: "TheOneWayGDA",
  footerRight: "Confidential | May 2025",
  palette: P.cover,
});

// --- SECTION 2: FRONT MATTER (TOC) ---
const tocChildren = [
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
    children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: { ascii: "Times New Roman" }, color: c(P.primary) })],
  }),
  new TableOfContents("Table of Contents", {
    hyperlink: true, headingStyleRange: "1-3",
  }),
  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({ text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"", italics: true, size: 18, color: "888888", font: { ascii: "Calibri" } })],
  }),
  new Paragraph({ spacing: { before: 100 }, children: ["Table of Contents loaded successfully.", new PageBreak()] }),
];

// --- SECTION 3: BODY CONTENT ---
const bodyChildren = [
  // ═══ 1. EXECUTIVE SUMMARY ═══
  h1("1. Executive Summary"),

  body("This Digital Marketing Roadmap outlines a comprehensive, multi-channel growth strategy for TheOneWayGDA, an AI-powered statistical analysis and AI model comparison platform. The plan is designed to drive measurable user acquisition, brand awareness, and revenue growth across six core marketing pillars: Search Engine Optimization (SEO), Paid Advertising, Content Marketing, Email Marketing and Marketing Automation, and Account-Based Marketing (ABM). Each pillar is calibrated to reach the right decision-makers at the right time through the right channel, maximizing return on investment and accelerating the platform's path to market leadership."),

  body("TheOneWayGDA occupies a unique position in the market as the only platform that combines a comprehensive AI model leaderboard (comparing 19+ models across 6 industry-standard benchmarks) with a full-featured statistical analysis workspace that serves as a modern, AI-powered alternative to SPSS. This dual-value proposition allows the platform to target a broad yet well-defined audience spanning academic researchers, data scientists, AI engineers, enterprise analytics teams, and C-level technology decision-makers. The platform already features 127 pages of content, robust community features, AI-powered workflow automation, and multi-language support including full Arabic RTL capabilities."),

  body("The strategy is organized into five primary deliverables: an Acquisition Strategy that defines channel-specific tactics for reaching target segments; Targeted Advertising Campaigns spanning Google Ads, LinkedIn, and social media; a Lead Generation and Qualification framework with scoring models and nurturing sequences; Site and Conversion Optimization through A/B testing and UX improvements; and a Performance Monitoring system with KPIs dashboards and continuous improvement cadences. Implementation is structured across three phases spanning twelve months, with clear milestones, resource requirements, and expected ROI metrics for each phase."),

  body("Our primary objectives for the first twelve months include achieving 50,000 monthly organic visitors through SEO and content marketing, generating 5,000 qualified leads per month through paid and organic channels combined, converting 3% of free-tier users to paid plans through targeted email automation, and closing 20 enterprise accounts valued at $99/month or higher through ABM campaigns. The total recommended marketing budget across all channels is $150,000 for Year 1, with a projected ROI of 3.5x based on conservative conversion assumptions and industry benchmarks for B2B SaaS platforms in the AI and analytics space."),

  // ═══ 2. CURRENT STATE & MARKET ANALYSIS ═══
  h1("2. Current State & Market Analysis"),

  h2("2.1 Market Landscape"),

  body("The AI model evaluation and statistical analysis software market is experiencing rapid growth, driven by the explosive expansion of large language models (LLMs), increasing enterprise adoption of AI technologies, and the growing demand for data-driven decision-making tools. The global AI analytics market is projected to exceed $45 billion by 2027, with statistical software and model benchmarking tools representing a significant and growing segment. Key trends shaping this landscape include the proliferation of open-source and commercial AI models requiring systematic comparison, the shift from legacy statistical tools like SPSS and SAS to cloud-native, AI-powered alternatives, and the increasing importance of real-time performance metrics including latency, throughput, and cost-per-token in model selection decisions."),

  body("The competitive environment presents both challenges and opportunities. On the model benchmarking side, platforms like HuggingFace Leaderboard and LM Arena/Chatbot Arena provide model comparisons but lack the pricing transparency, live performance metrics, and enterprise integration features that TheOneWayGDA offers. On the statistical analysis side, established tools like SPSS, SAS, and Stata dominate the academic and enterprise markets but suffer from high licensing costs, steep learning curves, outdated interfaces, and limited AI integration. TheOneWayGDA's unique positioning at the intersection of these two markets, combined with its free tier, offline capabilities, built-in OCR, and multilingual support (8 languages including Arabic RTL), creates a compelling differentiation that no single competitor currently matches."),

  h2("2.2 Target Audience Segmentation"),

  body("Understanding and precisely targeting the right audience segments is fundamental to the success of this marketing roadmap. TheOneWayGDA serves a diverse user base with distinct needs, pain points, and decision-making processes. Our segmentation analysis identifies five primary audience tiers, each requiring tailored messaging, channel strategies, and content approaches. The following table provides a detailed breakdown of these segments, including their estimated market size, primary pain points, preferred acquisition channels, and estimated customer lifetime value."),

  makeTable(
    ["Segment", "Size", "Key Pain Points", "Channels", "CLV"],
    [
      ["Academic Researchers", "500K+", "Expensive tools, manual analysis, publication deadlines", "SEO, Content, Email", "$200-500"],
      ["Data Scientists", "300K+", "Complex workflows, model comparison gaps", "LinkedIn, Community, Ads", "$500-2,000"],
      ["AI/ML Engineers", "200K+", "No unified benchmarking, latency data", "GitHub, Reddit, Ads", "$300-1,500"],
      ["Enterprise Teams", "50K orgs", "Compliance, SSO, team collaboration", "ABM, LinkedIn, Events", "$5,000-50,000"],
      ["Students & Educators", "2M+", "SPSS cost, steep learning curve", "SEO, YouTube, Social", "$0-200"],
    ]
  ),
  tableCaption("Table 1: Target Audience Segmentation Overview"),

  h2("2.3 Competitive Positioning"),

  body("TheOneWayGDA's competitive advantage stems from its unique combination of capabilities that no single competitor currently replicates. Unlike HuggingFace, which focuses exclusively on model benchmarks without pricing or latency data, or SPSS, which provides statistical analysis without AI model comparison, TheOneWayGDA offers both in a unified, modern, AI-powered platform. The platform's offline-first architecture, built-in OCR for scanning paper forms, no-code automation engine, and comprehensive community features create multiple layers of differentiation. Additionally, the full Arabic RTL support and multilingual interface position the platform uniquely for the Middle Eastern and North African markets, an underserved segment in the analytics tools landscape."),

  body("From a pricing perspective, the free tier eliminates adoption barriers for individual researchers and students, while the Pro plan at $29/month and Enterprise plan at $99/month provide clear upgrade paths for teams and organizations requiring advanced features like SSO/SAML, dedicated support, and audit logs. The three-tier pricing model is competitive against SPSS (which can cost $1,000+ per year per user) and positions TheOneWayGDA as both an accessible entry point and a serious enterprise contender. This pricing strategy, combined with the platform's comprehensive feature set, supports an aggressive land-and-expand acquisition model where users start on the free tier and naturally upgrade as their needs grow."),

  // ═══ 3. ACQUISITION STRATEGY ═══
  h1("3. Acquisition Strategy"),

  body("The acquisition strategy for TheOneWayGDA is designed as an integrated, multi-channel approach that leverages each marketing pillar synergistically to maximize reach, minimize cost-per-acquisition, and build sustainable growth engines across organic and paid channels. The strategy prioritizes high-intent channels first (SEO, content marketing) to build a foundation of qualified organic traffic, then layers in paid channels (Google Ads, LinkedIn) for immediate volume and rapid testing, while email marketing automation and ABM campaigns nurture prospects through the consideration and decision stages. This layered approach ensures that the platform builds long-term organic equity while simultaneously capturing short-term demand through targeted paid campaigns."),

  h2("3.1 SEO Strategy"),

  h3("3.1.1 Technical SEO Foundation"),

  body("TheOneWayGDA already has a solid technical SEO foundation with 127 statically generated pages, JSON-LD structured data (Organization, WebSite, SoftwareApplication, FAQPage schemas), a comprehensive sitemap covering 24 static pages and up to 50 dynamic community posts, and a robots.txt configured to allow major search engine bots while blocking AI scrapers. The Next.js 16 App Router architecture ensures excellent Core Web Vitals with static generation, and the site already implements proper metadata including OpenGraph and Twitter Card tags across all pages. However, several optimization areas remain to achieve top search engine rankings."),

  body("The immediate technical SEO priorities include implementing canonical URL consistency across all pages to prevent duplicate content issues, adding hreflang tags for the 8 supported language versions to enable proper international SEO, optimizing Core Web Vitals scores (particularly Largest Contentful Paint and Cumulative Layout Shift) to achieve Google's 'Good' threshold on all pages, implementing breadcrumb structured data to enhance search result snippets, and adding article structured data to community posts and tutorial pages. A comprehensive technical SEO audit should be conducted monthly using tools like Google Search Console, Screaming Frog, and Lighthouse to identify and resolve issues proactively."),

  h3("3.1.2 Content SEO & Keyword Strategy"),

  body("The content SEO strategy targets three keyword tiers designed to capture users at different stages of the research and decision process. The first tier focuses on high-intent commercial keywords such as 'AI model comparison tool,' 'GPT-4o vs Claude 4 benchmark,' 'best AI model 2025,' and 'SPSS alternative free.' These keywords have moderate search volume but extremely high conversion potential because they indicate users actively evaluating solutions. The second tier targets informational keywords that build topical authority, including 'what is GPQA Diamond benchmark,' 'how to compare AI models,' 'MMLU-Pro explained,' and 'AI model pricing comparison.' The third tier addresses long-tail keywords with lower competition but highly qualified traffic, such as 'offline AI analysis tool for researchers' and 'free statistical analysis software with OCR.'"),

  body("A content cluster strategy should be implemented around five core topic pillars: AI Model Comparison (leaderboard, benchmarks, pricing), Statistical Analysis (tutorials, methods, SPSS migration guides), AI Automation (workflow builder, no-code automation, templates), Community and Research (knowledge base, discussions, verified researcher program), and Enterprise Solutions (compliance, security, team features, case studies). Each pillar page should link to and be supported by 10-15 cluster content pieces, creating a comprehensive topical authority structure that signals expertise to search engines. The target is to publish 8-12 new SEO-optimized content pieces per month, with a mix of long-form guides (2,000+ words), comparison articles, tutorials, and data-driven research reports."),

  h3("3.1.3 Local & International SEO"),

  body("Given TheOneWayGDA's multilingual capabilities and Arabic RTL support, international SEO represents a significant growth opportunity. The platform should implement dedicated subdirectory structures for each language (e.g., /ar/ for Arabic, /fr/ for French, /de/ for German) with properly translated and localized content, rather than relying solely on browser-based language detection. Each language version should have its own hreflang annotations, localized metadata, and culturally adapted content that addresses region-specific needs. The Arabic market, in particular, represents an underserved opportunity given the platform's existing RTL support, Dubai office presence, and the rapid growth of AI adoption across the MENA region."),

  body("For local SEO, the platform should establish and optimize Google Business Profile listings for any physical office locations, build local citations and directory listings in key markets, create location-specific landing pages for major markets (US, UK, EU, UAE, Japan), and pursue backlink opportunities from regional educational institutions and technology organizations. Localized case studies and testimonials from users in different regions will strengthen trust signals and improve conversion rates for international traffic."),

  h2("3.2 Content Marketing Strategy"),

  body("Content marketing serves as the primary organic growth engine for TheOneWayGDA, establishing the platform as the authoritative voice in AI model evaluation and modern statistical analysis. The content strategy operates on a hub-and-spoke model with five core content pillars, each designed to attract, educate, and convert specific audience segments. The editorial calendar should maintain a consistent publishing cadence of 8-12 pieces per month, distributed across blog articles, tutorials, research reports, infographics, and video content. Each piece should be optimized for specific target keywords while providing genuine value that builds trust and positions TheOneWayGDA team as thought leaders in the AI and analytics space."),

  body("The content distribution strategy leverages multiple channels to maximize reach and engagement. Primary distribution occurs through organic search (SEO-optimized blog posts and landing pages), social media amplification (LinkedIn for B2B audiences, Twitter/X for AI community engagement, YouTube for tutorial content), email newsletters (weekly digest for subscribers, targeted sequences for specific segments), and community platforms (Reddit, Hacker News, Dev.to, AI-specific forums). Repurposing content across formats, such as transforming a comprehensive research report into a series of blog posts, an infographic, a video tutorial, and social media snippets, maximizes the ROI of each content investment. Guest posting on high-authority publications like Towards Data Science, AI News, and academic journals further extends reach and builds valuable backlinks."),

  makeTable(
    ["Content Pillar", "Frequency", "Formats", "Target Keywords", "Funnel Stage"],
    [
      ["AI Model Intelligence", "3/month", "Reports, Comparisons, Benchmarks", "GPT-4o vs Claude, AI leaderboard", "Awareness, Consideration"],
      ["Statistical Analysis Hub", "3/month", "Tutorials, Migration Guides, How-tos", "SPSS alternative, free analysis tool", "Awareness, Decision"],
      ["AI Automation Academy", "2/month", "Tutorials, Templates, Case Studies", "AI workflow, no-code automation", "Consideration, Decision"],
      ["Research & Community", "2/month", "Interviews, Digests, Knowledge Base", "AI research news, data science", "Awareness, Retention"],
      ["Enterprise Solutions", "1/month", "Case Studies, Whitepapers, Webinars", "enterprise analytics, team AI tools", "Decision, Retention"],
    ]
  ),
  tableCaption("Table 2: Content Marketing Pillar Strategy"),

  h2("3.3 Email Marketing & Marketing Automation"),

  body("Email marketing represents the highest-ROI channel in the acquisition and retention toolkit, with an average return of $36 for every $1 spent according to industry benchmarks. TheOneWayGDA's existing email gate mechanism, which requires visitors to enter their email before accessing the platform, provides a natural lead capture point. The email marketing strategy is built on a sophisticated automation framework that delivers personalized, behavior-triggered communications to subscribers at every stage of the customer journey, from initial awareness through active usage, upgrade consideration, and enterprise evaluation."),

  body("The automation architecture consists of five core email sequences. The Welcome Sequence (5 emails over 14 days) introduces new users to platform features, highlights key use cases, and drives activation of core features like the leaderboard comparison and workspace import. The Engagement Sequence (ongoing, behavior-triggered) sends personalized content recommendations based on user activity, such as relevant community posts, new benchmark data, or tutorial content matching their interests. The Conversion Sequence (3 emails over 7 days, triggered at day 30) targets free-tier users approaching usage limits with targeted upgrade messaging highlighting the value of Pro features. The Win-Back Sequence (3 emails over 14 days, triggered after 14 days of inactivity) re-engages dormant users with new features, community highlights, and personalized usage insights. Finally, the Enterprise Nurture Sequence (drip campaign, 8 emails over 60 days) provides decision-makers with case studies, security documentation, ROI calculators, and consultation offers."),

  h2("3.4 Account-Based Marketing (ABM)"),

  body("Account-Based Marketing (ABM) is the most targeted and highest-value acquisition channel, focusing resources on a carefully curated list of high-potential enterprise accounts. The ABM strategy for TheOneWayGDA targets organizations that exhibit clear buying signals, including current usage of legacy statistical tools (SPSS, SAS, Stata), active AI/ML research programs with multiple team members, technology companies with dedicated AI evaluation teams, and educational institutions with large data science departments. The initial target account list should include 200-500 organizations, prioritized by estimated deal size, likelihood to convert, and strategic alignment with the platform's capabilities."),

  body("The ABM execution framework operates across three tiers. Tier 1 (Strategic Accounts, 20-50 accounts) receives the most personalized treatment, including custom landing pages, dedicated account managers, personalized outreach from company leadership, bespoke demos tailored to their specific use cases, and executive-level engagement through exclusive events and advisory board invitations. Tier 2 (Targeted Accounts, 50-150 accounts) receives semi-personalized campaigns with industry-specific content, group webinars, and sales development representative (SDR) outreach. Tier 3 (Opportunity Accounts, 150-500 accounts) is engaged through automated but segmented campaigns with industry-relevant content, retargeting ads, and scalable email sequences. The ABM technology stack should include a CRM (HubSpot or Salesforce), an intent data platform (Bombora or Clearbit), a sales engagement tool (Outreach or Salesloft), and a personalization platform for dynamic content delivery."),

  // ═══ 4. TARGETED ADVERTISING CAMPAIGNS ═══
  h1("4. Targeted Advertising Campaigns"),

  body("Paid advertising provides the speed and scale necessary to complement organic growth efforts, enabling rapid audience acquisition, precise targeting of high-value segments, and data-driven optimization of messaging and creative assets. The advertising strategy allocates budget across three primary platforms, each selected for its ability to reach specific audience segments with tailored messaging that aligns with their intent level and decision-making stage. All campaigns are built on a test-learn-optimize framework, with continuous A/B testing of ad copy, creative assets, landing pages, and audience targeting parameters."),

  h2("4.1 Google Ads Strategy"),

  body("Google Ads serves as the primary demand capture channel, targeting users actively searching for solutions that TheOneWayGDA provides. The campaign structure is organized into three tiers based on keyword intent and funnel position. The first tier, High-Intent Commercial campaigns, targets bottom-of-funnel keywords with direct commercial intent, including terms like 'AI model comparison tool,' 'free SPSS alternative,' 'AI benchmark platform,' and 'statistical analysis software online.' These campaigns should use exact and phrase match types with aggressive bidding strategies, targeting a cost-per-acquisition (CPA) below $25 for free signups. Ad copy should emphasize the free tier, specific feature comparisons against alternatives, and clear calls-to-action that drive immediate registration."),

  body("The second tier, Consideration campaigns, targets mid-funnel keywords indicating research and evaluation behavior, such as 'GPT-4o vs Claude 4 performance,' 'best AI model for research,' 'MMLU-Pro benchmark explanation,' and 'how to compare AI models systematically.' These campaigns should use a mix of search and display formats, with ad copy focusing on the platform's unique value propositions (19+ models, 6 benchmarks, pricing data) and linking to relevant comparison pages and educational content. The third tier, Brand and Competitor campaigns, protects brand visibility and captures users searching for competitors, targeting terms like 'HuggingFace leaderboard alternative,' 'SPSS online,' and 'best AI evaluation platform.' These campaigns require careful bid management to maintain cost efficiency while defending market positioning."),

  h2("4.2 LinkedIn Advertising"),

  body("LinkedIn is the premier B2B advertising platform for reaching enterprise decision-makers, team leads, and technology executives who influence purchasing decisions for analytics and AI tools. The LinkedIn campaign strategy targets three primary audience segments with distinct messaging and creative approaches. The first segment, Technology Decision Makers, targets CTOs, VP of Engineering, Head of AI/ML, and Chief Data Officers at companies with 100+ employees and active AI/ML programs. Ad messaging should emphasize enterprise features (SSO, audit logs, team collaboration), compliance capabilities (GDPR, SOC 2, HIPAA), and the ROI of switching from legacy tools to TheOneWayGDA."),

  body("The second segment, Research Team Leads, targets Principal Researchers, Senior Data Scientists, and Lab Directors at universities, research institutions, and R&D departments. Messaging should highlight the platform's academic credibility, 500+ university partnerships, comprehensive benchmark library, and free tier that makes it accessible for research teams of any size. The third segment, Industry-Specific campaigns, creates tailored ad sets for vertical markets including healthcare (emphasizing HIPAA compliance and clinical research capabilities), financial services (highlighting security certifications and risk analysis features), and education (promoting FERPA compliance and classroom-friendly features). LinkedIn Lead Gen Forms should be used to minimize friction and maximize conversion rates for enterprise-level lead capture."),

  h2("4.3 Social Media & Community Advertising"),

  body("Social media advertising extends reach beyond search intent, building brand awareness and engaging AI and data science communities where potential users actively discuss tools, share research, and seek recommendations. The strategy focuses on three platforms with distinct value propositions. Twitter/X advertising targets the AI research and developer community through promoted tweets featuring benchmark updates, model comparison insights, and platform feature highlights, using hashtag targeting (#AIModels, #MachineLearning, #DataScience) and engagement retargeting. Reddit advertising places sponsored posts in key subreddits including r/MachineLearning, r/artificial, r/dataisbeautiful, and r/datascience, using native-feeling content that provides genuine value while introducing the platform."),

  body("YouTube advertising captures the tutorial-seeking audience through pre-roll ads on data science and AI-related content, as well as sponsored integration with educational creators in the analytics and AI space. Video content should demonstrate the platform's key features in action, particularly the leaderboard comparison, workspace analysis workflow, and AI copilot capabilities. Retargeting campaigns across all social platforms should engage users who have visited the platform but not registered, using dynamic creative that highlights the specific features they viewed. Lookalike audiences built from existing user data will expand reach to new potential users with similar demographic and interest profiles."),

  // ═══ 5. LEAD GENERATION & QUALIFICATION ═══
  h1("5. Lead Generation & Qualification"),

  body("Effective lead generation and qualification is the critical bridge between marketing activity and revenue generation. TheOneWayGDA's lead management strategy implements a sophisticated framework that captures leads across all channels, scores them based on behavioral and demographic signals, routes them to appropriate nurturing paths, and qualifies them for sales engagement using data-driven criteria. The framework ensures that marketing resources are focused on the highest-potential prospects while maintaining a positive experience for all users regardless of their conversion timeline."),

  h2("5.1 Lead Scoring Model"),

  body("The lead scoring model assigns numerical values to prospects based on both demographic fit and behavioral engagement, enabling automated prioritization of sales-ready leads. The demographic scoring criteria evaluate the inherent value of each lead based on their profile characteristics. Points are assigned for company size (50+ employees: +10, 500+ employees: +20), job title relevance (C-suite/VP: +25, Director/Lead: +15, Individual Contributor: +5), industry alignment (Technology/AI: +20, Education/Research: +15, Healthcare/Finance: +10), and geographic location (North America/Europe: +10, MENA/Asia-Pacific: +5). The maximum demographic score is 100 points."),

  body("The behavioral scoring criteria track engagement signals that indicate buying intent. Key behavioral triggers include visiting pricing or enterprise pages (+20 each), using the leaderboard comparison feature 3+ times (+15), creating a workspace project (+25), downloading a template or resource (+10), attending a webinar (+20), engaging with 3+ emails (+10), and returning to the platform 5+ times in 30 days (+15). The maximum behavioral score is 150 points. A composite score above 75 triggers automated sales alert, while a score above 100 qualifies the lead for direct sales outreach. Scores are recalculated daily based on a rolling 90-day activity window, ensuring the model reflects current engagement levels."),

  h2("5.2 Conversion Funnel Architecture"),

  body("The conversion funnel is designed with multiple entry points and optimized paths that guide users from initial awareness through registration, activation, and conversion to paid plans. The top of funnel (TOFU) captures traffic through SEO, paid ads, social media, and content marketing, driving users to dedicated landing pages optimized for each traffic source with messaging that matches the user's intent and context. The landing pages should feature clear value propositions, social proof (user count, ratings, institutional partnerships), and a low-friction registration flow that requires only an email address to start."),

  body("The mid-funnel activation stage focuses on getting new users to experience the platform's core value proposition within their first session. This includes guided onboarding that walks users through three key actions: comparing models on the leaderboard, importing data into the workspace, and exploring community content. Each activation milestone triggers personalized follow-up communications that deepen engagement and introduce advanced features. The bottom of funnel (BOFU) conversion stage uses targeted messaging, feature gating, and time-limited offers to convert active free users to paid plans. The Pro upgrade prompt appears when users approach free-tier limits (API calls, workflow runs), while the Enterprise upgrade path is triggered by team-related behaviors (multiple users from same domain, team feature exploration)."),

  h2("5.3 Lead Nurturing Sequences"),

  body("Lead nurturing sequences maintain engagement with prospects who are not yet ready to convert, building trust and demonstrating value through automated, personalized communications. The nurturing framework consists of four sequences, each triggered by specific behavioral signals and designed to move prospects progressively toward conversion. The Educational Nurture sequence (6 emails over 30 days) targets new registrants who have not completed onboarding, providing tutorial content, feature highlights, and success stories that demonstrate the platform's capabilities and encourage deeper exploration."),

  body("The Product-Led Nurture sequence (4 emails over 21 days) targets active free users, highlighting advanced features they haven't explored, showcasing community content and templates, and introducing Pro plan benefits through contextual feature comparisons. The Enterprise Nurture sequence (8 emails over 60 days, detailed in Section 3.4) targets identified enterprise prospects with high-value content including case studies, ROI analyses, security documentation, and personalized demo invitations. The Re-engagement sequence (3 emails over 14 days) targets dormant users with updates on new features, popular community content, and personalized usage reminders. Each sequence uses dynamic content blocks that personalize messaging based on user behavior, segment, and engagement history."),

  // ═══ 6. SITE & CONVERSION OPTIMIZATION ═══
  h1("6. Site & Conversion Optimization"),

  body("Conversion Rate Optimization (CRO) is the discipline of systematically improving the platform's ability to convert visitors into registered users and free users into paying customers. The CRO strategy for TheOneWayGDA follows a structured methodology of research, hypothesis formation, experimentation, and iteration, ensuring that every optimization decision is data-driven and measured against clear performance benchmarks. The goal is to achieve a 15-20% improvement in conversion rates across all funnel stages within the first twelve months, which translates to significant revenue impact without requiring proportional increases in traffic or marketing spend."),

  h2("6.1 CRO Strategy & Testing Framework"),

  body("The CRO program operates on a continuous cycle of analysis, hypothesis creation, testing, and implementation. Each month, the team should identify the highest-impact optimization opportunities through a combination of quantitative data analysis (funnel metrics, heatmaps, session recordings, form analytics) and qualitative research (user surveys, usability testing, customer interviews). Priority areas for initial optimization include the email gate conversion flow (currently the primary registration mechanism), the pricing page (critical for free-to-paid conversion), the leaderboard comparison interface (the platform's flagship feature and primary organic traffic driver), and the workspace onboarding flow (key to activation and retention)."),

  body("The A/B testing framework follows a rigorous protocol to ensure statistical validity and actionable results. Each test should have a clear hypothesis, defined success metric, minimum sample size calculation (typically requiring 1,000+ visitors per variant for statistical significance at 95% confidence level), and a predetermined test duration of at least 14 days to account for day-of-week variability. Tests should be prioritized using an ICE framework (Impact, Confidence, Ease) and documented in a centralized testing roadmap that tracks hypotheses, results, and learnings over time. Key tools include Google Optimize or VWO for web testing, PostHog or Amplitude for product analytics, and Hotjar or FullStory for qualitative user behavior insights."),

  h2("6.2 Landing Page Optimization"),

  body("Landing pages are the primary conversion mechanism for paid advertising campaigns and represent the highest-leverage optimization opportunity in the marketing stack. Each advertising campaign should direct traffic to a dedicated landing page specifically designed and optimized for that campaign's audience, messaging, and conversion goal. The landing page optimization strategy focuses on five core elements. First, headline and value proposition clarity, ensuring visitors immediately understand what TheOneWayGDA offers and why it matters to them. Second, social proof and credibility signals, including user count, institutional partnerships, ratings, and testimonials prominently displayed above the fold."),

  body("Third, visual hierarchy and page design, using clear visual flow to guide the visitor's eye from headline through key benefits to the call-to-action. Fourth, form optimization, minimizing the number of fields required for registration (ideally just email address), providing clear privacy assurances, and reducing form abandonment through progressive disclosure and autofill capabilities. Fifth, mobile responsiveness and page speed, ensuring landing pages load in under 2 seconds on mobile devices and provide a seamless experience across all screen sizes. Each landing page should undergo iterative testing, with at least one active A/B test running at all times to continuously improve conversion rates."),

  h2("6.3 Analytics & Tracking Infrastructure"),

  body("A comprehensive analytics infrastructure is essential for measuring marketing effectiveness, understanding user behavior, and making data-driven optimization decisions. The analytics stack should include Google Analytics 4 as the primary web analytics platform, configured with enhanced measurement events, custom conversions for key actions (registration, activation, upgrade, enterprise inquiry), and audience segmentation based on user behavior and demographics. UTM parameter tracking should be standardized across all campaigns with a consistent naming convention (source, medium, campaign, content, term) to enable accurate attribution and cross-channel performance analysis."),

  body("Beyond web analytics, the tracking infrastructure should include product analytics (PostHog or Amplitude) for in-app user behavior tracking, CRM integration (HubSpot or Salesforce) for lead lifecycle management and marketing-sales alignment, marketing attribution modeling to understand the multi-touch customer journey across organic, paid, email, and direct channels, and custom dashboards that consolidate key metrics into actionable views for different stakeholders. Data should flow through a centralized data warehouse (BigQuery or Snowflake) that enables cross-channel analysis and advanced modeling capabilities including predictive lead scoring and customer lifetime value estimation."),

  // ═══ 7. PERFORMANCE MONITORING & CONTINUOUS IMPROVEMENT ═══
  h1("7. Performance Monitoring & Continuous Improvement"),

  body("Sustained marketing success requires a rigorous performance monitoring system that tracks key metrics across all channels, identifies trends and anomalies in real-time, and drives continuous improvement through structured review cadences and optimization processes. The performance monitoring framework establishes clear KPIs for each marketing pillar, implements automated alerting for metric deviations, and creates a culture of data-driven decision-making that permeates every aspect of the marketing operation. The goal is to move beyond vanity metrics and focus on indicators that directly correlate with business outcomes."),

  h2("7.1 KPIs & Metrics Dashboard"),

  body("The KPI dashboard consolidates performance data from all marketing channels into a unified view that enables rapid assessment of overall marketing health and identification of areas requiring attention. The dashboard is organized into four tiers. The first tier, Executive Metrics, provides C-level visibility into marketing contribution to revenue, overall customer acquisition cost (CAC), marketing-influenced pipeline value, and return on marketing investment (ROMI). These metrics are reviewed monthly and inform budget allocation decisions. The second tier, Channel Performance Metrics, tracks key indicators for each marketing pillar including organic traffic volume and keyword rankings for SEO, cost-per-click and conversion rate for paid advertising, email open rates and click-through rates, and engagement rates for social media campaigns."),

  makeTable(
    ["KPI Category", "Metric", "Target (Month 6)", "Target (Month 12)", "Tracking Tool"],
    [
      ["Acquisition", "Monthly Organic Visitors", "25,000", "50,000", "GA4, Search Console"],
      ["Acquisition", "Monthly Paid Visitors", "15,000", "25,000", "Google Ads, LinkedIn"],
      ["Acquisition", "Total Registrations/Month", "3,000", "5,000", "CRM, Analytics"],
      ["Engagement", "Activation Rate (Day 7)", "40%", "55%", "Product Analytics"],
      ["Engagement", "DAU/MAU Ratio", "15%", "22%", "Product Analytics"],
      ["Conversion", "Free-to-Pro Rate", "2%", "3%", "Billing System"],
      ["Conversion", "Enterprise Leads/Month", "50", "100", "CRM"],
      ["Revenue", "Monthly Recurring Revenue", "$15,000", "$45,000", "Billing System"],
      ["Efficiency", "Customer Acquisition Cost", "$35", "$25", "Finance, Analytics"],
      ["Efficiency", "Return on Marketing Spend", "2.5x", "3.5x", "Finance, Analytics"],
    ]
  ),
  tableCaption("Table 3: Key Performance Indicators Dashboard"),

  h2("7.2 Reporting Framework"),

  body("The reporting framework establishes structured cadences for reviewing marketing performance, sharing insights across the organization, and making data-driven adjustments to strategy and tactics. The reporting structure operates at three levels. Weekly Channel Reports provide tactical visibility into individual channel performance, including campaign-level metrics for paid advertising, content performance data for SEO and content marketing, and email sequence performance metrics. These reports are prepared by channel owners and reviewed in a 30-minute weekly stand-up meeting focused on immediate optimization opportunities and any anomalies requiring investigation."),

  body("Monthly Performance Reviews provide a comprehensive assessment of all marketing activities against targets, with in-depth analysis of trends, attribution modeling results, and recommendations for strategic adjustments. These reviews are presented to the leadership team and include a narrative summary of key wins, challenges, and learnings, along with updated forecasts for quarterly and annual targets. Quarterly Strategic Reviews evaluate the overall marketing strategy against business objectives, assess competitive landscape changes, review budget allocation efficiency, and plan strategic initiatives for the upcoming quarter. These reviews serve as the primary forum for major strategic decisions, including budget reallocation, new channel launches, and pivot decisions based on performance data."),

  h2("7.3 Optimization Cadence"),

  body("The continuous improvement process follows a structured cadence that ensures marketing activities are consistently refined based on performance data and market feedback. The weekly optimization cycle focuses on tactical improvements: pausing underperforming ad variants, adjusting bids based on conversion data, updating email subject lines based on open rate testing, and addressing technical SEO issues identified through monitoring tools. The monthly optimization cycle addresses medium-term improvements: launching new content based on keyword opportunity analysis, refreshing campaign creative assets, refining audience targeting parameters based on conversion data, and implementing learnings from A/B tests across all channels."),

  body("The quarterly optimization cycle drives strategic improvements: reallocating budget based on channel-level ROI analysis, launching new marketing channels or tactics based on competitive intelligence, updating the content strategy based on search trend analysis, and refining the lead scoring model based on conversion outcome data. Each optimization cycle follows a structured process: data analysis and insight generation, hypothesis formation, experiment design, execution, and results measurement. All learnings are documented in a centralized knowledge base that builds institutional marketing intelligence over time, reducing the cost of future decision-making and preventing the repetition of failed approaches."),

  // ═══ 8. IMPLEMENTATION ROADMAP ═══
  h1("8. Implementation Roadmap"),

  body("The implementation roadmap organizes all marketing activities into three sequential phases, each building on the foundation established in the previous phase. This phased approach manages risk by validating strategies with smaller investments before scaling, allows for course corrections based on early performance data, and ensures that the team can execute effectively without being overwhelmed by simultaneous initiatives. Each phase has clear objectives, deliverables, resource requirements, and success metrics."),

  h2("8.1 Phase 1: Foundation (Months 1-3)"),

  body("Phase 1 focuses on establishing the essential infrastructure, launching high-priority channels, and generating initial baseline data that will inform optimization decisions in subsequent phases. The primary objective is to achieve 10,000 monthly organic visitors, launch paid campaigns on Google and LinkedIn, implement email automation sequences, and establish analytics and reporting infrastructure. Key deliverables include completing the technical SEO audit and implementing recommended fixes, publishing the first 24 content pieces (8 per month across the five pillars), launching 3 Google Ads campaigns and 2 LinkedIn campaigns, implementing the 5 core email automation sequences, and deploying the lead scoring model in the CRM."),

  body("The Phase 1 team should include a Marketing Lead (full-time), an SEO Content Writer (full-time), a Paid Media Specialist (full-time or contractor), and a Marketing Operations Analyst (part-time). The budget allocation for Phase 1 is approximately $25,000, with $8,000 allocated to paid advertising (Google Ads: $5,000, LinkedIn: $3,000), $7,000 to content production (writing, design, video), $5,000 to marketing tools and technology, and $5,000 to agency or specialist support for setup and consulting. Success metrics for Phase 1 include achieving 10,000 monthly organic sessions, 1,500 monthly registrations, $35 or lower CPA for paid channels, and email open rates above 35%."),

  h2("8.2 Phase 2: Scale (Months 4-6)"),

  body("Phase 2 focuses on scaling proven channels, launching new initiatives based on Phase 1 learnings, and beginning enterprise acquisition through ABM campaigns. The primary objective is to double organic traffic to 25,000 monthly visitors, scale paid campaigns to generate 15,000 monthly paid visitors, launch the ABM program with the first 100 target accounts, and achieve the first enterprise conversions. Key deliverables include scaling content production to 12 pieces per month, expanding paid campaigns with new audience segments and creative variations, launching the ABM program with Tier 1 strategic accounts, implementing conversion rate optimization across key landing pages, and launching the first webinar series."),

  body("The Phase 2 budget increases to approximately $40,000 per month, reflecting the scaling of paid channels and the addition of ABM activities. The team expands to include a Content Marketing Manager, an Email Marketing Specialist, and an SDR for ABM outreach. Budget allocation shifts to $18,000 for paid advertising, $10,000 for content production, $5,000 for ABM tools and activities, $4,000 for marketing technology, and $3,000 for events and webinars. Success metrics for Phase 2 include 25,000 monthly organic visitors, 3,000 monthly registrations, a 2% free-to-paid conversion rate, and 5 qualified enterprise opportunities."),

  h2("8.3 Phase 3: Optimize & Expand (Months 7-12)"),

  body("Phase 3 focuses on optimizing performance across all channels based on accumulated data, expanding into new channels and markets, and achieving the full-year targets. The primary objective is to reach 50,000 monthly organic visitors, achieve 5,000 monthly registrations, close 20+ enterprise accounts, and generate $45,000 in monthly recurring revenue from marketing-attributed conversions. Key deliverables include launching international SEO campaigns for Arabic and other language markets, scaling the ABM program to 500 target accounts, implementing advanced attribution modeling, launching a partner and referral program, and establishing thought leadership through original research publications and industry speaking engagements."),

  body("The Phase 3 budget averages $45,000 per month, with increased investment in ABM, content, and international expansion. The full marketing team is operational with specialized roles for each channel. Budget allocation includes $22,000 for paid advertising, $10,000 for content production, $6,000 for ABM activities, $4,000 for marketing technology, and $3,000 for events and partnerships. The total Year 1 marketing investment is approximately $150,000 across all three phases, with a projected ROI of 3.5x based on conservative revenue assumptions. This investment positions TheOneWayGDA for sustainable growth into Year 2, where the focus shifts from acquisition to retention, expansion, and market leadership."),

  // ═══ 9. BUDGET ALLOCATION ═══
  h1("9. Budget Allocation"),

  body("The marketing budget is structured to provide adequate resources for each channel while maintaining flexibility to reallocate based on performance data. The following table presents the recommended budget allocation across all marketing activities for each phase of the first year. Budget figures include all direct costs (advertising spend, content production, tool subscriptions) and allocated personnel costs, but exclude core team salaries which are accounted for separately in the operating budget. The allocation reflects the phased approach, with heavier early investment in infrastructure and content that generates compounding returns over time."),

  makeTable(
    ["Category", "Phase 1 ($K)", "Phase 2 ($K)", "Phase 3 ($K)", "Year 1 Total ($K)"],
    [
      ["Paid Advertising (Google, LinkedIn, Social)", "$8", "$18", "$66", "$92"],
      ["Content Marketing (Writing, Design, Video)", "$7", "$10", "$30", "$47"],
      ["Email Marketing & Automation Tools", "$3", "$4", "$6", "$13"],
      ["ABM (Tools, Events, Custom Content)", "$0", "$5", "$18", "$23"],
      ["SEO & Marketing Technology", "$5", "$4", "$8", "$17"],
      ["Events, Webinars & Partnerships", "$2", "$3", "$9", "$14"],
      ["Total per Phase", "$25", "$44", "$137", "$206"],
    ]
  ),
  tableCaption("Table 4: Annual Marketing Budget Allocation by Category"),

  // ═══ 10. RISK ANALYSIS & MITIGATION ═══
  h1("10. Risk Analysis & Mitigation"),

  body("Every strategic initiative carries inherent risks that must be identified, assessed, and proactively mitigated. The marketing roadmap identifies six primary risk categories that could impact the achievement of targets, along with specific mitigation strategies for each. By addressing these risks upfront and establishing monitoring protocols, the team can respond quickly to emerging challenges and minimize their impact on overall performance. The risk management approach is integrated into the regular reporting cadence, with risk indicators reviewed monthly and contingency plans activated when predefined trigger thresholds are reached."),

  makeTable(
    ["Risk", "Probability", "Impact", "Mitigation Strategy"],
    [
      ["SEO algorithm changes reduce organic rankings", "Medium", "High", "Diversify traffic sources, build brand search, maintain content quality"],
      ["Rising CPCs reduce paid channel profitability", "High", "Medium", "Improve landing page conversion, explore alternative channels, optimize quality score"],
      ["Low email deliverability impacts nurture sequences", "Medium", "Medium", "Implement DMARC/DKIM/SPF, monitor sender reputation, use dedicated IP"],
      ["Enterprise sales cycle longer than projected", "High", "High", "Extend nurture sequences, add mid-touch engagement, provide proof-of-concept"],
      ["Competitor launches similar platform features", "Medium", "Medium", "Accelerate differentiation messaging, strengthen community moat, focus on UX"],
      ["Budget constraints limit scaling in Phase 3", "Low", "High", "Prioritize highest-ROI channels, negotiate vendor discounts, reallocate from underperformers"],
    ]
  ),
  tableCaption("Table 5: Risk Assessment Matrix"),

  // ═══ 11. EXPECTED ROI & SUCCESS METRICS ═══
  h1("11. Expected ROI & Success Metrics"),

  body("The financial projections for the marketing roadmap are based on conservative assumptions derived from industry benchmarks for B2B SaaS platforms in the AI and analytics vertical. The return on marketing investment (ROMI) calculation considers three revenue streams: Pro plan subscriptions at $29/month with an assumed 5% monthly churn rate, Enterprise subscriptions at $99/month with a 2% monthly churn rate, and the long-term value of brand equity and market positioning that, while difficult to quantify, represents significant strategic value. The following projections assume the successful execution of all three phases as outlined in the implementation roadmap."),

  body("By the end of Month 12, the projected outcomes include 50,000 monthly organic visitors generating approximately 3,500 free registrations per month through organic channels alone, with paid channels contributing an additional 1,500 registrations per month. With a 3% free-to-paid conversion rate and the expected distribution of Pro vs. Enterprise plans, the marketing-attributed Monthly Recurring Revenue (MRR) is projected to reach $45,000, translating to approximately $540,000 in Annual Recurring Revenue (ARR) from marketing-sourced customers. Against a total Year 1 marketing investment of approximately $206,000, this yields a projected ROMI of 3.5x, well above the B2B SaaS industry average of 2.5x."),

  body("Beyond financial metrics, the success of this roadmap should also be measured by strategic indicators including brand awareness (measured through brand search volume and social mentions), organic search visibility (measured through keyword ranking distribution across target keyword clusters), community growth (measured through active user count, post engagement, and knowledge base contributions), and net promoter score (NPS) among active users. These strategic metrics, while not directly tied to immediate revenue, are leading indicators of long-term market position and sustainable competitive advantage. Regular measurement and reporting on both financial and strategic metrics ensures that the marketing program delivers balanced outcomes that support both near-term revenue goals and long-term brand building."),
];

// ═══════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ═══════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "Microsoft YaHei" },
          size: 24, color: c(P.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 32, bold: true, color: c(P.primary),
        },
        paragraph: { spacing: { before: 480, after: 200, line: 312 } },
      },
      heading2: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 28, bold: true, color: c(P.primary),
        },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading3: {
        run: {
          font: { ascii: "Times New Roman", eastAsia: "SimHei" },
          size: 24, bold: true, color: c(P.primary),
        },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
    },
  },
  sections: [
    // Section 1: Cover (no page number)
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: coverChildren,
    },
    // Section 2: Front matter - TOC (Roman numerals)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: { default: romanFooter() },
      children: tocChildren,
    },
    // Section 3: Body (Arabic numerals starting at 1)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "TheOneWayGDA  |  Digital Marketing Roadmap", size: 18, color: "808080", font: { ascii: "Calibri" } })],
          })],
        }),
      },
      footers: { default: arabicFooter() },
      children: bodyChildren,
    },
  ],
});

// ═══════════════════════════════════════════════════════════
// GENERATE FILE
// ═══════════════════════════════════════════════════════════
async function generate() {
  const buffer = await Packer.toBuffer(doc);
  const outputPath = "/home/z/my-project/download/TheOneWayGDA_Digital_Marketing_Roadmap.docx";
  fs.writeFileSync(outputPath, buffer);
  console.log("Document generated successfully: " + outputPath);
}

generate().catch(err => {
  console.error("Error generating document:", err);
  process.exit(1);
});
