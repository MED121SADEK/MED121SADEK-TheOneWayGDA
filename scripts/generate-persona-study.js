const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, TableOfContents, SectionType, LevelFormat,
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════
// PALETTE: DS-1 Deep Sea (Tech/AI report)
// ═══════════════════════════════════════════════════════════
const P = {
  bg: "0B1C2C", titleColor: "FFFFFF", subtitleColor: "B0B8C0",
  metaColor: "90989F", footerColor: "687078", accent: "529286",
  headerBg: "529286", headerText: "FFFFFF", accentLine: "529286",
  innerLine: "BECFCC", surface: "E8ECEB",
};
const c = (hex) => hex;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function hBorder(color, size) {
  return { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size, color }, insideVertical: NB };
}

function safeText(v, ph) { return (v === undefined || v === null || v === "") ? (ph || "") : String(v); }

// Horizontal-only table borders
const hTableBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accentLine) },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accentLine) },
  left: NB, right: NB,
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
  insideVertical: NB,
};

// ── Text helpers ──
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: c("0B1C2C"), font: { ascii: "Calibri", eastAsia: "SimHei" } })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: c("0B1C2C"), font: { ascii: "Calibri", eastAsia: "SimHei" } })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: c("0B1C2C"), font: { ascii: "Calibri", eastAsia: "SimHei" } })] });
}
function p(text) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 312 },
    children: [new TextRun({ text, size: 24, color: "000000", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] });
}
function pBold(label, text) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, color: "000000", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: "000000", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ] });
}
function spacer(h = 120) { return new Paragraph({ spacing: { before: h } }); }

// ── Table helpers ──
function headerCell(text, width) {
  return new TableCell({ width: { size: width, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: c(P.headerBg) },
    borders: hBorder(c(P.headerBg), 1),
    children: [new Paragraph({ spacing: { before: 60, after: 60 }, children: [
      new TextRun({ text, bold: true, size: 21, color: c(P.headerText), font: { ascii: "Calibri" } }) ] })] });
}
function dataCell(text, width, shaded) {
  return new TableCell({ width: { size: width, type: WidthType.PERCENTAGE },
    shading: shaded ? { type: ShadingType.CLEAR, fill: c(P.surface) } : undefined,
    borders: hBorder(c(P.headerBg), 0),
    children: [new Paragraph({ spacing: { before: 50, after: 50, line: 280 },
      children: [new TextRun({ text, size: 20, color: "000000", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }) ] })] });
}

function makeTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  const pcts = colWidths.map(w => Math.round((w / total) * 1000) / 10);
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: hTableBorders,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true,
        children: headers.map((h, i) => headerCell(h, pcts[i])) }),
      ...rows.map((row, ri) => new TableRow({ cantSplit: true,
        children: row.map((cell, ci) => dataCell(cell, pcts[ci], ri % 2 === 0)) })),
    ] });
}

// ═══════════════════════════════════════════════════════════
// COVER (R1 Pure Paragraph Left — DS-1)
// ═══════════════════════════════════════════════════════════
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt; let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt); if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl); if (lines.length <= 3) break; titlePt -= 2;
  }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, charsPerLine(minPt)); titlePt = minPt; }
  return { titlePt, titleLines: lines };
}

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = /[\s\-\/:;,.!?]|(?<=[a-zA-Z])(?=[A-Z])/;
  const words = []; let cur = "";
  for (const ch of title) {
    cur += ch;
    if (breakAfter.test(ch) || ch === " ") { words.push(cur); cur = ""; }
  }
  if (cur) words.push(cur);
  const lines = []; let line = "";
  for (const w of words) {
    if ((line + w).length > charsPerLine && line.length > 0) { lines.push(line.trim()); line = w; }
    else line += w;
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length > 3) {
    const merged = []; let buf = "";
    for (let i = 0; i < lines.length; i++) {
      buf += (buf ? " " : "") + lines[i];
      if (i === Math.floor(lines.length / 2) - 1 || i === lines.length - 1) { merged.push(buf); buf = ""; }
    }
    return merged.length <= 3 ? merged : [title.substring(0, Math.floor(title.length / 3)), title.substring(Math.floor(title.length / 3), Math.floor(title.length * 2 / 3)), title.substring(Math.floor(title.length * 2 / 3))];
  }
  return lines;
}

function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false, metaLineCount = 0, fixedHeight = 400 } = params;
  const SAFETY = 1200; const usableHeight = 16838 - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = Math.max(usableHeight - contentHeight, 400);
  const FOOTER_MIN = 800;
  const rawBottom = Math.floor(remainingSpace * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const rawTop = Math.floor(remainingSpace * 0.45);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, bottomSpacing };
}

function buildCover() {
  const padL = 1200, padR = 800;
  const title = "Buyer Persona Study";
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({ titleLineCount: titleLines.length, titlePt, hasSubtitle: true, hasEnglishLabel: true, metaLineCount: 2, fixedHeight: 400 });

  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  // English label
  children.push(new Paragraph({ indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 8 } },
    children: [new TextRun({ text: "E T U D E   D E S   P E R S O N A S   A C H E T E U R S",
      size: 18, color: c(P.accent), font: { ascii: "Calibri" }, characterSpacing: 40 })] }));

  // Title lines
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({ indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: c(P.titleColor), font: { ascii: "Arial" } })] }));
  }

  // Subtitle
  children.push(new Paragraph({ indent: { left: padL }, spacing: { after: 800 },
    children: [new TextRun({ text: "THE ONE WAY GDA  |  AI-Powered Statistical Analysis Platform", size: 24, color: c(P.subtitleColor), font: { ascii: "Calibri" } })] }));

  // Meta lines
  const metaLines = ["Strategic E-Commerce Readiness  |  June 2026", "Confidential  |  Prepared for Internal Decision-Making"];
  for (const line of metaLines) {
    children.push(new Paragraph({ indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: c(P.metaColor), font: { ascii: "Calibri" } })] }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  // Footer
  children.push(new Paragraph({ indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    children: [
      new TextRun({ text: "THE ONE WAY GDA", size: 16, color: c(P.footerColor), font: { ascii: "Calibri" } }),
      new TextRun({ text: "                                                    ", size: 16 }),
      new TextRun({ text: "onewaygda.com", size: 16, color: c(P.footerColor), font: { ascii: "Calibri" } }),
    ] }));

  return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({ height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.bg) }, borders: noBorders, children })] })] })];
}

// ═══════════════════════════════════════════════════════════
// FOOTERS
// ═══════════════════════════════════════════════════════════
function romanFooter() {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })] })] });
}
function arabicFooter() {
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })] })] });
}

