const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  SectionType, TableLayoutType, LevelFormat, TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════════
// PALETTE & CONSTANTS
// ═══════════════════════════════════════════════════════════════
const GO1 = {
  bg: "1A2330", primary: "FFFFFF", accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
};
const P = GO1.cover;
const T = GO1.table;
const c = (hex) => hex.replace("#", "");

// Body palette (Profile A Formal - tech)
const BP = { primary: "0B1220", body: "000000", secondary: "506070", accent: "D4875A", surface: "F8F0EB" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function emptyPara() {
  return new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: "", size: 2 })] });
}

// ═══════════════════════════════════════════════════════════════
// COVER RECIPE R4 - Top Color Block
// ═══════════════════════════════════════════════════════════════
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
  const breakAfter = new Set([...' ,.;:!?-', ...' \t']);
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

function buildCoverR4(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 26);
  const titleSize = titlePt * 2;

  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const englishLabelH = config.englishLabel ? (9 * 23 + 500) : 0;
  const subtitleH = config.subtitle ? (12 * 23 + 200) : 0;
  const upperContentH = englishLabelH + titleBlockHeight + subtitleH;
  const UPPER_MIN = 7500;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);
  const DIVIDER_H = 60;

  const contentEstimate =
    (config.englishLabel ? (9 * 23 + 500) : 0) +
    titleLines.length * (titlePt * 23 + 200) +
    (config.subtitle ? (12 * 23 + 200) : 0);
  const spacerIntrinsic = 280;
  const topSpacing = Math.max(UPPER_H - contentEstimate - spacerIntrinsic - 800, 400);

  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { fill: GO1.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          config.englishLabel ? new Paragraph({
            spacing: { after: 500 },
            children: [new TextRun({ text: config.englishLabel.split("").join(" "),
              size: 18, color: GO1.accent, font: { ascii: "Calibri" }, characterSpacing: 60 })],
          }) : null,
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200 },
            children: [new TextRun({ text: line, size: titleSize, bold: true,
              color: P.titleColor, font: { ascii: "Arial" } })],
          })),
          config.subtitle ? new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor,
              font: { ascii: "Arial" } })],
          }) : null,
        ].filter(Boolean),
      })],
    })],
  });

  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: DIVIDER_H, rule: "exact" },
      children: [new TableCell({ borders: noBorders,
        shading: { fill: GO1.accent }, children: [emptyPara()] })],
    })],
  });

  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    ...(config.metaLines || []).map(line => new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: line, size: 28, color: P.metaColor, font: { ascii: "Arial" } })],
    })),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: config.footerLeft || "", size: 22, color: "909090" }),
        new TextRun({ text: "          " }),
        new TextRun({ text: config.footerRight || "", size: 22, color: "909090" }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(BP.primary), font: { ascii: "Times New Roman" } })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(BP.primary), font: { ascii: "Times New Roman" } })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: c(BP.primary), font: { ascii: "Times New Roman" } })],
  });
}

function p(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: c(BP.body), font: { ascii: "Times New Roman" } })],
  });
}

function pBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { after: 120, line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, color: c(BP.body), font: { ascii: "Times New Roman" } }),
      new TextRun({ text, size: 24, color: c(BP.body), font: { ascii: "Times New Roman" } }),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] });
}

// Table builder
function makeTable(headers, rows, caption) {
  const colCount = headers.length;
  const colWidth = Math.floor(100 / colCount);
  const elements = [];

  if (caption) {
    elements.push(new Paragraph({
      keepNext: true,
      spacing: { before: 200, after: 80, line: 312 },
      children: [new TextRun({ text: caption, bold: true, size: 21, color: c(BP.secondary), font: { ascii: "Times New Roman" } })],
    }));
  }

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map(text => new TableCell({
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: T.headerBg },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: T.accentLine }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 21, color: T.headerText, font: { ascii: "Calibri" } })] })],
    })),
  });

  const dataRows = rows.map((row, idx) => new TableRow({
    cantSplit: true,
    children: row.map(cellText => new TableCell({
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? T.surface : "FFFFFF" },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.SINGLE, size: 1, color: T.innerLine }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cellText, size: 21, color: c(BP.body), font: { ascii: "Calibri" } })] })],
    })),
  }));

  elements.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: T.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: T.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: T.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...dataRows],
  }));

  return elements;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ═══════════════════════════════════════════════════════════════

const coverConfig = {
  title: "Growth & Acquisition Roadmap",
  subtitle: "Multi-Channel Marketing Strategy for TheOneWayGDA",
  englishLabel: "STRATEGIC MARKETING PLAN 2025-2026",
  metaLines: [
    "Prepared for: TheOneWayGDA Platform",
    "Category: AI / SaaS / Data Analytics",
    "Date: May 2025",
  ],
  footerLeft: "Confidential",
  footerRight: "Version 1.0",
  palette: GO1,
};

const coverSection = {
  properties: {
    page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
  },
  children: buildCoverR4(coverConfig),
};

const tocSection = {
  properties: {
    type: SectionType.NEXT_PAGE,
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
    },
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })],
      })],
    }),
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "TheOneWayGDA \u2014 Growth & Acquisition Roadmap", size: 18, color: "808080", font: { ascii: "Calibri" } })],
      })],
    }),
  },
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 360 },
      children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: c(BP.primary), font: { ascii: "Times New Roman" } })],
    }),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: 'Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select "Update Field."', italics: true, size: 18, color: "888888" })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ],
};