// ═══════════════════════════════════════════════════════════
// BODY CONTENT
// ═══════════════════════════════════════════════════════════
function buildBody() {
  const content = [];

  // ── 1. EXECUTIVE SUMMARY ──
  content.push(h1("1. Executive Summary / Resume Executif"));

  content.push(h2("1.1 Executive Summary"));
  content.push(p("This Buyer Persona Study has been conducted to establish a data-driven foundation for the design, structure, and marketing strategy of THE ONE WAY GDA e-commerce platform. As GDA prepares to launch its commercial layer, understanding precisely who the target buyers are, what motivates them, where they seek information, and what objections they raise at each stage of their purchasing journey becomes a critical strategic imperative. Without this analysis, the platform risks attracting unqualified traffic, generating low conversion rates, and wasting marketing budget on channels that do not reach decision-makers."));
  content.push(p("Through an in-depth analysis of the existing platform architecture, user data models, pricing structure, competitive landscape, and industry benchmarks for AI-powered SaaS platforms, this study identifies four distinct buyer personas that represent the core addressable market. These personas span the academic research sector, professional data science practice, student communities, and enterprise decision-making. Each persona has been mapped across the complete purchasing funnel, from initial awareness through consideration, decision, and long-term retention, with specific attention to the obstacles, triggers, and content needs at every stage."));
  content.push(p("The findings reveal that GDA possesses a unique dual-value proposition: it serves both as an accessible AI-powered SPSS replacement for statistical analysis and as a comprehensive AI model evaluation ecosystem. This dual positioning creates multiple entry points for different buyer segments but also requires careful navigation architecture and messaging strategy to avoid confusing prospects. The recommendations in this report directly inform the e-commerce site structure, pricing page design, call-to-action placement, content marketing strategy, SEO keyword targeting, and advertising channel allocation."));

  content.push(h2("1.2 Resume Executif"));
  content.push(p("Cette etude des personas acheteurs a ete realisee pour etablir une base factuelle solide destinee a guider la conception, la structure et la strategie marketing de la plateforme e-commerce THE ONE WAY GDA. Alors que GDA se prepare a lancer sa couche commerciale, comprendre precisement qui sont les acheteurs cibles, ce qui les motive, ou ils recherchent des informations et quelles objections ils soulevent a chaque etape de leur parcours d'achat constitue un imperatif strategique critique. Sans cette analyse, la plateforme risque d'attirer du trafic non qualifie, de generer un faible taux de conversion et de gaspiller son budget marketing sur des canaux qui n'atteignent pas les decideurs."));
  content.push(p("A travers une analyse approfondie de l'architecture de la plateforme existante, des modeles de donnees utilisateurs, de la structure tarifaire, du paysage concurrentiel et des referentiels du secteur pour les plateformes SaaS alimentees par l'IA, cette etude identifie quatre personas acheteurs distincts qui representent le marche cible accessible. Ces personas couvrent le secteur de la recherche academique, la pratique professionnelle de la science des donnees, les communautes etudiantes et la prise de decision en entreprise. Chaque persona a ete cartographie sur l'ensemble de l'entonnoir d'achat."));
  content.push(p("Les resultats revelent que GDA possede une proposition de valeur duale unique : elle sert a la fois de remplacement accessible et alimente par l'IA pour l'analyse statistique de type SPSS, et d'ecosysteme complet d'evaluation de modeles IA. Ce double positionnement cree de multiples points d'entree pour differents segments d'acheteurs, mais necessite egalement une architecture de navigation et une strategie de messagerie soignees pour eviter de desorienter les prospects."));

  // ── 2. METHODOLOGY ──
  content.push(h1("2. Methodology & Data Sources / Methodologie et Sources"));

  content.push(h2("2.1 Research Methodology"));
  content.push(p("The methodology for this buyer persona study combines qualitative platform analysis with quantitative industry benchmarking, following the Template D research report framework. The research was conducted across four complementary data streams to ensure comprehensive and triangulated findings that can withstand scrutiny from both marketing and product leadership teams."));
  content.push(p("First, a thorough platform audit was performed, analyzing the complete GDA application architecture including all 30+ Prisma data models, the route structure across public and authenticated sections, the three-tier pricing model (Free, Pro at $19/month, Enterprise custom), and the feature set spanning the statistical workspace, AI arena, leaderboard, copilot studio, community hub, and workflow automation modules. This audit identified the functional capabilities that serve as value propositions for different user segments."));
  content.push(p("Second, existing user base indicators were catalogued from publicly available platform data: over 10,000 claimed users, representation from more than 500 universities, presence in over 80 countries, and multi-language support covering English, Arabic, French, Spanish, German, Chinese, Japanese, and Korean. These indicators provide demographic and geographic boundaries for persona construction."));
  content.push(p("Third, a competitive landscape analysis was conducted examining major alternatives in the statistical analysis space (SPSS, R/RStudio, Python/Jupyter, Jamovi, JASP) and the AI evaluation space (Hugging Face Leaderboards, LMSYS Chatbot Arena, Papers with Code). This competitive mapping reveals positioning opportunities and threat areas for each persona segment."));
  content.push(p("Fourth, industry benchmarks from SaaS conversion rate studies, edtech purchasing patterns, and enterprise software procurement cycles were incorporated to validate the persona profiles and ensure the journey maps reflect realistic timelines, touchpoints, and objection patterns."));

  content.push(h2("2.2 Methodologie de Recherche"));
  content.push(p("La methodologie de cette etude combine l'analyse qualitative de la plateforme avec le benchmarking quantitatif du secteur. La recherche a ete conduite a travers quatre flux de donnees complementaires pour assurer des resultats exhaustifs et triangules pouvant resister a l'examen des equipes de marketing et de direction produit."));
  content.push(p("Premierement, un audit approfondi de la plateforme a ete realise, analysant l'architecture complete de l'application GDA, y compris les plus de 30 modeles de donnees Prisma, la structure des routes, le modele tarifaire a trois niveaux (Gratuit, Pro a 19$/mois, Entreprise personnalise), et l'ensemble des fonctionnalites couvrant l'espace de travail statistique, l'arene IA, le classement, le studio de copilots, le hub communautaire et l'automatisation des flux de travail."));
  content.push(p("Deuxiemement, les indicateurs de la base d'utilisateurs existante ont ete recenses a partir des donnees publiquement disponibles de la plateforme : plus de 10 000 utilisateurs declares, la representation de plus de 500 universites, une presence dans plus de 80 pays et un support multilingue couvrant l'anglais, l'arabe, le francais, l'espagnol, l'allemand, le chinois, le japonais et le coreen. Ces indicateurs fournissent les frontieres demographiques et geographiques pour la construction des personas."));

  // ── 3. PERSONA 1: THE ACADEMIC RESEARCHER ──
  content.push(h1("3. Persona 1: The Academic Researcher / Le Chercheur Academique"));

  content.push(h2("3.1 Persona Profile / Profil du Persona"));

  content.push(makeTable(
    ["Attribute / Attribut", "Details"],
    [
      ["Name / Nom", "Dr. Amira Benali (pseudonym representative profile)"],
      ["Age Range / Tranche d'age", "28 - 45 years old"],
      ["Role / Role", "PhD Researcher, Postdoctoral Fellow, or Assistant Professor"],
      ["Affiliation / Affiliation", "University or public research institution"],
      ["Field / Domaine", "Social sciences, psychology, education, public health, or natural sciences"],
      ["Tech Comfort / Competence tech", "Moderate: uses statistical software but is not a developer"],
      ["Budget / Budget", "Limited: relies on institutional licenses or seeks free/low-cost alternatives"],
      ["Language / Langue", "Multilingual needs: reads English papers, may prefer French/Arabic/Spanish interface"],
    ],
    [35, 65]
  ));

  content.push(h2("3.2 Psychographic Profile / Profil Psychographique"));
  content.push(p("The Academic Researcher is driven by the publish-or-perish imperative that defines modern academic career progression. Their primary objective is to produce rigorous, peer-reviewable research outputs as efficiently as possible. They value methodological transparency and reproducibility, not only as ethical commitments but as practical necessities for surviving the peer review process. Time is their most constrained resource: between teaching responsibilities, grant writing, literature reviews, and data collection, the actual analysis phase must be as streamlined as possible."));
  content.push(p("Psychologically, this persona exhibits a strong preference for tools that are well-documented and have established credibility within their academic community. They are influenced by recommendations from colleagues, methodologists they admire, and citations in published papers. However, they are also paradoxically open to innovation when it demonstrably reduces their workload. The key tension is between the safety of established tools (SPSS, R) and the efficiency gains promised by AI-powered alternatives."));
  content.push(p("They tend to be methodical in their evaluation process, often running parallel analyses on a new tool and their existing software to verify consistency of results. Data privacy and sovereignty are paramount concerns, particularly for researchers handling sensitive human subjects data, patient records, or proprietary datasets. The assurance that their data never leaves their local machine (a feature GDA explicitly supports through its offline mode) is a powerful differentiator."));

  content.push(h2("3.3 Pain Points, Motivations & Objections / Points de Douleur, Motivations et Objections"));
  content.push(makeTable(
    ["Dimension", "EN Description", "FR Description"],
    [
      ["Pain Point 1", "SPSS institutional licenses cost $1,000-3,000/year per seat, often with limited availability", "Les licences institutionnelles SPSS coutent entre 1 000 et 3 000 $/an par poste, souvent avec une disponibilite limitee"],
      ["Pain Point 2", "Steep learning curve for R/Python distracts from actual research questions", "La courbe d'apprentissage abrupte de R/Python distrait des questions de recherche reelles"],
      ["Pain Point 3", "Data cleaning and preprocessing consumes 60-80% of analysis time", "Le nettoyage et le pretraitement des donnees consomment 60 a 80% du temps d'analyse"],
      ["Pain Point 4", "Multilingual research teams struggle with English-only statistical software interfaces", "Les equipes de recherche multilingues peinent avec les interfaces de logiciels statistiques uniquement en anglais"],
      ["Motivation 1", "Publish faster with AI-assisted analysis that suggests appropriate tests and visualizations", "Publier plus rapidement avec une analyse assistee par IA qui suggere les tests et visualisations appropries"],
      ["Motivation 2", "Ensure reproducibility with built-in version control and syntax documentation", "Assurer la reproductibilite avec le controle de version integre et la documentation syntaxique"],
      ["Motivation 3", "Process multilingual survey data (Arabic, French) without manual translation", "Traiter les donnees d'enquetes multilingues sans traduction manuelle"],
      ["Objection 1", "Will the AI-generated analysis be accepted by peer reviewers?", "L'analyse generee par l'IA sera-t-elle acceptee par les evaluateurs pairs ?"],
      ["Objection 2", "Can I trust this platform with sensitive human subjects research data?", "Puis-je faire confiance a cette plateforme avec des donnees de recherche sensibles sur des sujets humains ?"],
      ["Objection 3", "What happens if the platform shuts down? How do I reproduce past analyses?", "Que se passe-t-il si la plateforme ferme ? Comment reproduire les analyses passees ?"],
    ],
    [18, 41, 41]
  ));

  content.push(h2("3.4 Preferred Channels / Canaux Prefere"));
  content.push(p("The Academic Researcher discovers new tools primarily through academic search engines and scholarly social networks. Google Scholar is their primary discovery channel when they encounter methodological papers that reference analytical tools. ResearchGate serves as both a discovery and validation platform, where they see colleagues discussing and recommending software. Academic Twitter (now X) communities organized around hashtags like #AcademicChatter, #StatsTwitter, and #RStats provide organic exposure through peer recommendations rather than advertising."));
  content.push(p("University IT departments and library resource pages serve as institutional trust validators. When a tool appears on a university-recommended software list or is available through institutional procurement channels, it bypasses individual evaluation barriers. Conference presentations, methodology workshops, and journal review sections also function as high-trust discovery channels. This persona is largely immune to traditional digital advertising but highly responsive to peer validation, published case studies, and free workshop offerings that demonstrate concrete research applications."));

  content.push(h2("3.5 Journey Map / Cartographie du Parcours"));
  content.push(makeTable(
    ["Stage / Etape", "Touchpoints", "Content Needs", "Objections", "Conversion Trigger"],
    [
      ["Awareness", "Google Scholar, ResearchGate, conference talk, colleague recommendation", "Methodology paper citing GDA, comparison with SPSS, demo video", "Is this a serious academic tool or a toy?", "Peer recommendation from trusted colleague"],
      ["Consideration", "GDA website, tutorial pages, free tier sign-up, methodological blog posts", "Discipline-specific tutorials (psychology, education, health), reproducibility guide", "Will results match SPSS output? Learning curve?", "Free tier successfully imports and analyzes their own dataset"],
      ["Decision", "Pricing page, university procurement process, institutional license inquiry", "Academic case studies, published papers using GDA, enterprise pricing for departments", "Budget approval process, IT security review", "Free tier limitations reached during thesis/dissertation analysis"],
      ["Retention", "Workspace, community, tutorials, workflow automation", "Advanced technique tutorials, API documentation, collaboration features", "Platform stability, data export reliability", "First successful publication using GDA analysis"],
    ],
    [15, 21, 22, 21, 21]
  ));

  // ── 4. PERSONA 2: THE DATA PRACTITIONER ──
  content.push(h1("4. Persona 2: The Data Practitioner / Le Practicien de la Donnee"));

  content.push(h2("4.1 Persona Profile / Profil du Persona"));
  content.push(makeTable(
    ["Attribute / Attribut", "Details"],
    [
      ["Name / Nom", "Marcus Chen (pseudonym representative profile)"],
      ["Age Range / Tranche d'age", "25 - 40 years old"],
      ["Role / Role", "Data Analyst, ML Engineer, BI Developer, or Analytics Lead"],
      ["Affiliation / Affiliation", "Technology company, startup, consulting firm, or independent contractor"],
      ["Field / Domaine", "Technology, finance, healthcare, e-commerce, or management consulting"],
      ["Tech Comfort / Competence tech", "High: proficient in Python, SQL, Git; evaluates tools based on API access and integrations"],
      ["Budget / Budget", "Moderate: has individual or team budget for productivity tools ($20-100/month)"],
      ["Language / Langue", "Primarily English; values clean, developer-friendly documentation"],
    ],
    [35, 65]
  ));

  content.push(h2("4.2 Psychographic Profile / Profil Psychographique"));
  content.push(p("The Data Practitioner is an efficiency-driven professional who evaluates tools based on measurable productivity gains. Unlike the Academic Researcher who prioritizes methodological rigor and peer acceptance, this persona cares about workflow integration, automation potential, and the ability to move quickly from data ingestion to actionable insights. They are tool-agnostic by nature, willing to adopt new solutions if they demonstrably reduce friction in their daily work."));
  content.push(p("This persona operates in a fast-paced environment where stakeholders expect rapid turnaround on analytical requests. They are often juggling multiple projects simultaneously and deeply frustrated by tool fragmentation, the need to switch between separate platforms for data cleaning, statistical analysis, visualization, and AI model evaluation. GDA's promise of a unified platform that combines statistical analysis with AI benchmarking and automation directly addresses their core frustration."));
  content.push(p("They are active participants in the data science community, contributing to open-source projects, engaging in technical discussions on Reddit and Hacker News, and sharing insights on LinkedIn. Their evaluation process is hands-on: they will sign up for a free trial, test the API, attempt to integrate it into their existing workflow, and form an opinion within days rather than weeks. Technical documentation quality, API responsiveness, and the availability of a developer SDK are critical evaluation criteria that can make or break their purchasing decision."));

  content.push(h2("4.3 Pain Points, Motivations & Objections"));
  content.push(makeTable(
    ["Dimension", "EN Description", "FR Description"],
    [
      ["Pain Point 1", "Switching between 5+ tools daily (Jupyter, Tableau, SPSS, Hugging Face, GitHub) kills productivity", "Basculer entre plus de 5 outils quotidiennement detruit la productivite"],
      ["Pain Point 2", "Manual reporting consumes hours that should be spent on analysis and modeling", "Le reporting manuel consomme des heures qui devraient etre consacrees a l'analyse et la modelisation"],
      ["Pain Point 3", "AI model evaluation is fragmented across multiple platforms with inconsistent metrics", "L'evaluation des modeles IA est fragmentee sur plusieurs plateformes avec des metriques incoherentes"],
      ["Pain Point 4", "Building reproducible analysis pipelines requires significant DevOps overhead", "La construction de pipelines d'analyse reproductibles necessite une surcharge DevOps importante"],
      ["Motivation 1", "One platform for statistical analysis, AI benchmarking, and automated reporting", "Une plateforme unique pour l'analyse statistique, le benchmarking IA et le reporting automatise"],
      ["Motivation 2", "AI-powered automation of repetitive data cleaning and transformation tasks", "Automatisation par IA des taches repetitives de nettoyage et transformation des donnees"],
      ["Motivation 3", "Real-time collaboration with version control for team-based analytical projects", "Collaboration en temps reel avec controle de version pour les projets analytiques d'equipe"],
      ["Objection 1", "How well does this integrate with our existing Python/SQL/BI stack?", "Quelle est l'integration avec notre pile Python/SQL/BI existante ?"],
      ["Objection 2", "Is the $19/month Pro plan sufficient, or will I hit paywalls on essential features?", "L'offre Pro a 19$/mois est-elle suffisante ou y aura-t-il des paywalls sur des fonctionnalites essentielles ?"],
      ["Objection 3", "What happens to my data and workflows if I need to migrate away?", "Que deviennent mes donnees et workflows si je dois migrer ?"],
    ],
    [18, 41, 41]
  ));

  content.push(h2("4.4 Preferred Channels / Canaux Prefere"));
  content.push(p("The Data Practitioner discovers new tools through developer-oriented platforms and technical communities. LinkedIn is their primary professional network where they engage with data science thought leadership, follow industry practitioners, and encounter sponsored content that demonstrates technical depth. GitHub serves as both a discovery channel (when they encounter GDA-related projects or integrations) and a trust signal (active development, open-source contributions, issue responsiveness)."));
  content.push(p("Reddit communities, particularly r/MachineLearning, r/datascience, r/Python, and r/Analytics, function as peer review forums where tools are discussed, compared, and critiqued with technical rigor. Hacker News provides exposure to the most technically sophisticated segment of this persona. Product Hunt launches generate initial awareness among early adopters who actively seek new tools. YouTube technical tutorials and conference talk recordings (from NeurIPS, PyCon, Strata) provide deeper evaluation opportunities. This persona responds to technical content, benchmark comparisons, API documentation, and transparent pricing rather than marketing messaging."));

  content.push(h2("4.5 Journey Map / Cartographie du Parcours"));
  content.push(makeTable(
    ["Stage / Etape", "Touchpoints", "Content Needs", "Objections", "Conversion Trigger"],
    [
      ["Awareness", "Hacker News, Reddit, Product Hunt, LinkedIn post, colleague Slack share", "Technical blog post, benchmark comparison, GitHub repo", "Is this another hype-driven tool or genuinely useful?", "Technical demo showing real workflow integration"],
      ["Consideration", "Free tier sign-up, API documentation, SDK page, tutorial pages", "API reference, integration guides, performance benchmarks vs competitors", "API rate limits, data export capabilities, response time", "Successful API integration with their existing pipeline in under 30 minutes"],
      ["Decision", "Pricing page comparison, team plan evaluation, Stripe checkout", "ROI calculator, feature comparison table, team collaboration features", "Total cost for team of 5-10, annual vs monthly billing discount", "Hitting free tier limits during a real project deadline"],
      ["Retention", "Workspace, workflow automation, community, copilot studio", "Advanced automation tutorials, copilot marketplace, workflow templates", "Platform uptime, feature velocity, support responsiveness", "Automated workflow saves 5+ hours/week on recurring analysis"],
    ],
    [15, 21, 22, 21, 21]
  ));

  // ── 5. PERSONA 3: THE STUDENT EXPLORER ──
  content.push(h1("5. Persona 3: The Student Explorer / L'Etudiant Explorateur"));

  content.push(h2("5.1 Persona Profile / Profil du Persona"));
  content.push(makeTable(
    ["Attribute / Attribut", "Details"],
    [
      ["Name / Nom", "Sofia Martinez (pseudonym representative profile)"],
      ["Age Range / Tranche d'age", "18 - 26 years old"],
      ["Role / Role", "Undergraduate or Master's student in statistics, psychology, business, or data science"],
      ["Affiliation / Affiliation", "University or college, potentially part of a research assistantship"],
      ["Field / Domaine", "Social sciences, business analytics, data science, psychology, public health"],
      ["Tech Comfort / Competence tech", "Variable: comfortable with web apps and basic Excel, may have limited coding experience"],
      ["Budget / Budget", "Minimal: student budget, highly price-sensitive, seeks free alternatives above all"],
      ["Language / Langue", "Varies widely; values multi-language interface especially for non-English speakers"],
    ],
    [35, 65]
  ));

  content.push(h2("5.2 Psychographic Profile / Profil Psychographique"));
  content.push(p("The Student Explorer is characterized by a dual motivation structure: the immediate practical need to complete coursework, thesis requirements, or research assistantship tasks, combined with a longer-term career development objective of building marketable data analysis skills. They are in a formative stage where the tools they learn during their education significantly influence their professional tool preferences for years to come, making them strategically valuable as future advocates or detractors."));
  content.push(p("This persona is highly influenced by social proof within their immediate environment. A recommendation from a professor, teaching assistant, or senior student carries enormous weight, often more than any marketing message. They are also deeply embedded in peer-to-peer learning communities on Discord, university forums, and social media, where tool recommendations spread virally. Their evaluation process is typically brief and pragmatic: can this tool help me finish my assignment? Is the free tier generous enough? Is there a tutorial I can follow?"));
  content.push(p("They are drawn to modern, visually appealing interfaces that feel contemporary and approachable, in contrast to the dated aesthetics of traditional statistical software. The AI-powered assistance feature is particularly compelling to this segment, as it compensates for their limited statistical knowledge while helping them learn. However, they are also acutely aware of AI-detection tools used by educational institutions and need assurance that using GDA for learning purposes is ethically acceptable and pedagogically sound."));

  content.push(h2("5.3 Pain Points, Motivations & Objections"));
  content.push(makeTable(
    ["Dimension", "EN Description", "FR Description"],
    [
      ["Pain Point 1", "SPSS license is expensive for students ($50-100/year) and often unavailable on personal devices", "La licence SPSS est chere pour les etudiants et souvent indisponible sur les appareils personnels"],
      ["Pain Point 2", "University courses teach theory but provide insufficient hands-on tool training", "Les cours universitaires enseignent la theorie mais fournissent une formation pratique insuffisante sur les outils"],
      ["Pain Point 3", "Statistical concepts are abstract and difficult to connect to real-world application", "Les concepts statistiques sont abstraits et difficiles a relier a des applications reelles"],
      ["Pain Point 4", "Need to produce publication-quality visualizations for thesis without design skills", "Besoin de produire des visualisations de qualite publication pour la these sans competences en design"],
      ["Motivation 1", "Free access to professional-grade statistical tools for coursework and thesis", "Acces gratuit a des outils statistiques de niveau professionnel pour les cours et la these"],
      ["Motivation 2", "AI copilot that explains statistical choices and teaches while it assists", "Copilot IA qui explique les choix statistiques et enseigne tout en assistant"],
      ["Motivation 3", "Building a portfolio of analysis projects using modern AI-powered tools", "Construire un portfolio de projets d'analyse utilisant des outils modernes alimentes par l'IA"],
      ["Objection 1", "Is the free tier really free forever, or is this a limited-time student trap?", "Le forfait gratuit est-il vraiment gratuit pour toujours ou s'agit-il d'un piege etudiant a durée limitee ?"],
      ["Objection 2", "Will my professor accept analysis done with AI assistance?", "Mon professeur acceptera-t-il une analyse realisee avec l'assistance de l'IA ?"],
      ["Objection 3", "Can I export my thesis analysis in formats my university requires (PDF, SPSS syntax)?", "Puis-je exporter mon analyse de these dans les formats requis par mon universite ?"],
    ],
    [18, 41, 41]
  ));

  content.push(h2("5.4 Preferred Channels / Canaux Prefere"));
  content.push(p("The Student Explorer discovers tools through visual social media and peer-to-peer channels rather than traditional professional networks. YouTube is their primary educational platform, where they search for tutorial videos that demonstrate step-by-step how to perform specific analyses. TikTok and Instagram Reels increasingly serve as discovery channels, with short-form content highlighting tool features in an engaging, visually appealing format. Discord servers organized around data science, statistics, and specific university courses provide peer recommendations and real-time troubleshooting support."));
  content.push(p("University course recommendations, library resource pages, and student ambassador programs function as high-trust institutional channels. Reddit communities such as r/AskStatistics, r/learnprogramming, and r/gradschool provide honest peer reviews that carry significant weight. Student-focused platforms like Chegg, Course Hero, and Notion community templates expose them to productivity tools. This persona is responsive to free tier offerings, student discount programs, ambassador incentives, and gamification elements like certifications and leaderboard rankings that provide social validation within their peer group."));

  content.push(h2("5.5 Journey Map / Cartographie du Parcours"));
  content.push(makeTable(
    ["Stage / Etape", "Touchpoints", "Content Needs", "Objections", "Conversion Trigger"],
    [
      ["Awareness", "YouTube tutorial, TikTok, professor recommendation, classmate share", "Short demo video, getting-started guide, student-specific landing page", "Looks too good to be free - what's the catch?", "Professor mentions GDA as recommended tool for course"],
      ["Consideration", "Free sign-up, tutorial pages, community posts, student reviews on Reddit", "Step-by-step tutorials, discipline-specific guides, sample datasets to practice", "Can I finish my assignment with the free tier?", "Successfully completes a homework assignment using GDA free tier"],
      ["Decision", "Pro pricing page (may wait until thesis), student discount inquiry", "Student success stories, thesis workflow guide, export format documentation", "Is Pro worth it for one semester? Annual discount?", "Free tier dataset limit reached during thesis data analysis"],
      ["Retention", "Tutorials, community, arena, certifications", "Advanced technique tutorials, AI certification path, portfolio showcase", "Will I keep access after graduating?", "Earns first GDA certification to add to resume/CV"],
    ],
    [15, 21, 22, 21, 21]
  ));

  // ── 6. PERSONA 4: THE ENTERPRISE DECISION-MAKER ──
  content.push(h1("6. Persona 4: The Enterprise Decision-Maker / Le Decideur d'Entreprise"));

  content.push(h2("6.1 Persona Profile / Profil du Persona"));
  content.push(makeTable(
    ["Attribute / Attribut", "Details"],
    [
      ["Name / Nom", "Katherine Okafor (pseudonym representative profile)"],
      ["Age Range / Tranche d'age", "35 - 55 years old"],
      ["Role / Role", "CTO, VP of Analytics, Head of Data, or Chief Data Officer"],
      ["Affiliation / Affiliation", "Mid-to-large enterprise (100+ employees), across industries"],
      ["Field / Domaine", "Technology, finance, healthcare, retail, consulting, government"],
      ["Tech Comfort / Competence tech", "Strategic: may not code daily but understands technical architecture and integration requirements"],
      ["Budget / Budget", "Substantial: authorized to approve $10K-500K+ annual software contracts"],
      ["Language / Langue", "English for business; may require multi-language support for global teams"],
    ],
    [35, 65]
  ));

  content.push(h2("6.2 Psychographic Profile / Profil Psychographique"));
  content.push(p("The Enterprise Decision-Maker approaches software procurement through a lens of organizational risk management and return on investment. Unlike individual users who evaluate tools based on personal productivity, this persona assesses whether a platform can standardize analytical practices across teams, ensure compliance with data governance policies, reduce total cost of ownership compared to maintaining multiple point solutions, and provide the scalability and reliability that enterprise operations demand."));
  content.push(p("They are structurally risk-averse because a wrong procurement decision affects not just their own productivity but the productivity of entire teams, potentially for years due to switching costs. Their evaluation process is formal and involves multiple stakeholders: IT security, legal/compliance, procurement, team leads, and end users. Sales cycles are long, typically 3-9 months, and involve proof-of-concept deployments, security audits, and contract negotiations. They expect dedicated account management, SLA guarantees, and professional services support as part of the enterprise package."));
  content.push(p("The growing regulatory landscape around AI governance, including the EU AI Act, NIST AI Risk Management Framework, and industry-specific compliance requirements, creates an urgent need for platforms that provide built-in AI governance, audit logging, and transparency controls. GDA's existing governance module, which includes AI usage policies, compliance tracking, and audit logging, addresses a critical and timely enterprise concern that most competitors in the statistical analysis space do not adequately cover. This governance capability, combined with the analytical features, positions GDA uniquely as both a productivity tool and a compliance solution."));

  content.push(h2("6.3 Pain Points, Motivations & Objections"));
  content.push(makeTable(
    ["Dimension", "EN Description", "FR Description"],
    [
      ["Pain Point 1", "Managing 10+ separate analytical tool licenses with different renewal cycles and procurement processes", "Gerer plus de 10 licences d'outils analytiques separees avec differents cycles de renouvellement"],
      ["Pain Point 2", "AI governance gaps expose the organization to regulatory risk (EU AI Act, industry compliance)", "Les lacunes en gouvernance IA exposent l'organisation a des risques reglementaires"],
      ["Pain Point 3", "Team onboarding for new analytical tools takes weeks and requires dedicated training resources", "L'integration des equipes aux nouveaux outils analytiques prend des semaines et necessite des ressources de formation dediees"],
      ["Pain Point 4", "No unified view of AI model performance across different teams and projects", "Aucune vue unifiee des performances des modeles IA a travers les differentes equipes et projets"],
      ["Motivation 1", "Consolidate statistical analysis, AI benchmarking, and governance into a single platform", "Consolider l'analyse statistique, le benchmarking IA et la gouvernance en une seule plateforme"],
      ["Motivation 2", "Built-in AI governance and audit logging to satisfy compliance requirements", "Gouvernance IA et journalisation d'audit integrees pour satisfaire aux exigences de conformite"],
      ["Motivation 3", "Reduce total cost of ownership by replacing multiple point solutions", "Reduire le cout total de possession en remplacant plusieurs solutions ponctuelles"],
      ["Objection 1", "Can this platform pass our IT security audit? Where is data stored and processed?", "Cette plateforme peut-elle passer notre audit de securite IT ? Ou sont stockees et traitees les donnees ?"],
      ["Objection 2", "Do you support SSO/SAML, SCIM provisioning, and role-based access control?", "Prenez-vous en charge SSO/SAML, le provisionnement SCIM et le controle d'acces base sur les roles ?"],
      ["Objection 3", "What is the migration path from our current SPSS/R/Python ecosystem?", "Quelle est la voie de migration depuis notre ecosysteme SPSS/R/Python actuel ?"],
    ],
    [18, 41, 41]
  ));

  content.push(h2("6.4 Preferred Channels / Canaux Prefere"));
  content.push(p("The Enterprise Decision-Maker discovers and evaluates enterprise software through analyst reports, industry conferences, and direct sales engagement. Gartner Magic Quadrants, Forrester Waves, and G2 Grid reports serve as the primary trust-building mechanisms that validate a platform's market position and enterprise readiness. Industry conferences (Gartner Symposium, Strata Data Conference, AI Summit) provide exposure and networking opportunities that build relationships beyond the digital transaction."));
  content.push(p("LinkedIn is their primary social channel, but they engage differently from the Data Practitioner: they follow thought leadership content, industry trend analyses, and peer CTO/CDO discussions rather than technical tutorials. Direct sales outreach, particularly when personalized and informed by the prospect's industry and specific pain points, remains effective when executed with relevance and restraint. Case studies from comparable enterprises (same industry, similar team size) and ROI analyses that quantify time savings, cost reduction, and risk mitigation are the most persuasive content formats for this persona."));

  content.push(h2("6.5 Journey Map / Cartographie du Parcours"));
  content.push(makeTable(
    ["Stage / Etape", "Touchpoints", "Content Needs", "Objections", "Conversion Trigger"],
    [
      ["Awareness", "Gartner report, conference keynote, LinkedIn thought leadership, peer CTO recommendation", "Analyst report, enterprise case study, compliance whitepaper", "Is this a mature enterprise platform or a startup?", "Gartner/Forrester inclusion or peer CTO referral"],
      ["Consideration", "Enterprise landing page, sales demo request, security documentation, compliance guide", "Security whitepaper, compliance matrix (SOC2, GDPR, EU AI Act), pricing brochure", "Security audit results, SSO support, SLA terms", "Successful proof-of-concept with their own data"],
      ["Decision", "Contract negotiation, procurement review, legal sign-off, IT security approval", "Custom proposal, implementation roadmap, training plan, migration support", "Contract terms, data processing agreement, exit clauses", "Procurement approval with CTO sponsorship"],
      ["Retention", "Dedicated support, governance dashboard, team analytics, workflow automation", "Quarterly business reviews, feature roadmap, training webinars, priority support", "Platform evolution, competitive positioning, vendor lock-in", "Measurable ROI report after 6 months of deployment"],
    ],
    [15, 21, 22, 21, 21]
  ));

  // ── 7. CROSS-PERSONA JOURNEY MAPPING ──
  content.push(h1("7. Cross-Persona Journey Mapping / Cartographie Transversale"));

  content.push(p("The following comparative analysis synthesizes the four buyer personas across the complete purchasing funnel, revealing both shared patterns and segment-specific requirements that must be addressed in the e-commerce site architecture. Understanding these cross-persona dynamics is essential for designing a site that serves multiple audiences without creating confusion or cognitive overload for any single segment."));

  content.push(h2("7.1 Funnel Stage Comparison / Comparaison par Etape de l'Entonnoir"));
  content.push(makeTable(
    ["Dimension", "Academic Researcher", "Data Practitioner", "Student Explorer", "Enterprise Decision-Maker"],
    [
      ["Awareness Trigger", "Peer citation / conference", "Hacker News / Reddit", "YouTube / professor", "Analyst report / conference"],
      ["Primary Channel", "ResearchGate, Google Scholar", "GitHub, LinkedIn, Reddit", "YouTube, TikTok, Discord", "Gartner, LinkedIn, direct sales"],
      ["Consideration Behavior", "Tests with own dataset, compares output to SPSS", "API test, integration trial", "Follows tutorial, does homework", "PoC deployment, security audit"],
      ["Key Objection", "Peer reviewer acceptance", "Integration & lock-in", "Free tier sufficiency", "Security & compliance"],
      ["Decision Trigger", "Free tier limit hit during research", "Free tier limit during project deadline", "Free tier limit during thesis", "Procurement approval & PoC success"],
      ["Retention Driver", "Publication success", "Workflow time savings (5+ hrs/week)", "Certification for CV", "Measurable 6-month ROI"],
      ["Avg. Time to Purchase", "2-8 weeks", "1-4 weeks", "1-12 weeks (if at all)", "3-9 months"],
      ["Price Sensitivity", "High", "Medium", "Very High", "Low (budget available)"],
    ],
    [17, 21, 21, 21, 20]
  ));

  content.push(h2("7.2 Cross-Persona Insights / Insights Transversaux"));
  content.push(p("Several critical insights emerge from the cross-persona analysis. First, the free tier functions as the primary conversion mechanism across all four personas, but for fundamentally different reasons: for the Academic Researcher and Student, it enables hands-on evaluation with real data; for the Data Practitioner, it enables technical integration testing; for the Enterprise Decision-Maker, it enables proof-of-concept deployment. This means the free tier must be genuinely functional, not artificially limited to the point of being a demo, while still creating natural upgrade pressure at the right moment."));
  content.push(p("Second, the content needs at the consideration stage diverge dramatically by persona. The Academic Researcher needs discipline-specific methodology content; the Data Practitioner needs technical API documentation; the Student needs step-by-step tutorials; the Enterprise Decision-Maker needs security whitepapers and compliance matrices. A single e-commerce site must serve all four content needs through intelligent navigation and persona-aware content organization without making any single persona feel that the site was designed for someone else."));
  content.push(p("Third, the trust signals that drive conversion vary significantly. Academic users trust peer validation and institutional adoption; Data Practitioners trust technical depth and open-source credibility; Students trust social proof from peers and professors; Enterprise buyers trust analyst reports and formal security certifications. The e-commerce site must present these different trust signals in contextually appropriate locations throughout the user journey."));

  // ── 8. E-COMMERCE SITE STRUCTURE RECOMMENDATIONS ──
  content.push(h1("8. E-Commerce Site Recommendations / Recommandations"));

  content.push(h2("8.1 Navigation Architecture / Architecture de Navigation"));
  content.push(p("Based on the four buyer personas, the e-commerce site should implement a persona-aware navigation structure that allows each visitor to quickly find content relevant to their role without being overwhelmed by information intended for other segments. The primary navigation should organize content by use case rather than by feature, since each persona thinks in terms of the problems they need to solve rather than the technical capabilities of the platform."));
  content.push(p("The recommended top-level navigation structure is: Solutions (with sub-menus for Academic Research, Professional Analysis, Student Learning, Enterprise Governance), Pricing, Resources (tutorials, documentation, blog, case studies, webinars), Community (forum, copilot studio, arena), and Company (about, careers, security, contact). Each Solutions sub-page should be tailored to the specific persona with relevant use cases, testimonials, and CTAs. The Pricing page should clearly differentiate the Free, Pro, and Enterprise tiers with persona-recommended badges indicating which tier suits each user type."));

  content.push(h2("8.2 Product Page Design / Conception de la Page Produit"));
  content.push(p("The pricing page is the highest-stakes page in the e-commerce site, as it is where consideration-stage visitors make their purchase decision. For each tier, the feature list should be organized by persona benefit rather than technical feature. For example, instead of listing 'Unlimited datasets' as a feature, present it as 'Analyze all your research projects without hitting limits' for the Academic persona and 'Process all client datasets in one platform' for the Data Practitioner. This benefit-oriented framing connects features to the specific motivations and pain points identified in the persona analysis."));
  content.push(p("The Free tier section should emphasize 'No credit card required' and 'Start analyzing in under 2 minutes' to remove friction for the Student and Academic personas. The Pro tier ($19/month) should prominently feature the annual billing discount and position the price as 'Less than one SPSS monthly license' for the Academic segment, while for the Data Practitioner, frame it as 'Replace 5 separate tool subscriptions.' The Enterprise section should not display pricing but instead invite visitors to 'Schedule a personalized demo' and link to security documentation, compliance certifications, and a contact form."));

  content.push(h2("8.3 CTA Placement Strategy / Strategie de Placement des CTA"));
  content.push(p("Call-to-action placement must align with each persona's decision journey stage. For the Student and Academic personas who have short evaluation cycles, primary CTAs should appear early and frequently: 'Start Free Analysis' in the hero section, 'Try with Your Own Data' after each feature demonstration, and 'Upgrade to Pro' when free tier limits are approached. For the Enterprise Decision-Maker, the primary CTA should be 'Book a Demo' with secondary CTAs for 'Download Security Whitepaper' and 'View Enterprise Features.'"));
  content.push(p("The e-commerce site should implement smart CTA logic based on user behavior signals: if a visitor spends significant time on tutorial pages, show 'Start Free' CTAs; if they visit the API documentation, show 'Get API Access' CTAs; if they download the security whitepaper, show 'Contact Sales' CTAs. This behavioral targeting ensures that each persona encounters the most relevant next action at every touchpoint, increasing the probability of forward movement through the purchasing funnel."));

  content.push(h2("8.4 Trust Signals / Signaux de Confiance"));
  content.push(p("Trust signals must be distributed strategically throughout the e-commerce site to address persona-specific objections. The recommended trust signal placement includes: university logos and institutional adoption metrics ('Used by 500+ universities worldwide') for the Academic and Student personas; security certifications (SOC 2, GDPR compliance badge) and data sovereignty statements ('Your data never leaves your browser') for the Enterprise and Academic personas; user count and activity metrics ('10,000+ analysts trust GDA') for all personas; and community engagement metrics ('1,000+ copilots in the Studio marketplace') for the Data Practitioner persona."));
  content.push(p("Additionally, the site should feature peer validation through case study quotes from identifiable researchers at named institutions, data-driven testimonials from practitioners at known companies, and student success stories that include specific outcomes such as thesis completion, publication acceptance, or job placement. These specific, attributable testimonials carry significantly more weight than generic, anonymous quotes and address each persona's unique trust requirements."));

  // ── 9. SEO & CONTENT STRATEGY ──
  content.push(h1("9. SEO & Content Strategy / Strategie SEO et Contenu"));

  content.push(h2("9.1 Keyword Strategy by Persona / Strategie de Mots-cles par Persona"));
  content.push(p("Search engine optimization must be persona-targeted to capture qualified traffic at each funnel stage. The keyword strategy should be organized into four clusters corresponding to the four buyer personas, with each cluster containing awareness-stage informational keywords, consideration-stage comparison keywords, and decision-stage transactional keywords."));

  content.push(makeTable(
    ["Persona", "Awareness Keywords (Informational)", "Consideration Keywords (Comparison)", "Decision Keywords (Transactional)"],
    [
      ["Academic Researcher", "AI statistical analysis software, online SPSS alternative, free statistical tool for research", "GDA vs SPSS comparison, GDA vs R for social science, best AI tool for academic research", "GDA Pro pricing academic discount, GDA institutional license, buy GDA statistical software"],
      ["Data Practitioner", "AI data analysis platform, automated data cleaning AI, AI model benchmarking tool", "GDA vs Jupyter notebook, GDA vs Hugging Face leaderboard, best all-in-one data analysis tool", "GDA Pro plan features, GDA API access, GDA team pricing"],
      ["Student Explorer", "free statistics software for students, how to do statistical analysis online, learn data analysis free", "best free SPSS alternative for students, GDA vs Jamovi for coursework, free statistical software with AI", "GDA student discount, GDA free tier vs Pro, GDA for thesis analysis"],
      ["Enterprise Decision-Maker", "AI governance platform, enterprise statistical analysis solution, AI compliance software", "GDA enterprise vs Tableau, enterprise AI benchmarking platform comparison, AI governance tools comparison", "GDA enterprise pricing, request GDA demo, GDA security compliance documentation"],
    ],
    [17, 28, 28, 27]
  ));

  content.push(h2("9.2 Content Marketing Recommendations / Recommandations de Marketing de Contenu"));
  content.push(p("The content marketing strategy should produce persona-specific content assets that serve both SEO objectives and conversion goals. For the Academic Researcher, the priority content types are: methodology-focused blog posts that demonstrate GDA in the context of real research workflows, discipline-specific tutorial series (e.g., 'Complete Statistical Analysis for Psychology Research using GDA'), and downloadable research templates that pre-configure common analysis setups for specific academic fields. These content assets serve dual purposes: they rank for academic-focused long-tail keywords and provide the hands-on evaluation experience that drives conversion."));
  content.push(p("For the Data Practitioner, the content strategy should prioritize: technical deep-dive articles on GDA's architecture and API capabilities, benchmark comparison studies (e.g., 'GDA vs. Jupyter + SPSS + Hugging Face: A Unified Platform Benchmark'), developer-focused video tutorials demonstrating API integration workflows, and contributions to open-source communities that build technical credibility. The GDA leaderboard and arena features provide a natural content generation engine, as benchmark results and model comparisons are inherently shareable and link-worthy content that attracts organic backlinks."));
  content.push(p("For the Student Explorer, the priority content types are: short-form YouTube tutorials (5-15 minutes) covering specific analyses for common coursework assignments, TikTok/Reels content highlighting AI-powered features in an engaging format, a student-specific onboarding guide that walks through their first analysis from data import to export, and gamification content around certifications and leaderboard participation. For the Enterprise Decision-Maker, the content strategy should produce: security and compliance whitepapers, ROI analysis frameworks, customer case studies with quantified outcomes, and analyst report submissions to Gartner and Forrester."));

  content.push(h2("9.3 Advertising Channel Recommendations / Recommandations de Canaux Publicitaires"));
  content.push(makeTable(
    ["Channel", "Target Persona", "Ad Format", "Est. CTR Range", "Monthly Budget Suggestion"],
    [
      ["Google Search Ads", "All personas (intent-based)", "Text ads targeting comparison keywords", "2-5%", "High - primary paid acquisition channel"],
      ["LinkedIn Ads", "Data Practitioner, Enterprise", "Sponsored content, lead gen forms", "0.5-1.5%", "Medium-High - B2B targeting precision"],
      ["Reddit Ads", "Data Practitioner", "Promoted posts in r/datascience, r/MachineLearning", "1-3%", "Low-Medium - community trust required"],
      ["YouTube Ads", "Student, Academic", "Pre-roll on statistics tutorial videos", "0.5-2%", "Medium - visual demo format"],
      ["Google Display", "Student (retargeting)", "Retargeting banners after site visit", "0.1-0.5%", "Low - retargeting supplement only"],
    ],
    [20, 20, 25, 15, 20]
  ));

  // ── 10. CONCLUSIONS & NEXT STEPS ──
  content.push(h1("10. Conclusions & Next Steps / Conclusions et Prochaines Etapes"));

  content.push(h2("10.1 Key Findings Synthesis / Synthese des Resultats Cles"));
  content.push(p("This buyer persona study identifies four distinct but interconnected market segments for THE ONE WAY GDA e-commerce platform, each with unique motivations, objections, channel preferences, and conversion triggers. The Academic Researcher and Student Explorer segments represent the highest-volume, price-sensitive market that drives broad adoption and brand awareness through institutional networks. The Data Practitioner segment represents the core revenue-generating market with moderate price sensitivity and the highest propensity for individual Pro plan adoption. The Enterprise Decision-Maker segment represents the highest-value, long-sales-cycle market that drives significant contract value and establishes GDA's credibility in the enterprise space."));
  content.push(p("The critical strategic insight is that GDA's dual-value proposition, combining AI-powered statistical analysis with a comprehensive AI model evaluation ecosystem, creates a unique market position that no single competitor occupies. SPSS, R, and Python serve the statistical analysis market but lack AI evaluation features. Hugging Face, LMSYS, and Papers with Code serve the AI evaluation market but lack statistical analysis capabilities. This dual positioning, if communicated effectively through persona-targeted messaging, provides a defensible competitive advantage and a compelling narrative for each buyer segment."));

  content.push(h2("10.2 Priority Actions / Actions Prioritaires"));
  content.push(p("The following priority actions are recommended for the e-commerce site launch, organized by implementation timeline. Immediate actions (before launch) include: implementing persona-aware navigation with Solutions pages for each segment, creating a comparison landing page (GDA vs. SPSS, GDA vs. R, GDA vs. Jupyter) targeting consideration-stage keywords, and ensuring the free tier onboarding flow takes under two minutes from sign-up to first analysis."));
  content.push(p("Short-term actions (first 3 months post-launch) include: producing the top 10 SEO content pieces per persona cluster, launching retargeting campaigns for visitors who sign up for the free tier but do not convert to Pro, establishing the university ambassador program to drive organic student and academic adoption, and submitting GDA for inclusion in Gartner and Forrester analyst reports. Long-term actions (3-12 months) include: building the enterprise sales motion with dedicated sales materials and demo environments, developing the certification program as a retention and career-development tool, and expanding the copilot studio marketplace to create a self-reinforcing ecosystem that increases switching costs and platform stickiness."));

  content.push(h2("10.3 Recommended KPIs / Indicateurs Cles de Performance"));
  content.push(makeTable(
    ["KPI", "Target", "Persona Relevance", "Measurement Method"],
    [
      ["Free-to-Pro conversion rate", "8-12% within 30 days", "Academic, Practitioner, Student", "Cohort analysis by signup source"],
      ["Time to first analysis", "Under 5 minutes", "All personas", "Product analytics event tracking"],
      ["Enterprise demo request rate", "2-5% of enterprise page visitors", "Enterprise", "Form submission analytics"],
      ["Organic search traffic (persona keywords)", "50% increase in 6 months", "All personas", "Google Search Console, GA4"],
      ["Student ambassador sign-ups", "100 ambassadors in 6 months", "Student", "Ambassador program dashboard"],
      ["Net Promoter Score (NPS)", "40+ within 6 months", "All personas", "In-app NPS survey"],
      ["Monthly active users (MAU)", "20% MoM growth", "All personas", "Product analytics"],
      ["Enterprise pipeline value", "$500K+ in 12 months", "Enterprise", "CRM pipeline tracking"],
    ],
    [25, 22, 25, 28]
  ));

  content.push(h2("10.4 A/B Testing Priorities / Priorites de Tests A/B"));
  content.push(p("The e-commerce site should implement a structured A/B testing program focused on the highest-impact conversion elements identified in this study. The recommended testing priorities, in order of expected impact, are: pricing page layout and tier presentation (testing persona-recommended badges vs. neutral feature lists), hero section messaging (testing use-case-specific headlines vs. platform-feature headlines for different traffic sources), free tier onboarding flow (testing guided tutorial vs. self-directed exploration), CTA button copy (testing 'Start Free Analysis' vs. 'Try GDA Free' vs. 'Analyze Your Data Now'), and enterprise demo request form length (testing short form with sales follow-up vs. detailed qualification form). Each test should be segmented by traffic source to detect persona-specific responses, as a headline that resonates with the Student Explorer may underperform with the Enterprise Decision-Maker and vice versa."));

  return content;
}

// ═══════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ═══════════════════════════════════════════════════════════
const pgSize = { width: 11906, height: 16838, orientation: "portrait" };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  styles: {
    default: { document: {
      run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: "000000" },
      paragraph: { spacing: { line: 312 } },
    }},
    heading1: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: "0B1C2C" },
      paragraph: { spacing: { before: 360, after: 160, line: 312 } } },
    heading2: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: "0B1C2C" },
      paragraph: { spacing: { before: 280, after: 120, line: 312 } } },
    heading3: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: "0B1C2C" },
      paragraph: { spacing: { before: 200, after: 100, line: 312 } } },
  },
  sections: [
    // Section 1: Cover (no page numbers, no footer)
    { properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCover() },

    // Section 2: TOC (Roman numerals)
    { properties: { type: SectionType.NEXT_PAGE, page: { size: pgSize, margin: pgMargin,
        pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
      footers: { default: romanFooter() },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "THE ONE WAY GDA  |  Buyer Persona Study", size: 18, color: "808080", font: { ascii: "Calibri" } })] })] }) },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents / Table des Matieres", bold: true, size: 32, font: { ascii: "Calibri", eastAsia: "SimHei" }, color: "0B1C2C" })] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({ spacing: { before: 200 },
          children: [new TextRun({ text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888" })] }),
        new Paragraph({ children: [new PageBreak()] }),
      ] },

    // Section 3: Body (Arabic numerals starting from 1)
    { properties: { type: SectionType.NEXT_PAGE, page: { size: pgSize, margin: pgMargin,
        pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      footers: { default: arabicFooter() },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "THE ONE WAY GDA  |  Buyer Persona Study", size: 18, color: "808080", font: { ascii: "Calibri" } })] })] }) },
      children: buildBody() },
  ],
});

const OUTPUT = "/home/z/my-project/download/GDA_Buyer_Persona_Study.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Document generated:", OUTPUT);
}).catch(err => { console.error("Error:", err); process.exit(1); });