const bodyContent = [
  // ═══════════════════════════════════════════════════
  // 1. EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════
  h1("1. Executive Summary"),
  p("This document presents a comprehensive, multi-channel growth and acquisition roadmap designed to position TheOneWayGDA as the leading AI model comparison and evaluation platform for data scientists, AI researchers, and enterprise decision-makers. The platform already offers a feature-rich product with 127 pages, including an AI model leaderboard tracking 19+ models across 6 standardized benchmarks, a full statistical analysis workspace, 7 specialist AI assistants, a no-code automation engine, and an active community portal with collaborative features."),
  p("The primary objective of this roadmap is to build a predictable, scalable pipeline of qualified users who convert from free tier to paid subscriptions (Pro at $29/month and Enterprise at $99/month). The strategy leverages six interconnected pillars: Search Engine Optimization (SEO) for organic authority, paid advertising for immediate reach, content marketing for thought leadership, email marketing for nurturing and retention, marketing automation for operational efficiency, and Account-Based Marketing (ABM) for high-value enterprise acquisition. Each pillar is designed to reinforce the others, creating a flywheel effect where organic visibility feeds paid performance, content drives email signups, automation qualifies leads, and ABM accelerates enterprise deals."),
  p("The implementation follows a phased approach over 12 months, starting with foundational infrastructure (analytics, tracking, SEO technical audit, content calendar) in months one through three, scaling acquisition channels in months four through six, optimizing conversion and expanding ABM in months seven through nine, and refining for efficiency and predictable growth in months ten through twelve. Success will be measured against clearly defined KPIs including organic traffic growth, cost-per-acquisition (CPA), conversion rate, monthly recurring revenue (MRR), and customer lifetime value (CLV). This roadmap provides the strategic framework, tactical playbooks, and measurement criteria needed to transform TheOneWayGDA from a feature-complete product into a market-leading platform with sustainable revenue growth."),

  // ═══════════════════════════════════════════════════
  // 2. CURRENT STATE & PLATFORM ANALYSIS
  // ═══════════════════════════════════════════════════
  h1("2. Current State & Platform Analysis"),
  h2("2.1 Platform Overview"),
  p("TheOneWayGDA is a comprehensive AI model comparison and evaluation platform built on Next.js 16 with a modern tech stack including TypeScript, Tailwind CSS 4, and shadcn/ui. The platform currently serves 127 statically generated pages and 100+ API routes, backed by a Prisma ORM with PostgreSQL. The product is positioned at the intersection of AI benchmarking, statistical analysis, and workflow automation, targeting three primary user segments: individual AI practitioners and researchers who need to compare model performance, data science teams requiring collaborative analysis tools, and enterprise organizations looking for AI governance and evaluation infrastructure."),
  p("The platform's flagship feature is the AI Model Leaderboard, which tracks 19+ AI models including GPT-4o, Claude 4, Gemini 2.5, and DeepSeek across six industry-standard benchmarks (GPQA Diamond, MMLU-Pro, HumanEval+, MATH-500, MT-Bench, and IFEval). This leaderboard provides live latency and throughput metrics alongside pricing comparisons, making it a uniquely valuable resource for organizations evaluating which AI models to adopt. Beyond the leaderboard, the platform offers a full statistical analysis workspace with 50+ tests, 7 specialist AI assistants, a no-code automation engine, and a community portal for AI news and research discussion."),

  h2("2.2 Target Audience Segments"),
  ...makeTable(
    ["Segment", "Profile", "Key Pain Points", "Value Proposition"],
    [
      ["AI Researchers", "Academics, lab scientists", "No centralized benchmark comparison", "6-benchmark leaderboard with live metrics"],
      ["Data Scientists", "ML engineers, analysts", "Manual evaluation, tool fragmentation", "50+ statistical tests in one workspace"],
      ["Enterprise Buyers", "CTOs, VP Engineering", "Vendor lock-in risk, no transparency", "Model comparison, governance, compliance"],
      ["Students & Educators", "University, bootcamp learners", "Expensive tools, steep learning curve", "Free tier, tutorials, 7 AI assistants"],
      ["Developers", "Software engineers building AI", "Complex API integration, no benchmarks", "SDK, extensions, live latency testing"],
    ],
    "Table 1: Target Audience Segmentation"
  ),
  spacer(),

  h2("2.3 Competitive Positioning"),
  p("The AI evaluation landscape is fragmented. Existing solutions tend to focus on a single dimension: benchmark leaderboards (like Hugging Face Open LLM Leaderboard), statistical tools (like SPSS or JMP), or workflow automation (like Zapier or n8n). TheOneWayGDA uniquely combines all three into a single platform. The competitive moat lies in the integration depth: users can compare a model on the leaderboard, immediately test it with their own data in the workspace, and then automate recurring evaluations through the workflow engine, all within one cohesive environment."),
  p("The primary competitive threats include Hugging Face's established community and open-source ecosystem, Anthropic and OpenAI's proprietary evaluation tools, and specialized statistical software from established vendors like IBM SPSS and SAS. However, none of these competitors offer the unified experience that TheOneWayGDA provides. The platform's positioning as the only end-to-end AI model evaluation and analytics platform creates a defensible niche that can be defended through continuous feature development and community building."),

  h2("2.4 Monetization Model"),
  ...makeTable(
    ["Tier", "Price", "API Calls/Day", "Key Features"],
    [
      ["Free", "$0/month", "100", "Leaderboard, 5 workflows/mo, 3 members, 100MB storage"],
      ["Pro", "$29/month", "1,000", "Unlimited workflows, AI Copilot, 25 members, 10GB storage"],
      ["Enterprise", "$99/month", "Unlimited", "SSO/SAML, SLA 99.9%, 100GB, dedicated support"],
    ],
    "Table 2: Pricing Tiers"
  ),
  spacer(),

  // ═══════════════════════════════════════════════════
  // 3. ACQUISITION STRATEGY
  // ═══════════════════════════════════════════════════
  h1("3. Acquisition Strategy: The Six Pillars"),
  p("The acquisition strategy is built on six interconnected pillars, each designed to reach different segments of the target audience at different stages of the buyer journey. These pillars are not independent channels but rather an integrated system where each reinforces the others. SEO builds the organic foundation, paid advertising provides immediate reach and testing data, content marketing establishes thought leadership and feeds SEO, email marketing nurtures leads through the funnel, marketing automation scales operations, and ABM targets the highest-value enterprise accounts."),

  // 3.1 SEO
  h2("3.1 Search Engine Optimization (SEO)"),
  h3("3.1.1 Technical SEO Foundation"),
  p("The platform already has a strong technical SEO foundation with 127 statically generated pages, JSON-LD structured data (Organization, WebSite, SoftwareApplication, FAQPage, and WebPage schemas), optimized metadata with OpenGraph and Twitter cards, a comprehensive sitemap.xml with 24 static and up to 50 dynamic pages, and a robots.txt that allows major search engines while blocking AI scrapers. The next step is to perform a comprehensive technical SEO audit using tools like Google Search Console, Screaming Frog, and Lighthouse to identify and fix any remaining issues."),
  p("Key technical priorities include ensuring Core Web Vitals scores are consistently in the green zone (LCP under 2.5s, FID under 100ms, CLS under 0.1), implementing canonical tags on all pages to prevent duplicate content, adding breadcrumb structured data for enhanced SERP snippets, and creating an XML sitemap specifically for the dynamic community posts that updates automatically. Additionally, the platform should implement hreflang tags if international expansion is planned, and ensure all images have descriptive alt text for image search optimization."),

  h3("3.1.2 Content SEO Strategy"),
  p("Content SEO will target three tiers of keywords. The first tier consists of high-volume, high-intent head terms such as 'AI model comparison,' 'LLM benchmark,' 'GPT-4o vs Claude 4,' and 'best AI model 2025.' These keywords directly match the platform's core offering and should drive the majority of organic traffic. The second tier includes mid-tail keywords like 'AI model pricing comparison,' 'GPQA Diamond benchmark results,' and 'statistical analysis AI tools' that capture users further along in their research process. The third tier targets long-tail, question-based queries such as 'which AI model is best for code generation' or 'how to compare LLM performance metrics' that align with the FAQ structured data already implemented."),
  p("Each month, the content team should produce a minimum of 8 SEO-optimized articles targeting specific keyword clusters. These articles should follow a hub-and-spoke model, where comprehensive pillar pages cover broad topics (like 'Complete Guide to AI Model Evaluation') and supporting articles target specific subtopics (like 'Understanding GPQA Diamond Scores' or 'How MMLU-Pro Tests Multi-Task Understanding'). All content should include internal links to relevant platform features, external links to authoritative sources, and clear calls-to-action driving readers toward the leaderboard, workspace, or free trial registration."),

  h3("3.1.3 Link Building & Domain Authority"),
  p("Building domain authority is critical for competing with established platforms like Hugging Face. The strategy should focus on four link-building tactics. First, digital PR through original research publications using the platform's benchmark data, publishing quarterly 'State of AI Models' reports that attract natural backlinks from tech publications and academic citations. Second, guest posting on high-authority publications in the AI and data science space, including Towards Data Science, KDnuggets, and AI News, with each article linking back to relevant platform pages. Third, strategic partnerships with universities and research institutions, offering free Enterprise access in exchange for citations and co-authored papers. Fourth, community-driven link building through the community portal, encouraging users to share their analyses and benchmark comparisons on social media and personal blogs."),

  // 3.2 Paid Advertising
  h2("3.2 Paid Advertising"),
  h3("3.2.1 Google Ads Strategy"),
  p("Google Ads will serve as the primary paid acquisition channel, targeting high-intent search queries where users are actively looking for AI model comparison or evaluation tools. The campaign structure should follow a tiered approach. Tier 1 campaigns target exact-match and phrase-match keywords with high commercial intent, such as 'AI model comparison tool,' 'compare GPT-4 Claude Gemini,' and 'LLM benchmark platform.' These campaigns should use responsive search ads with strong ad extensions (sitelinks to leaderboard, workspace, and pricing pages; callout extensions highlighting key features like '19+ AI Models Compared' and '6 Standardized Benchmarks'; structured snippets for benchmark types)."),
  p("Tier 2 campaigns target informational queries with moderate intent using performance max campaigns, focusing on audiences interested in AI, machine learning, and data science. Tier 3 campaigns employ retargeting through display ads and YouTube pre-roll, targeting users who have visited the platform but not registered or activated their account. Each campaign should have dedicated landing pages optimized for conversion, with A/B testing on headlines, value propositions, and CTA placement. Initial budget allocation should be $3,000-$5,000 per month with a target CPA of under $50 for free registrations and under $200 for Pro conversions."),

  h3("3.2.2 LinkedIn Ads"),
  p("LinkedIn Ads will target enterprise decision-makers who are more likely to convert to Enterprise tier subscriptions ($99/month). Campaign targeting should focus on job titles like CTO, VP of Engineering, Head of AI/ML, Chief Data Officer, and Director of Data Science at companies with 50+ employees in technology, finance, healthcare, and consulting industries. Ad formats should include sponsored content promoting benchmark reports and case studies, message ads for personalized outreach to high-value prospects, and lead gen forms offering gated content like 'The 2025 AI Model Evaluation Guide' in exchange for contact information."),
  p("The LinkedIn strategy should also include company-page optimization and employee advocacy programs where team members share platform updates and content with their professional networks. LinkedIn's Matched Audiences feature should be leveraged to retarget website visitors and upload target account lists from the ABM program. Budget allocation for LinkedIn should start at $2,000-$3,000 per month, with higher CPLs expected ($80-$150) but significantly higher LTV from enterprise conversions."),

  h3("3.2.3 Social & Community Advertising"),
  p("Beyond Google and LinkedIn, targeted campaigns on Reddit (r/MachineLearning, r/artificial, r/datascience), Twitter/X (targeting AI influencers and hashtags like #LLM #AIBenchmark #MachineLearning), and YouTube (pre-roll ads before AI and data science educational content) will help build brand awareness and drive traffic from niche communities. Reddit advertising in particular can be effective for reaching highly technical audiences who are skeptical of traditional marketing but receptive to data-driven value propositions. Each platform requires a tailored creative approach: Reddit prefers authentic, text-heavy posts with genuine value, while Twitter/X performs best with concise thread-style content and engaging visual assets."),

  // 3.3 Content Marketing
  h2("3.3 Content Marketing"),
  h3("3.3.1 Content Strategy & Calendar"),
  p("Content marketing will serve as the connective tissue between all other acquisition channels, providing the fuel for SEO, the assets for email campaigns, the credibility for ABM outreach, and the value proposition for social media engagement. The content strategy follows a 'publish, distribute, repurpose' methodology where each core content piece is created once and then adapted across multiple formats and channels to maximize reach and ROI."),
  ...makeTable(
    ["Content Type", "Frequency", "Purpose", "Distribution Channels"],
    [
      ["Benchmark Reports", "Quarterly", "Original research, link building", "Blog, email, PR, social media"],
      ["Comparison Guides", "Bi-weekly", "SEO, mid-funnel education", "Blog, Google Ads landing pages"],
      ["Tutorial Articles", "Weekly", "SEO, user onboarding", "Blog, community portal, YouTube"],
      ["Case Studies", "Monthly", "Enterprise conversion, ABM", "Website, LinkedIn, email nurture"],
      ["AI News Digest", "Daily/Weekly", "Community engagement, retention", "Community portal, email newsletter"],
      ["Video Tutorials", "Bi-weekly", "YouTube growth, product education", "YouTube, blog embed, social clips"],
      ["Infographics", "Monthly", "Social sharing, backlinks", "Pinterest, LinkedIn, Twitter/X"],
    ],
    "Table 3: Content Calendar Overview"
  ),
  spacer(),

  h3("3.3.2 Thought Leadership & Original Research"),
  p("The most powerful content asset for TheOneWayGDA is its proprietary benchmark data. No other platform combines 6 standardized benchmarks with live latency and pricing data for 19+ AI models. This data should be leveraged to create original research that positions TheOneWayGDA as the definitive source for AI model evaluation insights. Quarterly 'State of AI Models' reports should analyze trends across benchmarks, identify emerging performers, and provide actionable recommendations for organizations choosing AI models. These reports should be published as downloadable PDFs with interactive web versions, promoted through PR distribution services, and offered as gated content for lead generation."),
  p("Beyond benchmark reports, the content team should pursue thought leadership through opinion pieces on the future of AI evaluation, contributions to open-source benchmarking standards, partnerships with academic researchers for peer-reviewed publications, and speaking engagements at AI and data science conferences. The goal is to make TheOneWayGDA synonymous with AI model evaluation in the same way that Gartner is synonymous with technology research."),

  // 3.4 Email Marketing
  h2("3.4 Email Marketing & Nurturing"),
  h3("3.4.1 Email Funnel Architecture"),
  p("Email marketing will be structured as a multi-stage funnel that guides prospects from initial awareness through activation to conversion and retention. The architecture consists of five distinct email streams, each triggered by specific user behaviors and designed to move prospects to the next stage of their journey."),
  ...makeTable(
    ["Email Stream", "Trigger", "Volume", "Goal", "Key Metrics"],
    [
      ["Welcome Series", "New registration", "5 emails over 14 days", "Product activation", "Open rate > 45%, click rate > 15%"],
      ["Educational Nurture", "Inactive after 7 days", "Weekly for 8 weeks", "Feature discovery", "Feature adoption rate"],
      ["Benchmark Updates", "Monthly subscription", "Monthly newsletter", "Engagement, retention", "Open rate > 35%, unsubscribe < 0.5%"],
      ["Upgrade Sequence", "Free tier usage limit hit", "3 emails over 7 days", "Pro conversion", "Conversion rate > 5%"],
      ["Win-back Campaign", "No activity in 30 days", "3 emails over 21 days", "Re-engagement", "Reactivation rate > 10%"],
    ],
    "Table 4: Email Funnel Architecture"
  ),
  spacer(),

  h3("3.4.2 Personalization & Segmentation"),
  p("Email personalization will go beyond simply inserting the recipient's first name. Using the platform's existing data on user type (Researcher, Student, Professional, Enterprise, Developer, Educator, General), behavior patterns (which features they use most, which benchmarks they view, how often they visit), and engagement history (email opens, clicks, content consumed), the email system will deliver dynamically personalized content recommendations, benchmark update alerts tailored to the models they follow, and upgrade prompts timed to their usage patterns. For example, a researcher who frequently compares Claude and GPT-4o would receive an email when new benchmark data for those models is published, along with a suggested analysis template in the workspace."),
  p("Segmentation will also drive differentiated messaging for enterprise prospects versus individual users. Enterprise leads (identified by company domain, job title signals, or ABM account matching) will receive a separate email track featuring case studies, ROI calculators, security and compliance information, and invitations to private demos or consultations with the sales team. Individual users will receive more product-focused content highlighting features relevant to their use case, community highlights, and tips for getting the most value from the free tier."),

  // 3.5 Marketing Automation
  h2("3.5 Marketing Automation"),
  h3("3.5.1 Automation Infrastructure"),
  p("Marketing automation will transform manual marketing operations into scalable, data-driven systems that deliver the right message to the right user at the right time. The automation infrastructure should be built on a modern marketing automation platform (such as HubSpot, Marketo, or Customer.io) integrated with the platform's existing analytics, billing, and user management systems through API connections and webhook integrations."),
  p("The core automation workflows include: a lead scoring model that assigns points based on demographic fit (job title, company size, industry) and behavioral signals (pages visited, features used, content consumed, email engagement), with scores dynamically updated as new data becomes available; a behavioral trigger system that launches targeted campaigns when users perform specific actions like viewing the pricing page three times, hitting the free tier API limit, or abandoning the registration form; and a lifecycle management system that automatically transitions users between lifecycle stages (visitor, lead, activated user, engaged user, at-risk user, churned user) and triggers appropriate interventions at each stage transition."),

  h3("3.5.2 Lead Scoring Model"),
  ...makeTable(
    ["Signal Category", "Action", "Points", "Rationale"],
    [
      ["Demographic", "VP/C-level job title", "+20", "Enterprise decision-maker"],
      ["Demographic", "Company size 50+ employees", "+15", "Enterprise potential"],
      ["Demographic", ".edu or research institution email", "+10", "Academic influencer"],
      ["Behavioral", "Visited pricing page", "+10", "Purchase intent signal"],
      ["Behavioral", "Used leaderboard comparison", "+5", "Core feature engagement"],
      ["Behavioral", "Hit free tier limit", "+15", "Conversion trigger"],
      ["Engagement", "Opened 3+ emails", "+5", "Active interest"],
      ["Engagement", "Downloaded benchmark report", "+10", "High-value content consumption"],
      ["Negative", "Unsubscribed from email", "-20", "Disengaged"],
      ["Negative", "No login in 30 days", "-10", "Churn risk"],
    ],
    "Table 5: Lead Scoring Model"
  ),
  spacer(),

  // 3.6 ABM
  h2("3.6 Account-Based Marketing (ABM)"),
  h3("3.6.1 Target Account Selection"),
  p("Account-Based Marketing will focus on a carefully curated list of 50-100 high-value target accounts that represent the highest potential revenue opportunity for TheOneWayGDA. Target account selection criteria should include: companies with 200+ employees in AI-heavy industries (technology, finance, healthcare, consulting, pharmaceuticals), evidence of AI/ML investment (job postings for AI engineers, AI-related press releases, presence at AI conferences), current use of multiple AI model providers (indicating evaluation complexity), and a likely need for governance and compliance features (regulated industries, enterprise security requirements)."),
  p("The ABM program should classify target accounts into three tiers. Tier 1 accounts (10-15 companies) receive the highest level of personalization with dedicated account managers, custom benchmark reports, executive outreach, and tailored ROI analyses. Tier 2 accounts (30-40 companies) receive semi-personalized campaigns with industry-specific content and targeted advertising. Tier 3 accounts (50-75 companies) receive programmatic ABM through automated campaigns triggered by firmographic and intent data signals."),

  h3("3.6.2 ABM Campaign Execution"),
  p("Each target account should have a multi-touch campaign orchestrated across multiple channels. The typical ABM campaign sequence includes: identification of key stakeholders within the target account (CTO, VP Engineering, Head of AI, Data Science Manager, procurement); initial engagement through LinkedIn connection requests, personalized email outreach referencing the company's specific AI stack or evaluation challenges; delivery of a custom benchmark analysis comparing the models the company is known to use; an invitation to a private demo or consultation tailored to their industry use case; retargeting display ads on industry publications the target account's employees frequently visit; and ongoing nurture through quarterly business reviews and product update briefings."),
  p("The ABM program should be measured on account-level metrics rather than individual lead metrics, including target account engagement rate (percentage of accounts with at least one meaningful interaction), pipeline velocity (time from first touch to opportunity creation), average deal size for ABM-sourced deals, and ABM-influenced revenue. The expected ROI from ABM should be significantly higher than other channels, with typical ABM programs delivering 3-5x higher conversion rates and 2-3x larger deal sizes compared to traditional demand generation."),

  // ═══════════════════════════════════════════════════
  // 4. TARGETED ADVERTISING CAMPAIGNS
  // ═══════════════════════════════════════════════════
  h1("4. Targeted Advertising Campaigns"),
  h2("4.1 Campaign Framework"),
  p("All advertising campaigns will follow a structured framework of plan, launch, measure, and optimize. Each campaign begins with a clear hypothesis (for example, 'Ads targeting AI researchers comparing Claude 4 vs GPT-4o will drive leaderboard page visits at a CPA under $30'), measurable success criteria, and a defined testing plan. Campaigns are launched with controlled budgets for initial learning (typically 1-2 weeks), then scaled based on performance data. The optimization cycle runs weekly, with creative refreshes monthly and full campaign reviews quarterly."),
  p("The campaign framework also includes a unified tracking and attribution system that connects ad impressions and clicks through to registration, activation, and conversion events. This requires proper UTM parameter naming conventions, cross-domain tracking for any landing pages hosted outside the main domain, and integration between ad platform APIs and the platform's analytics system. Attribution will use a data-driven model that weights touchpoints based on their actual contribution to conversion rather than relying on last-click attribution, which undervalues awareness-stage channels."),

  h2("4.2 Campaign Portfolio"),
  ...makeTable(
    ["Campaign", "Platform", "Target Audience", "Budget/Month", "KPI Target"],
    [
      ["Brand Search", "Google Ads", "Users searching for TheOneWayGDA", "$500-$800", "CPC < $1.50, CTR > 15%"],
      ["Category Search", "Google Ads", "AI model comparison seekers", "$2,000-$3,000", "CPA < $50, Conv. rate > 3%"],
      ["Competitor Conquest", "Google Ads", "Users searching HuggingFace, SPSS", "$800-$1,200", "Share of voice > 15%"],
      ["Enterprise Awareness", "LinkedIn", "CTOs, VP Eng, 200+ employees", "$2,000-$3,000", "CPL < $120, MQL rate > 20%"],
      ["Community Engagement", "Reddit", "r/MachineLearning, r/artificial", "$500-$1,000", "CPC < $0.80, Eng. rate > 3%"],
      ["Retargeting", "Google Display", "Site visitors, non-converters", "$1,000-$1,500", "ROAS > 4x, CTR > 0.5%"],
      ["YouTube Pre-roll", "YouTube", "AI/ML tutorial viewers", "$1,000-$2,000", "View rate > 25%, VTR > 10%"],
    ],
    "Table 6: Advertising Campaign Portfolio"
  ),
  spacer(),

  h2("4.3 Creative Strategy & Testing"),
  p("Ad creative should follow a data-driven testing methodology with systematic variation and measurement. Each campaign should test at least three variants of headline copy, two visual treatments, and two CTA variations simultaneously. For Google Search Ads, this means testing responsive search ads with different value proposition angles (performance-focused: 'Compare 19+ AI Models Across 6 Benchmarks'; cost-focused: 'Find the Most Cost-Effective AI Model'; authority-focused: 'The Most Comprehensive AI Evaluation Platform'). For display and social ads, visual treatments should include data visualizations from actual benchmark results, screenshot mockups of the workspace interface, and lifestyle imagery of AI professionals using the platform."),
  p("All creative should be designed with platform-specific best practices in mind. Google Search ads need to match the search query intent precisely and include relevant extensions. LinkedIn ads should use professional imagery and language that resonates with business decision-makers. Reddit ads should adopt an authentic, community-friendly tone that provides genuine value. A creative asset library should be maintained with templates, brand guidelines, and approved messaging frameworks to ensure consistency while enabling rapid testing and iteration."),

  // ═══════════════════════════════════════════════════
  // 5. LEAD GENERATION & QUALIFICATION
  // ═══════════════════════════════════════════════════
  h1("5. Lead Generation & Qualification"),
  h2("5.1 Lead Generation Strategy"),
  p("Lead generation for TheOneWayGDA operates on a freemium model where the product itself is the primary lead magnet. Unlike traditional B2B marketing that relies on gated content and form submissions, TheOneWayGDA's approach leverages the platform's free tier to capture user information through the existing email gate and registration system. The platform already asks visitors to self-identify as Researcher, Student, Professional, Enterprise, Developer, Educator, or General, which provides immediate segmentation data that can be used for personalized follow-up communications."),
  p("Beyond product-led lead generation, supplementary lead magnets should be developed to capture leads who are not yet ready to create an account but are interested in AI evaluation content. These include downloadable benchmark comparison reports (gated behind an email form), an AI Model Selection Quiz that recommends the best model based on the user's specific use case, a free weekly email newsletter curating the most important AI model updates and industry news, webinar registrations for live benchmark analysis sessions and product demos, and an ROI calculator tool that estimates the cost savings from using the optimal AI model."),

  h2("5.2 Lead Qualification Framework"),
  p("Lead qualification ensures that sales and marketing efforts are focused on the prospects most likely to convert to paying customers. The qualification framework uses a combination of the lead scoring model described in Section 3.5.2 and a modified BANT (Budget, Authority, Need, Timing) assessment adapted for the platform's freemium model."),
  ...makeTable(
    ["Qualification Level", "Criteria", "Action", "Expected Conversion"],
    [
      ["Hot Lead (Score 80+)", "VP/C-level, hit free tier limit, viewed pricing", "Direct sales outreach within 24h", "25-35% to paid"],
      ["Warm Lead (Score 50-79)", "Active user, visited 5+ pages, opened 3+ emails", "Personalized email sequence", "10-15% to paid"],
      ["Nurture Lead (Score 25-49)", "Registered but low activity, single session", "Automated nurture campaign", "3-5% to paid"],
      ["Cold Lead (Score < 25)", "Registered, no activity in 14+ days", "Re-engagement campaign", "1-2% to paid"],
    ],
    "Table 7: Lead Qualification Matrix"
  ),
  spacer(),

  // ═══════════════════════════════════════════════════
  // 6. SITE & CONVERSION OPTIMIZATION
  // ═══════════════════════════════════════════════════
  h1("6. Site & Conversion Optimization"),
  h2("6.1 Conversion Funnel Analysis"),
  p("The conversion funnel for TheOneWayGDA has four key stages: Visitor (lands on any page), Registrant (completes email gate or registration), Activated User (completes onboarding tour and uses a core feature), and Paying Customer (upgrades to Pro or Enterprise). At each stage, there is measurable drop-off that represents both a challenge and an optimization opportunity. The initial focus should be on measuring the actual conversion rates at each stage using analytics events, identifying the highest-impact drop-off points, and implementing targeted optimizations."),

  ...makeTable(
    ["Funnel Stage", "Current Est.", "Target (6 mo)", "Target (12 mo)", "Primary Optimization"],
    [
      ["Visitor to Registrant", "~8%", "15%", "22%", "Landing page A/B tests, value prop clarity"],
      ["Registrant to Activated", "~40%", "60%", "75%", "Onboarding flow, feature discovery"],
      ["Activated to Paid", "~2%", "5%", "8%", "Usage limit triggers, upgrade messaging"],
      ["Free to Pro", "~1.5%", "4%", "6%", "Feature gating, trial offers, social proof"],
    ],
    "Table 8: Conversion Funnel Targets"
  ),
  spacer(),

  h2("6.2 Landing Page Optimization"),
  p("The landing page is the single most important page for converting visitors into registrants. The current landing page already includes strong elements: an animated hero section with gradient orb and stats bar, a features section, an SPSS comparison table, a demo section, a pricing section, and a CTA section. The optimization strategy should focus on three areas. First, A/B testing the hero section headline and subheadline to find the highest-converting value proposition. Second, adding social proof elements throughout the page, including user testimonials, logos of organizations using the platform, and real-time usage statistics. Third, optimizing the CTA placement and copy, testing different button text ('Get Started Free' vs 'Compare AI Models Now' vs 'Start Your Free Analysis') and positions (above the fold vs after features vs after pricing)."),

  h2("6.3 In-Product Conversion Optimization"),
  p("In-product conversion optimization targets users who are already registered and using the platform, focusing on converting them to paid subscribers. Key tactics include implementing smart upgrade prompts that appear contextually when a user is about to hit a free tier limit (for example, when they have used 90 of their 100 daily API calls), displaying comparison modals that show what features are available on paid tiers when a user tries to access a Pro or Enterprise-only feature, sending triggered emails when usage patterns indicate the user would benefit from upgrading (such as a user who consistently hits the 100MB storage limit), and implementing a time-limited Pro trial for highly engaged free users who show strong activation signals."),

  // ═══════════════════════════════════════════════════
  // 7. PERFORMANCE MONITORING
  // ═══════════════════════════════════════════════════
  h1("7. Performance Monitoring & Continuous Improvement"),
  h2("7.1 KPI Dashboard"),
  p("A comprehensive KPI dashboard should be established to track the performance of all marketing activities and their impact on business outcomes. The dashboard should provide real-time visibility into acquisition metrics, engagement metrics, conversion metrics, revenue metrics, and efficiency metrics. This dashboard should be accessible to all stakeholders and updated automatically through API integrations between the analytics platform, ad platforms, email service provider, and the platform's internal metrics system."),

  ...makeTable(
    ["KPI Category", "Metric", "Baseline", "6-Month Target", "12-Month Target"],
    [
      ["Acquisition", "Monthly organic sessions", "TBD", "+150%", "+300%"],
      ["Acquisition", "Monthly paid sessions", "0", "5,000", "12,000"],
      ["Acquisition", "Monthly new registrations", "TBD", "+200%", "+400%"],
      ["Engagement", "DAU/MAU ratio", "TBD", "> 25%", "> 35%"],
      ["Engagement", "Avg. session duration", "TBD", "> 4 min", "> 6 min"],
      ["Conversion", "Visitor-to-registrant rate", "~8%", "15%", "22%"],
      ["Conversion", "Free-to-paid rate", "~2%", "5%", "8%"],
      ["Revenue", "Monthly Recurring Revenue", "TBD", "$5,000", "$15,000"],
      ["Revenue", "Customer Lifetime Value", "TBD", "$250", "$500"],
      ["Efficiency", "Blended CPA", "TBD", "< $80", "< $50"],
      ["Efficiency", "Marketing spend ROI", "TBD", "> 3x", "> 5x"],
    ],
    "Table 9: Key Performance Indicators"
  ),
  spacer(),

  h2("7.2 Reporting Cadence & Optimization Cycle"),
  p("Performance monitoring follows a structured cadence of daily, weekly, monthly, and quarterly reviews. Daily monitoring focuses on real-time dashboards tracking ad spend, traffic volume, registration volume, and any anomalous changes that require immediate attention. Weekly reviews analyze campaign performance trends, A/B test results, and content performance, with optimization actions implemented within the same week. Monthly reports provide a comprehensive view of all channel performance against targets, with recommendations for budget reallocation and strategy adjustments. Quarterly strategic reviews assess overall progress against the roadmap, evaluate the effectiveness of each acquisition pillar, and make strategic decisions about scaling successful channels, sunsetting underperforming ones, and testing new opportunities."),
  p("The continuous improvement process follows a Plan-Do-Check-Act (PDCA) cycle. Each optimization hypothesis is planned with clear expected outcomes, executed with controlled tests, checked against actual performance data, and then acted upon by either scaling the winning variation or developing a new hypothesis based on learnings. This disciplined approach ensures that marketing spend is continuously optimized and that the team avoids both analysis paralysis and premature scaling of unproven tactics."),

  // ═══════════════════════════════════════════════════
  // 8. IMPLEMENTATION ROADMAP
  // ═══════════════════════════════════════════════════
  h1("8. Implementation Roadmap"),
  h2("8.1 Phase 1: Foundation (Months 1-3)"),
  pBold("Analytics & Tracking: ", "Implement comprehensive analytics using Google Analytics 4 with custom events for all key actions (registration, feature usage, upgrade, benchmark comparison). Set up conversion tracking for all advertising platforms. Configure UTM parameter tracking and attribution modeling. Deploy heatmapping tools (Hotjar or Microsoft Clarity) for behavioral analysis. Establish automated reporting dashboards in Looker Studio or a similar BI tool."),
  pBold("SEO Technical Audit: ", "Run a complete technical SEO audit using Screaming Frog and Google Search Console. Fix any crawl errors, broken links, or duplicate content issues. Optimize Core Web Vitals scores. Submit the enhanced sitemap to Google Search Console and Bing Webmaster Tools. Set up Google Business Profile if applicable. Begin building backlinks through digital PR outreach."),
  pBold("Content Infrastructure: ", "Develop the content strategy document with keyword research, content calendar, and editorial guidelines. Set up the blog infrastructure with SEO-optimized templates. Create the first batch of 8-10 pillar articles targeting high-priority keywords. Establish content distribution workflows for repurposing across channels."),
  pBold("Email & Automation Setup: ", "Select and configure the marketing automation platform (HubSpot recommended for the feature set and integration ecosystem). Set up the email template library with on-brand designs. Configure the welcome email series (5 emails), the educational nurture sequence, and the upgrade trigger emails. Implement the lead scoring model with all defined signals and thresholds."),

  h2("8.2 Phase 2: Scaling (Months 4-6)"),
  pBold("Paid Advertising Launch: ", "Launch Google Ads campaigns with the tiered structure (brand search, category search, competitor conquest). Begin LinkedIn advertising targeting enterprise decision-makers. Start Reddit and Twitter/X advertising for community engagement. Implement retargeting campaigns for website visitors. Begin A/B testing ad creative and landing pages with weekly optimization cycles."),
  pBold("Content Production Scale-Up: ", "Increase content production to the full calendar cadence (weekly tutorials, bi-weekly comparison guides, monthly case studies). Publish the first quarterly 'State of AI Models' benchmark report as gated content for lead generation. Launch the YouTube channel with tutorial videos. Begin the infographic series for social distribution."),
  pBold("ABM Program Launch: ", "Identify and research the first 50 target accounts across three tiers. Build account profiles with key stakeholder information, technology stack data, and potential pain points. Develop personalized outreach sequences for Tier 1 accounts. Launch semi-personalized campaigns for Tier 2 accounts with industry-specific content."),

  h2("8.3 Phase 3: Optimization (Months 7-9)"),
  pBold("Conversion Rate Optimization: ", "Based on accumulated data from Phase 2, implement the highest-impact CRO initiatives identified through funnel analysis. Run structured A/B tests on the landing page (hero section, pricing section, CTA placement), in-product upgrade prompts, and email sequences. Implement smart feature gating and contextual upgrade messaging. Launch a time-limited Pro trial program for highly engaged free users."),
  pBold("Channel Optimization: ", "Analyze channel performance data from the first six months and reallocate budget toward the highest-performing channels. Scale winning campaigns by 20-30% while reducing spend on underperforming ones. Expand the ABM program to the full 100-account target list. Develop channel-specific ROI models to guide future budget allocation decisions."),
  pBold("Marketing Automation Maturity: ", "Implement advanced automation workflows including predictive lead scoring using machine learning models, multi-channel orchestration (coordinating email, ads, and in-product messaging for a unified user experience), lifecycle-stage-based campaign automation, and automated reporting that surfaces actionable insights to the marketing team."),

  h2("8.4 Phase 4: Maturity (Months 10-12)"),
  pBold("Predictable Growth Engine: ", "By this phase, the goal is to have established a predictable, repeatable growth engine where the relationship between marketing spend and revenue outcomes is well-understood and can be forecasted with reasonable accuracy. This requires sophisticated attribution modeling, reliable cohort analysis, and established unit economics (CAC, LTV, LTV:CAC ratio) that inform budget allocation decisions."),
  pBold("International Expansion Planning: ", "Based on organic demand signals (traffic from non-English-speaking countries, international registrations, partnership inquiries), begin planning for international expansion. This includes translating key content into priority languages, setting up localized landing pages, configuring international SEO with hreflang tags, and researching local advertising platforms and content distribution channels."),
  pBold("Partnership & Integration Ecosystem: ", "Launch a formal partnership program targeting AI model providers (OpenAI, Anthropic, Google DeepMind), cloud platforms (AWS, GCP, Azure), and complementary SaaS tools. Develop an integration marketplace that allows third-party tools to connect with TheOneWayGDA platform, creating switching costs and network effects that strengthen the competitive moat."),

  // ═══════════════════════════════════════════════════
  // 9. BUDGET ALLOCATION
  // ═══════════════════════════════════════════════════
  h1("9. Budget Allocation"),
  p("The budget allocation follows a phased approach that aligns spending with the implementation roadmap. In the early phases, investment is weighted toward infrastructure, content, and SEO which build long-term organic value. As the foundation matures, budget shifts toward paid advertising and ABM which deliver more immediate, measurable results at scale. The total recommended marketing budget for the first 12 months ranges from $8,000 to $15,000 per month depending on growth ambitions and available resources."),

  ...makeTable(
    ["Category", "Phase 1 (M1-3)", "Phase 2 (M4-6)", "Phase 3 (M7-9)", "Phase 4 (M10-12)", "Annual Total"],
    [
      ["SEO & Content", "$2,000", "$3,000", "$3,500", "$4,000", "$37,500"],
      ["Paid Advertising", "$1,000", "$4,000", "$6,000", "$7,000", "$54,000"],
      ["Email & Automation Tools", "$1,500", "$1,500", "$1,500", "$1,500", "$18,000"],
      ["ABM Programs", "$500", "$2,000", "$3,000", "$3,500", "$27,000"],
      ["CRO & Analytics Tools", "$1,000", "$800", "$500", "$500", "$8,400"],
      ["Content Production", "$2,000", "$3,000", "$3,000", "$3,000", "$33,000"],
      ["Total Monthly", "$8,000", "$14,300", "$17,500", "$19,500", "-"],
      ["Total Phase", "$24,000", "$42,900", "$52,500", "$58,500", "$177,900"],
    ],
    "Table 10: Budget Allocation (USD)"
  ),
  spacer(),
  p("This budget represents a growth-stage investment typical for a SaaS platform transitioning from product-market fit validation to scalable customer acquisition. The expected return on this investment, based on industry benchmarks for B2B SaaS marketing, is a 3-5x marketing-sourced revenue multiple within the first year, meaning for every dollar spent on marketing, three to five dollars in annual recurring revenue should be generated by the end of the 12-month period. The budget should be reviewed quarterly and adjusted based on actual performance data and the evolving competitive landscape."),

  // ═══════════════════════════════════════════════════
  // 10. RISK ANALYSIS & MITIGATION
  // ═══════════════════════════════════════════════════
  h1("10. Risk Analysis & Mitigation"),
  ...makeTable(
    ["Risk", "Probability", "Impact", "Mitigation Strategy"],
    [
      ["High CPA on paid channels", "Medium", "High", "Diversify channels, improve organic, A/B test relentlessly"],
      ["SEO algorithm changes", "Medium", "Medium", "Diversify traffic sources, build brand search demand"],
      ["Competitive response from HuggingFace", "High", "High", "Differentiate on integration depth, accelerate feature velocity"],
      ["Low email engagement rates", "Medium", "Medium", "Personalize aggressively, test frequency, segment carefully"],
      ["ABM program underperformance", "Medium", "Medium", "Refine target account criteria, improve personalization"],
      ["Content quality inconsistency", "Low", "Medium", "Hire dedicated content lead, establish editorial standards"],
      ["Budget constraints", "Medium", "High", "Prioritize highest-ROI channels, defer non-essential spending"],
      ["Team capacity limitations", "Medium", "High", "Automate workflows, consider agency support for specialized tasks"],
    ],
    "Table 11: Risk Assessment Matrix"
  ),
  spacer(),
  p("Each identified risk should have a designated owner who monitors leading indicators and is empowered to take corrective action without waiting for the quarterly review cycle. Risk mitigation actions should be pre-approved and documented so that the team can respond quickly when risks materialize. The quarterly strategic review should include a formal risk reassessment, updating probability and impact scores based on new information and adding any emerging risks to the monitoring framework."),

  // ═══════════════════════════════════════════════════
  // 11. EXPECTED BENEFITS & EVALUATION
  // ═══════════════════════════════════════════════════
  h1("11. Expected Benefits & Evaluation"),
  h2("11.1 Expected Outcomes"),
  p("The successful execution of this roadmap is projected to deliver measurable improvements across all key business metrics within the 12-month implementation period. The most significant outcomes include a 3-4x increase in organic search traffic driven by the technical SEO improvements and content production engine, a pipeline of 500-1,000 new qualified registrations per month by month 12, a conversion rate from free to paid subscriptions reaching 5-8% (compared to the estimated current rate of approximately 2%), and monthly recurring revenue growing from a baseline to $15,000-$25,000 by the end of the period."),
  p("Beyond the direct revenue impact, the roadmap delivers strategic benefits that compound over time. The content library becomes a permanent asset that generates organic traffic for years. The email subscriber list grows into a owned audience that can be activated without paid media spend. The brand authority established through original research and thought leadership reduces customer acquisition costs as word-of-mouth and inbound interest increase. The ABM program creates deep relationships with enterprise accounts that generate multi-year contracts with high retention rates. Together, these strategic assets create a sustainable competitive advantage that becomes increasingly difficult for competitors to replicate."),

  h2("11.2 Success Evaluation Framework"),
  p("Success will be evaluated through a balanced scorecard approach that considers both leading indicators (activities and inputs) and lagging indicators (outcomes and results). Leading indicators include content production volume, email send volume and open rates, ad impressions and click-through rates, and number of ABM accounts engaged. Lagging indicators include organic traffic growth, conversion rates at each funnel stage, customer acquisition cost, monthly recurring revenue, and customer lifetime value. The evaluation framework also includes qualitative assessments of brand perception, competitive positioning, and team capability development."),
  p("The quarterly strategic review will assess progress against these metrics, identify areas where the roadmap is delivering above or below expectations, and make course corrections as needed. A formal midpoint review at month 6 will be particularly important for validating the fundamental assumptions of the strategy (for example, that the target audience segments are responsive to the chosen channels and messaging) and making significant strategic pivots if the data warrants it. The end-of-year review will evaluate overall ROI, document lessons learned, and inform the roadmap for the following year."),
];

const bodySection = {
  properties: {
    type: SectionType.NEXT_PAGE,
    page: {
      size: { width: 11906, height: 16838 },
      margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
    },
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })],
      })],
    }),
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "TheOneWayGDA \u2014 Growth & Acquisition Roadmap", size: 18, color: "808080", font: { ascii: "Calibri" } })],
      })],
    }),
  },
  children: bodyContent,
};

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ASSEMBLY
// ═══════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Times New Roman" },
          size: 24,
          color: c(BP.body),
        },
        paragraph: {
          spacing: { line: 312 },
        },
      },
      heading1: {
        run: {
          font: { ascii: "Times New Roman" },
          size: 32,
          bold: true,
          color: c(BP.primary),
        },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: {
          font: { ascii: "Times New Roman" },
          size: 28,
          bold: true,
          color: c(BP.primary),
        },
        paragraph: { spacing: { before: 280, after: 120, line: 312 } },
      },
      heading3: {
        run: {
          font: { ascii: "Times New Roman" },
          size: 24,
          bold: true,
          color: c(BP.primary),
        },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
      },
    },
  },
  sections: [coverSection, tocSection, bodySection],
});

// ═══════════════════════════════════════════════════════════════
// GENERATE FILE
// ═══════════════════════════════════════════════════════════════
const OUTPUT = "/home/z/my-project/download/TheOneWayGDA_Growth_Acquisition_Roadmap.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Document generated: " + OUTPUT);
});
