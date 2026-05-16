import sys, os
sys.path.insert(0, "/home/z/my-project/skills/pdf/scripts")

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, Image, ListFlowable, ListItem,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.graphics import renderPDF

# ─── Color Palette ───
C = {
    'bg': HexColor('#f5f6f6'), 'section_bg': HexColor('#f0f1f2'),
    'card_bg': HexColor('#e9ecee'), 'table_stripe': HexColor('#edeeef'),
    'header_fill': HexColor('#35464e'), 'cover_block': HexColor('#5c7581'),
    'border': HexColor('#c1ccd2'), 'icon': HexColor('#487891'),
    'accent': HexColor('#bc5533'), 'accent2': HexColor('#57ca39'),
    'text': HexColor('#1b1d1e'), 'muted': HexColor('#72787b'),
    'success': HexColor('#427754'), 'warning': HexColor('#907848'),
    'error': HexColor('#b55148'), 'info': HexColor('#456a90'),
    'white': HexColor('#ffffff'), 'cover_dark': HexColor('#1b2a30'),
}

# ─── Font Setup ───
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
addMapping('DejaVuSans', 0, 0, 'DejaVuSans')
addMapping('DejaVuSans', 1, 0, 'DejaVuSans-Bold')

FONT = 'DejaVuSans'
FONT_B = 'DejaVuSans-Bold'
FONT_I = 'DejaVuSans'

# ─── Styles ───
styles = getSampleStyleSheet()

s_title = ParagraphStyle('DocTitle', fontName=FONT_B, fontSize=28, leading=34, textColor=C['cover_dark'], alignment=TA_LEFT, spaceAfter=12)
s_h1 = ParagraphStyle('H1', fontName=FONT_B, fontSize=20, leading=26, textColor=C['cover_dark'], spaceBefore=24, spaceAfter=10)
s_h2 = ParagraphStyle('H2', fontName=FONT_B, fontSize=15, leading=20, textColor=C['header_fill'], spaceBefore=18, spaceAfter=8)
s_h3 = ParagraphStyle('H3', fontName=FONT_B, fontSize=12, leading=16, textColor=C['icon'], spaceBefore=12, spaceAfter=6)
s_body = ParagraphStyle('Body', fontName=FONT, fontSize=10, leading=15, textColor=C['text'], alignment=TA_JUSTIFY, spaceAfter=8)
s_body_indent = ParagraphStyle('BodyIndent', parent=s_body, leftIndent=18)
s_bullet = ParagraphStyle('Bullet', fontName=FONT, fontSize=10, leading=15, textColor=C['text'], leftIndent=24, bulletIndent=12, spaceAfter=4, alignment=TA_LEFT)
s_table_header = ParagraphStyle('TableHeader', fontName=FONT_B, fontSize=9, leading=12, textColor=C['white'], alignment=TA_CENTER)
s_table_cell = ParagraphStyle('TableCell', fontName=FONT, fontSize=9, leading=13, textColor=C['text'], alignment=TA_LEFT)
s_table_cell_c = ParagraphStyle('TableCellC', fontName=FONT, fontSize=9, leading=13, textColor=C['text'], alignment=TA_CENTER)
s_caption = ParagraphStyle('Caption', fontName=FONT_I, fontSize=8.5, leading=12, textColor=C['muted'], alignment=TA_CENTER, spaceBefore=4, spaceAfter=12)
s_code = ParagraphStyle('Code', fontName='DejaVuSans', fontSize=8.5, leading=13, textColor=HexColor('#2d3748'), backColor=HexColor('#f7fafc'), leftIndent=12, rightIndent=12, spaceBefore=6, spaceAfter=6, borderPadding=6)
s_footer = ParagraphStyle('Footer', fontName=FONT, fontSize=8, leading=10, textColor=C['muted'], alignment=TA_CENTER)

PAGE_W, PAGE_H = A4
MARGIN = 22*mm

def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    avail = PAGE_W - 2*MARGIN
    ncols = len(headers)
    if col_widths is None:
        col_widths = [avail / ncols] * ncols
    
    data = [[Paragraph(h, s_table_header) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), s_table_cell) if i == 0 else Paragraph(str(c), s_table_cell_c) for i, c in enumerate(row)])
    
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), C['header_fill']),
        ('TEXTCOLOR', (0, 0), (-1, 0), C['white']),
        ('FONTNAME', (0, 0), (-1, 0), FONT_B),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, C['border']),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), C['table_stripe']))
    t.setStyle(TableStyle(style_cmds))
    return t

def h1(text):
    return Paragraph(text, s_h1)

def h2(text):
    return Paragraph(text, s_h2)

def h3(text):
    return Paragraph(text, s_h3)

def body(text):
    return Paragraph(text, s_body)

def bullet(text):
    return Paragraph(f"\u2022  {text}", s_bullet)

def spacer(h=8):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=C['border'], spaceBefore=8, spaceAfter=8)

# ─── Build Document ───
output_path = "/home/z/my-project/download/The_One_Way_Technical_Analysis.pdf"

doc = SimpleDocTemplate(
    output_path, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title="The One-Way: SPSS Weakness Analysis & Architecture Plan",
    author="The One-Way Team",
    subject="Technical Analysis and Architecture Proposal",
)

story = []

# ═══════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════
story.append(Spacer(1, 60*mm))

# Top accent bar
d = Drawing(PAGE_W - 2*MARGIN, 4)
d.add(Rect(0, 0, PAGE_W - 2*MARGIN, 4, fillColor=C['accent'], strokeColor=None))
story.append(d)
story.append(Spacer(1, 15))

story.append(Paragraph("The One-Way", ParagraphStyle('CoverBrand', fontName=FONT_B, fontSize=42, leading=48, textColor=C['cover_dark'])))
story.append(Spacer(1, 8))
story.append(Paragraph("SPSS Weakness Analysis &<br/>Architecture Proposal", ParagraphStyle('CoverSub', fontName=FONT, fontSize=18, leading=24, textColor=C['header_fill'])))
story.append(Spacer(1, 12))

d2 = Drawing(PAGE_W - 2*MARGIN, 2)
d2.add(Rect(0, 0, 80, 2, fillColor=C['accent'], strokeColor=None))
story.append(d2)
story.append(Spacer(1, 20))

story.append(Paragraph(
    "A comprehensive technical analysis of IBM SPSS limitations and a detailed, "
    "actionable architecture and feature-set proposal for a next-generation "
    "statistical analysis platform targeting academics, students, market researchers, "
    "and SME analysts.", 
    ParagraphStyle('CoverDesc', fontName=FONT, fontSize=11, leading=17, textColor=C['muted'], alignment=TA_LEFT)
))

story.append(Spacer(1, 30))
story.append(Paragraph("Version 1.0  |  April 2026  |  Confidential", ParagraphStyle('CoverMeta', fontName=FONT, fontSize=9, leading=13, textColor=C['border'])))
story.append(Paragraph("Domain: Research & Business Analytics", ParagraphStyle('CoverDomain', fontName=FONT, fontSize=9, leading=13, textColor=C['muted'])))

story.append(Spacer(1, 20))
# Bottom bar
d3 = Drawing(PAGE_W - 2*MARGIN, 1)
d3.add(Rect(0, 0, PAGE_W - 2*MARGIN, 1, fillColor=C['border'], strokeColor=None))
story.append(d3)

story.append(PageBreak())

# ═══════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════
story.append(h1("Table of Contents"))
story.append(spacer(8))

toc_entries = [
    ("1.", "Executive Summary"),
    ("2.", "SPSS Weakness Analysis"),
    ("  2.1", "Data Handling & Performance"),
    ("  2.2", "Data Modeling & Structure"),
    ("  2.3", "Statistics & Modeling"),
    ("  2.4", "User Interface & Workflow"),
    ("  2.5", "Visualization Capabilities"),
    ("  2.6", "Licensing, Cost & Accessibility"),
    ("  2.7", "Integration with Modern Data Science Stacks"),
    ("  2.8", "Automation, Scripting & Reproducibility"),
    ("3.", "How The One-Way Solves Each Weakness"),
    ("  3.1", "Architecture Overview"),
    ("  3.2", "Feature-Weakness Mapping"),
    ("4.", "High-Level Architecture"),
    ("  4.1", "System Architecture"),
    ("  4.2", "Technology Stack"),
    ("  4.3", "Plugin & Extension System"),
    ("5.", "Comparison with Existing Alternatives"),
    ("6.", "Implementation Roadmap"),
    ("7.", "Risk Analysis & Mitigations"),
    ("8.", "Conclusion"),
]

toc_data = []
for num, title in toc_entries:
    is_sub = num.startswith("  ")
    style = ParagraphStyle('TocItem', fontName=FONT_B if not is_sub else FONT, fontSize=10 if not is_sub else 9.5, leading=16 if not is_sub else 15, textColor=C['text'] if not is_sub else C['muted'])
    indent = 24 if is_sub else 0
    toc_data.append([Paragraph(f"{num.strip()}", style), Paragraph(title, ParagraphStyle('TocTitle', fontName=FONT_B if not is_sub else FONT, fontSize=10 if not is_sub else 9.5, leading=16 if not is_sub else 15, textColor=C['text'] if not is_sub else C['muted'], leftIndent=indent))])

toc_table = Table(toc_data, colWidths=[30*mm, PAGE_W - 2*MARGIN - 30*mm])
toc_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ('LINEBELOW', (0, 0), (-1, -1), 0.3, C['table_stripe']),
]))
story.append(toc_table)
story.append(PageBreak())

# ═══════════════════════════════════════
# 1. EXECUTIVE SUMMARY
# ═══════════════════════════════════════
story.append(h1("1. Executive Summary"))

story.append(body(
    "IBM SPSS Statistics has been a dominant tool in social science, market research, and academic "
    "analysis for over five decades. However, the statistical software landscape has shifted dramatically "
    "toward open-source ecosystems (R, Python), cloud-native platforms, and AI-augmented workflows. SPSS, "
    "despite incremental updates, retains architectural decisions and design philosophies from the 1990s "
    "that create significant friction for modern users. This document presents a rigorous analysis of "
    "SPSS's key weaknesses across eight categories and proposes a concrete, high-level architecture for "
    "<b>The One-Way</b>, a next-generation statistical analysis platform designed to address every identified "
    "limitation while preserving the accessibility that has made SPSS popular among non-programmers."
))

story.append(body(
    "The One-Way targets four primary user segments: <b>academics</b> and researchers who need reproducible "
    "analysis pipelines; <b>students</b> who require an intuitive learning environment; <b>market researchers</b> "
    "who demand survey-focused tools with big-data support; and <b>SME analysts</b> who need cost-effective, "
    "professional-grade capabilities without enterprise licensing burdens. The proposed architecture leverages "
    "a browser-based frontend with an optional desktop shell, a Python/R-powered computation backend, "
    "a database-backed data engine with streaming support, and a plugin ecosystem that allows the community "
    "to extend functionality beyond what any single vendor could deliver."
))

story.append(body(
    "This analysis is structured in four parts. First, we catalog the specific limitations of SPSS across "
    "eight dimensions. Second, we map each limitation to concrete features and architectural decisions in "
    "The One-Way. Third, we present a high-level system architecture with a recommended technology stack. "
    "Finally, we compare our approach against existing alternatives and outline a phased implementation "
    "roadmap. The goal is not merely to replicate SPSS with a modern UI, but to fundamentally rethink "
    "what a statistical analysis platform should be in an era of AI, big data, and collaborative science."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 2. SPSS WEAKNESS ANALYSIS
# ═══════════════════════════════════════
story.append(h1("2. SPSS Weakness Analysis"))
story.append(body(
    "The following analysis draws on published literature, community feedback, direct comparison with "
    "modern tools, and architectural examination of SPSS's data model, computation engine, and UI framework. "
    "Each weakness is described concisely with enough technical depth to inform design decisions."
))

# 2.1
story.append(h2("2.1 Data Handling & Performance"))

story.append(body(
    "<b>Row-limited memory model.</b> SPSS loads entire datasets into RAM, which means analyses on "
    "datasets exceeding available memory fail with cryptic errors. There is no built-in chunking, "
    "memory-mapped I/O, or out-of-core processing. While modern machines have substantial RAM, "
    "research datasets in genomics, IoT telemetry, and web analytics routinely exceed 100 GB, far "
    "beyond what SPSS can handle natively. Users must manually subset data or use ODBC connections "
    "with database-side aggregation, losing the interactive, exploratory workflow that SPSS otherwise provides."
))

story.append(body(
    "<b>File format lock-in.</b> The .sav format, while widely supported, is proprietary and binary. "
    "There is no streaming reader for .sav files, making incremental processing impossible. CSV import "
    "is limited to files that fit in memory, with no support for lazy evaluation or columnar formats "
    "such as Parquet or Feather that are standard in modern data engineering. Excel import similarly "
    "loads entire sheets into memory, and large spreadsheets cause performance degradation proportional "
    "to cell count regardless of actual data density."
))

story.append(body(
    "<b>No parallel processing.</b> All statistical procedures run single-threaded. For computationally "
    "intensive operations such as bootstrapping (which requires thousands of resampling iterations), "
    "Monte Carlo simulations, or hierarchical linear models on large panels, this results in "
    "prohibitively long runtimes. Modern alternatives like R (with parallel packages) and Python "
    "(with NumPy/Pandas vectorization and joblib/dask) exploit multi-core CPUs and GPUs effectively."
))

story.append(body(
    "<b>Single-table paradigm.</b> SPSS enforces a flat, single-table data model (the 'Data View'). "
    "There is no native concept of relational joins, multi-table schemas, or normalized data structures. "
    "Users who need to merge data from multiple sources must use the cumbersome MERGE FILES or "
    "MATCH FILES commands, which produce new static datasets rather than live relational views. "
    "This makes longitudinal studies, multi-source surveys, and any analysis requiring relational "
    "algebra unnecessarily manual and error-prone."
))

# 2.2
story.append(h2("2.2 Data Modeling & Structure"))

story.append(body(
    "<b>Limited panel/time-series support.</b> SPSS treats time-series and panel (longitudinal) data "
    "as flat tables with no native temporal indexing. While the VAR, ARIMA, and mixed-models modules "
    "can analyze such data, users must manually restructure data between 'wide' and 'long' formats "
    "using the CASESTOVARS and VARSTOCASES commands. There is no built-in datetime-aware indexing, "
    "no automatic handling of irregular time intervals, and no panel-data-specific data structures. "
    "Modern tools like Python's pandas (with MultiIndex and datetime types) or R's tsibble/xts "
    "provide first-class temporal data models that eliminate this manual restructuring."
))

story.append(body(
    "<b>No hierarchical or nested data structures.</b> SPSS has no native representation for "
    "multi-level data (students within schools within districts, for example). While the MIXED "
    "MODELS procedure can fit hierarchical linear models, the data itself must be flattened first, "
    "and the model specification does not reflect the natural data hierarchy. This disconnect between "
    "data structure and model specification increases cognitive load and error rates, especially "
    "for users unfamiliar with mixed-model syntax."
))

story.append(body(
    "<b>Missing data handling is rigid.</b> SPSS supports multiple imputation (via the Missing Values "
    "optional add-on) but the workflow is modal: users must invoke a separate dialog, configure "
    "imputation parameters, run the procedure, and then manually switch to the imputed dataset "
    "for analysis. There is no inline, declarative missing-data strategy (e.g., 'impute mean for "
    "numeric, mode for categorical, and flag imputed cells') that propagates through all downstream "
    "analyses automatically."
))

# 2.3
story.append(h2("2.3 Statistics & Modeling"))

story.append(body(
    "<b>Finite procedure library.</b> SPSS ships with a fixed set of statistical procedures. Adding "
    "a new method requires purchasing an extension module or writing custom Python/R code via the "
    "PRODUCTION JOB facility, which has poor ergonomics and limited integration with the UI. The "
    "R ecosystem, by contrast, offers over 20,000 packages on CRAN, and Python's scipy/sklearn/statsmodels "
    "cover an enormous range of classical and modern methods. When SPSS users need a method not in "
    "the core or extension modules, they must export data and switch to R or Python, breaking the "
    "analytical workflow."
))

story.append(body(
    "<b>Machine learning is bolted on.</b> SPSS Modeler (a separate product) provides some ML "
    "capabilities, but the integration with SPSS Statistics is minimal. There is no native support "
    "for standard ML workflows: cross-validation pipelines, hyperparameter tuning, model comparison "
    "dashboards, or automated feature engineering within the main SPSS interface. Modern tools "
    "like Python's scikit-learn, R's tidymodels, or even no-code platforms like DataRobot provide "
    "vastly superior ML experiences."
))

story.append(body(
    "<b>Bayesian methods are absent.</b> SPSS has no built-in Bayesian statistical procedures. "
    "Users who need Bayesian inference must use the R extension, which adds friction and limits "
    "interactivity. Given the growing importance of Bayesian methods in psychology, medicine, and "
    "social science (where small samples are common), this is a significant gap."
))

story.append(body(
    "<b>No automated model selection or AI-assisted analysis.</b> SPSS requires the user to know "
    "which statistical test to apply. There is no intelligent system that examines data distributions, "
    "variable types, and research questions to recommend appropriate tests or flag potential issues "
    "(violations of normality, multicollinearity, heteroscedasticity). This places the entire burden "
    "of statistical expertise on the user, which is precisely what an AI-augmented platform should mitigate."
))

# 2.4
story.append(h2("2.4 User Interface & Workflow"))

story.append(body(
    "<b>Dual-mode confusion.</b> SPSS has two interfaces: the GUI (point-and-click dialogs) and the "
    "Syntax Editor. Each dialog generates syntax, but the mapping is opaque to users, creating a "
    "'two-language' problem. GUI users cannot easily transition to scripting because they never see "
    "the syntax in context, while syntax users find the GUI insufficient for complex workflows. "
    "Modern tools like Jupyter Notebooks or R Markdown unify code and output, enabling incremental "
    "learning from GUI to code without a paradigm shift."
))

story.append(body(
    "<b>No reproducibility infrastructure.</b> SPSS produces output in its proprietary SPO (SPSS Output) "
    "format, which is not version-controllable, not diff-able, and not exportable to open standards "
    "in a lossless way. There is no concept of an analysis notebook that captures data, code, and "
    "results in a single reproducible document. This is a critical weakness for academic research, "
    "where reproducibility is increasingly required by journals and funding agencies."
))

story.append(body(
    "<b>Steep learning curve for non-statisticians.</b> Despite the GUI, SPSS requires users to "
    "understand statistical terminology, navigate deeply nested menus, and interpret dense output "
    "tables without contextual guidance. The 'Variable View' and 'Data View' paradigm, while functional, "
    "does not guide users toward correct analysis decisions. There are no inline tooltips that explain "
    "assumptions, no automatic diagnostic checks, and no plain-language interpretation of results."
))

# 2.5
story.append(h2("2.5 Visualization Capabilities"))

story.append(body(
    "<b>Static, chart-builder-only approach.</b> SPSS's Chart Builder produces static images (PNG, "
    "EMF, SVG) with limited interactivity. There are no interactive tooltips, drill-downs, linked "
    "brushing, or real-time filtering. While the output can be exported, the exported charts are "
    "rasterized and lose quality. Modern visualization libraries (Plotly, D3.js, ECharts, ggplot2) "
    "produce interactive, web-native visualizations that support exploration, not just presentation."
))

story.append(body(
    "<b>Limited customization.</b> The Chart Builder provides a template-based approach with limited "
    "access to low-level properties. Users cannot easily create custom geoms, composite plots, "
    "small multiples (faceting), or non-standard chart types. Advanced users must export data and "
    "create visualizations in R or Python, again breaking the workflow."
))

story.append(body(
    "<b>No dashboard or reporting system.</b> SPSS has no built-in dashboard builder. Users cannot "
    "create multi-panel displays that combine tables, charts, and text into a cohesive report. "
    "Custom Tables (CTABLES) provides some flexibility but is limited to tabular output and is "
    "notoriously difficult to learn. Modern platforms (Tableau, Power BI, even Jupyter dashboards) "
    "make dashboard creation a core feature."
))

# 2.6
story.append(h2("2.6 Licensing, Cost & Accessibility"))

story.append(body(
    "<b>High cost of ownership.</b> SPSS Statistics starts at approximately $99/user/month for the "
    "base module, with additional modules (Custom Tables, Regression, Advanced Statistics, etc.) "
    "costing $50-100 each per month. A fully-featured installation can cost $300-500/user/month, "
    "with annual commitments. For universities, the campus-wide license (SPSS Campus Edition) is "
    "negotiated separately and typically costs tens of thousands of dollars annually. This pricing "
    "excludes students, researchers in developing countries, and small organizations."
))

story.append(body(
    "<b>Platform lock-in.</b> SPSS is available on Windows, macOS, and Linux, but the user "
    "experience and feature parity varies. There is no web-based version, making it inaccessible "
    "on tablets, Chromebooks, or shared lab computers without local installation. The move toward "
    "browser-based tools (Jamovi, JASP, Google Sheets with add-ons) is a direct response to this "
    "limitation."
))

story.append(body(
    "<b>No free tier for education.</b> While IBM offers academic discounts, there is no genuinely "
    "free version of SPSS with full functionality. This drives students and researchers toward "
    "free alternatives (R, PSPP, Jamovi), creating a pipeline problem for SPSS adoption in the "
    "workforce. Competitors like Jamovi and JASP are fully open-source and free, directly addressing "
    "this weakness."
))

# 2.7
story.append(h2("2.7 Integration with Modern Data Science Stacks"))

story.append(body(
    "<b>Poor Python/R integration.</b> While SPSS can call Python and R scripts via the PRODUCTION "
    "JOB or PROGRAM commands, the integration is shallow. Data must be passed between SPSS and the "
    "external language via the SPSS Data Access API, which adds overhead and complexity. There is no "
    "native Jupyter kernel for SPSS, no pip-installable SPSS library, and no seamless interop with "
    "pandas DataFrames or R data.frames. The R and Python extensions feel like afterthoughts rather "
    "than first-class citizens."
))

story.append(body(
    "<b>No database connectivity.</b> SPSS can connect to databases via ODBC, but the experience is "
    "cumbersome and does not support modern database features (parameterized queries, connection "
    "pooling, read replicas, or cloud data warehouses like BigQuery, Snowflake, or Redshift). "
    "Users who work with enterprise data typically extract to CSV first, losing the ability to work "
    "with live data."
))

story.append(body(
    "<b>No API or programmatic access.</b> SPSS cannot be embedded in other applications or controlled "
    "via an API. There is no REST API, no GraphQL endpoint, and no SDK. This makes it impossible to "
    "integrate SPSS into automated pipelines, web applications, or cloud workflows. Modern tools "
    "(R servers, Python APIs, cloud ML platforms) all provide programmatic access as a core feature."
))

# 2.8
story.append(h2("2.8 Automation, Scripting & Reproducible Workflows"))

story.append(body(
    "<b>SYNTAX language is archaic.</b> SPSS Syntax (originally designed in the 1960s) is a proprietary, "
    "line-based command language with limited expressiveness. It lacks modern programming constructs "
    "(functions, closures, classes, modules), has poor error messages, and offers no IDE support "
    "(no autocompletion, no linting, no debugging). While the Python and R extensions provide "
    "modern languages, the SPSS-specific API within those languages is clunky and poorly documented."
))

story.append(body(
    "<b>No version control for analyses.</b> There is no way to track changes to an analysis "
    "workflow over time. Users cannot diff two versions of an SPSS output file, cannot revert to a "
    "previous analysis state, and cannot collaborate on analyses via Git or similar tools. This makes "
    "team-based research difficult and error-prone."
))

story.append(body(
    "<b>No scheduled or batch execution.</b> SPSS Production Jobs provide limited batch execution, "
    "but there is no built-in scheduler (cron-like), no webhook triggers, and no CI/CD integration. "
    "Users who need to run analyses on a schedule must use external tools, which defeats the purpose "
    "of an all-in-one platform."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 3. HOW THE ONE-WAY SOLVES EACH WEAKNESS
# ═══════════════════════════════════════
story.append(h1("3. How The One-Way Solves Each Weakness"))
story.append(body(
    "This section maps each SPSS weakness identified above to concrete architectural decisions, "
    "core features, and UX designs in The One-Way. The approach is not incremental improvement but "
    "fundamental re-architecture of the statistical analysis workflow."
))

# 3.1
story.append(h2("3.1 Architecture Overview"))
story.append(body(
    "The One-Way is designed as a three-tier application with a plugin ecosystem. The key architectural "
    "principles are: (1) database-backed data management with streaming support, (2) AI-augmented "
    "analysis workflows with natural-language interaction, (3) open plugin architecture allowing "
    "community extensions in Python or R, (4) notebook-style reproducibility, and (5) zero-configuration "
    "offline capability with progressive synchronization. These principles directly address the eight "
    "weakness categories identified in the previous section."
))

# 3.2 Feature-Weakness Mapping
story.append(h2("3.2 Feature-Weakness Mapping"))

avail = PAGE_W - 2*MARGIN
story.append(make_table(
    ["SPSS Weakness", "The One-Way Solution", "Architecture Layer"],
    [
        ["Row-limited memory model", "Database-backed engine with lazy loading, chunked processing, and streaming aggregation", "Data Engine"],
        ["File format lock-in", "Native support for CSV, Parquet, Feather, Excel, JSON, SQL, and .sav with auto-detection", "Data Engine"],
        ["No parallel processing", "Multi-core CPU utilization, optional GPU acceleration for ML workloads", "Computation Engine"],
        ["Single-table paradigm", "Relational data model with join support, multi-table schemas, and live SQL views", "Data Engine"],
        ["Limited panel/time-series", "Temporal indexing, automatic wide/long restructuring, datetime-aware data types", "Data Engine"],
        ["No hierarchical structures", "Native multi-level data representation with automatic model specification", "Data Engine"],
        ["Rigid missing data handling", "Declarative missing-data strategies that propagate through all analyses automatically", "Analysis Engine"],
        ["Finite procedure library", "Plugin ecosystem with Python/R/Julia extensions; curated core + community registry", "Plugin System"],
        ["ML bolted on", "Integrated AutoML, cross-validation pipelines, hyperparameter tuning UI, model dashboards", "Analysis Engine"],
        ["No Bayesian methods", "Built-in Bayesian procedures (MCMC, variational inference) with Stan/PyMC integration", "Analysis Engine"],
        ["No AI-assisted analysis", "Natural-language query interface, automated test selection, assumption checking", "AI Layer"],
        ["Dual-mode confusion", "Unified notebook interface: code, output, and narrative in one document", "UI/UX Layer"],
        ["No reproducibility", "Native notebook format with version control, export to HTML/PDF, Git integration", "UI/UX Layer"],
        ["Steep learning curve", "AI-guided workflows, inline tooltips, plain-language result interpretation", "UI/UX + AI Layer"],
        ["Static visualizations", "Interactive charts (zoom, filter, drill-down) using ECharts/Plotly engine", "Visualization Layer"],
        ["No dashboard/report system", "Drag-and-drop dashboard builder with live data, auto-refresh scheduling", "UI/UX Layer"],
        ["High cost", "Free tier + affordable Pro/Enterprise plans; no per-module add-on pricing", "Business"],
        ["Platform lock-in", "Web-based (works in any browser), optional desktop shell, offline PWA", "Deployment"],
        ["Poor Python/R integration", "First-class Python/R kernel with auto-completion, variable sharing, live objects", "Plugin System"],
        ["No database connectivity", "Native connectors for PostgreSQL, MySQL, BigQuery, Snowflake, Redshift, SQLite", "Data Engine"],
        ["No API access", "REST API + Python SDK + CLI for programmatic control and CI/CD integration", "Platform"],
        ["Archaic syntax", "Python-native scripting with SPSS-compatible legacy syntax parser for migration", "Analysis Engine"],
        ["No version control", "Built-in analysis versioning, diff viewer, collaborative editing via CRDT", "Collaboration"],
        ["No scheduled execution", "Built-in scheduler with cron expressions, webhook triggers, email/Slack alerts", "Automation"],
        ["No multi-language support", "Full i18n with 8+ languages including RTL (Arabic), AI-translated interface", "Platform"],
        ["No offline mode", "Service Worker + IndexedDB for full offline capability; sync when online", "Deployment"],
    ],
    col_widths=[avail*0.28, avail*0.52, avail*0.20]
))
story.append(Paragraph("<b>Table 1.</b> Complete weakness-to-solution mapping for The One-Way.", s_caption))

story.append(PageBreak())

# ═══════════════════════════════════════
# 4. HIGH-LEVEL ARCHITECTURE
# ═══════════════════════════════════════
story.append(h1("4. High-Level Architecture"))

story.append(h2("4.1 System Architecture"))

story.append(body(
    "The One-Way follows a modular, layered architecture designed for extensibility, performance, "
    "and deployment flexibility. The system is composed of five primary layers, each with clear "
    "boundaries and well-defined interfaces. Communication between layers uses a message-passing "
    "pattern with type-safe contracts, enabling independent scaling and replacement of components."
))

story.append(h3("Layer 1: Presentation Layer (Frontend)"))
story.append(body(
    "The frontend is a Progressive Web Application (PWA) built with React (or Next.js) and TypeScript. "
    "It provides three primary interfaces: (a) the <b>Workspace</b>, which mimics the familiar SPSS "
    "Data View / Variable View paradigm but enhanced with live search, column grouping, and inline "
    "visualizations; (b) the <b>Notebook</b>, a Jupyter-like cell-based interface where users can mix "
    "natural-language queries, code cells, markdown narrative, and rich output (tables, charts, "
    "interactive widgets) in a single reproducible document; and (c) the <b>Dashboard</b>, a "
    "drag-and-drop report builder for creating multi-panel displays. The UI is fully internationalized "
    "with RTL support for Arabic, and ships in eight languages by default. The entire frontend "
    "is offline-capable via Service Workers and IndexedDB, allowing users to work without internet "
    "and synchronize when connectivity is restored."
))

story.append(h3("Layer 2: Application Server (Backend)"))
story.append(body(
    "The backend is a Python (FastAPI) or Node.js server that exposes a REST API and WebSocket "
    "endpoints. It handles: (a) <b>session management</b> (user authentication, project isolation, "
    "sharing permissions); (b) <b>analysis orchestration</b> (receiving analysis requests from the "
    "frontend, routing them to the appropriate computation engine, streaming results back via WebSocket); "
    "(c) <b>AI query processing</b> (translating natural-language questions into analysis commands, "
    "providing plain-language interpretations of results); (d) <b>plugin execution sandbox</b> "
    "(running user-installed Python/R plugins in isolated Docker containers or WASM sandboxes); and "
    "(e) <b>file management</b> (upload, download, export in multiple formats). The backend is "
    "stateless and horizontally scalable, with session state stored in Redis or PostgreSQL."
))

story.append(h3("Layer 3: Computation Engine"))
story.append(body(
    "The computation layer is the analytical heart of the platform. It consists of three sub-systems: "
    "(a) the <b>Statistical Engine</b>, a Python library wrapping scipy, statsmodels, scikit-learn, "
    "and PyMC for Bayesian methods. This engine provides all classical procedures (descriptive statistics, "
    "frequencies, crosstabs, t-tests, ANOVA, regression, factor analysis, SEM, etc.) plus modern "
    "ML methods (random forests, gradient boosting, neural networks, NLP). (b) The <b>Data Engine</b>, "
    "built on Apache Arrow (for in-memory columnar processing) and DuckDB (for embedded SQL analytics), "
    "handles all data operations: import, join, filter, aggregate, pivot, reshape. Arrow's zero-copy "
    "memory model eliminates serialization overhead between data operations and statistical procedures. "
    "(c) The <b>Visualization Engine</b>, using Apache ECharts or Plotly, renders interactive charts "
    "with server-side rendering (SSR) for export. All three sub-systems can execute in parallel, "
    "utilizing all available CPU cores, with optional GPU offloading for ML training workloads."
))

story.append(h3("Layer 4: Data Storage Layer"))
story.append(body(
    "Data persistence uses a hybrid approach: (a) <b>Project metadata</b> (names, descriptions, "
    "sharing permissions, version history) is stored in PostgreSQL; (b) <b>analysis datasets</b> "
    "are stored in Parquet format on disk or cloud storage (S3, GCS, Azure Blob), enabling efficient "
    "columnar reads and schema evolution; (c) <b>output artifacts</b> (tables, charts, notebooks) "
    "are stored as JSON + SVG blobs; (d) <b>offline cache</b> uses IndexedDB on the client side "
    "for full offline access to recent projects. The storage layer supports multiple backends via "
    "a pluggable storage adapter, allowing deployment on-premise (local filesystem + SQLite), "
    "in the cloud (S3 + PostgreSQL), or in hybrid configurations."
))

story.append(h3("Layer 5: Plugin & Extension System"))
story.append(body(
    "The plugin system allows the community to extend The One-Way in three ways: (a) <b>Custom "
    "Procedures</b>, written in Python, that appear as native menu items in the UI and can be "
    "shared via a plugin registry (similar to CRAN or PyPI); (b) <b>Data Connectors</b>, also in "
    "Python, that add support for new data sources (SAP, Salesforce, Google Analytics, etc.); "
    "(c) <b>Visualization Templates</b>, using a JSON schema, that define reusable chart layouts "
    "and themes. Plugins execute in isolated WASM sandboxes or Docker containers with defined "
    "resource limits (CPU, memory, network access), ensuring security and stability. A curated "
    "plugin marketplace allows users to install, rate, and update extensions with one click."
))

story.append(spacer(8))

# Architecture diagram as text
story.append(h2("4.2 Technology Stack"))

avail = PAGE_W - 2*MARGIN
story.append(make_table(
    ["Layer", "Technology", "Rationale"],
    [
        ["Frontend", "Next.js 16 + TypeScript, Tailwind CSS, shadcn/ui", "Modern, fast, SSR-capable PWA with excellent DX"],
        ["State Management", "Zustand (client), TanStack Query (server)", "Lightweight, type-safe, excellent offline support"],
        ["Backend API", "Python + FastAPI (primary), Node.js fallback", "FastAPI: native scipy/sklearn access; async, typed"],
        ["Computation", "scipy, statsmodels, scikit-learn, PyMC, LightGBM", "Comprehensive, well-documented, community-maintained"],
        ["Data Engine", "Apache Arrow (in-memory), DuckDB (embedded SQL)", "Zero-copy columnar processing, SQL on any data size"],
        ["Visualization", "Apache ECharts (interactive), Plotly (scientific)", "ECharts: high-performance; Plotly: statistical plots"],
        ["Storage", "PostgreSQL (metadata), Parquet (datasets), Redis (cache)", "Reliable, standard, cloud-compatible"],
        ["Offline", "Service Workers + IndexedDB + lz4 compression", "Full offline workspace with automatic sync"],
        ["AI Layer", "z-ai-web-dev-sdk (LLM), local ONNX models (offline)", "Online: cloud LLM; Offline: local distilled models"],
        ["Collaboration", "WebSocket (real-time), CRDT (conflict resolution)", "Operational transformation for concurrent editing"],
        ["i18n", "next-intl + ICU message format, RTL layout engine", "8+ languages, full bidirectional text support"],
        ["Desktop Shell", "Tauri (Rust-based, lightweight)", "Optional native wrapper for offline-first desktop experience"],
        ["Plugin Runtime", "WebAssembly (WASI) + Docker containers", "Secure, sandboxed extension execution"],
        ["Deployment", "Docker + Kubernetes, Vercel (frontend CDN)", "Cloud-native, auto-scaling, multi-region"],
    ],
    col_widths=[avail*0.18, avail*0.40, avail*0.42]
))
story.append(Paragraph("<b>Table 2.</b> Recommended technology stack for The One-Way.", s_caption))

story.append(h2("4.3 Plugin & Extension System"))

story.append(body(
    "The plugin system is designed around three core principles: <b>safety</b> (plugins run in sandboxes "
    "with defined resource limits and no access to user data unless explicitly granted), "
    "<b>discoverability</b> (a built-in marketplace with search, ratings, and automated compatibility "
    "checking), and <b>simplicity</b> (plugins are standard Python packages with a declarative manifest "
    "file, requiring no special knowledge of The One-Way internals). The manifest format is:"
))

story.append(Paragraph(
    "name: my-custom-test<br/>"
    "version: 1.0.0<br/>"
    "description: Performs a custom nonparametric test<br/>"
    "author: researcher@university.edu<br/>"
    "entry: analyze.py<br/>"
    "inputs: [dataframe, alpha]<br/>"
    "outputs: [statistic, p_value, effect_size]<br/>"
    "requires: scipy >= 1.10",
    s_code
))

story.append(body(
    "This declarative format allows the platform to automatically generate UI elements (parameter forms), "
    "validate inputs, route outputs to appropriate visualizations, and check compatibility with the "
    "user's installed version. Plugins can be installed from the marketplace with one click or "
    "loaded from a local .zip file for air-gapped environments."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 5. COMPARISON WITH EXISTING ALTERNATIVES
# ═══════════════════════════════════════
story.append(h1("5. Comparison with Existing Alternatives"))
story.append(body(
    "The One-Way is positioned in a market with several established alternatives. Understanding their "
    "strengths and weaknesses is essential for differentiation. The table below summarizes the "
    "competitive landscape."
))

story.append(make_table(
    ["Feature", "SPSS", "R + RStudio", "Python + Jupyter", "Jamovi", "JASP", "The One-Way"],
    [
        ["GUI for non-coders", "Yes", "Limited", "No", "Yes", "Yes", "Yes (AI-augmented)"],
        ["Programming support", "Basic (Syntax)", "Excellent", "Excellent", "No", "No", "Python/R native"],
        ["Offline mode", "Yes (desktop)", "Yes (desktop)", "Yes (local)", "Yes (desktop)", "Yes (desktop)", "Yes (PWA + desktop)"],
        ["AI-assisted analysis", "No", "Limited", "Manual", "No", "No", "Yes (NLP + LLM)"],
        ["Big data support", "Poor", "Good (dask)", "Good (dask)", "No", "No", "Good (Arrow + DuckDB)"],
        ["Interactive visualizations", "No", "Good (plotly)", "Good (plotly)", "Basic", "Basic", "Yes (ECharts)"],
        ["Reproducible notebooks", "No", "R Markdown", "Jupyter", "No", "No", "Yes (native)"],
        ["Plugin/extension system", "Modules (paid)", "20K+ packages", "pip ecosystem", "Modules (R)", "Modules (R)", "WASM + Docker"],
        ["Multi-language UI", "No", "No", "No", "Yes", "Yes", "Yes (8+ incl. RTL)"],
        ["Real-time collaboration", "No", "Limited", "Limited", "No", "No", "Yes (CRDT)"],
        ["Free tier", "No", "Yes", "Yes", "Yes", "Yes", "Yes"],
        ["REST API", "No", "Plumber", "FastAPI", "No", "No", "Yes (built-in)"],
        ["Cloud-native deployment", "No", "shinyapps.io", "Various", "Cloud", "No", "Yes (Docker + K8s)"],
        ["Bayesian methods", "No (R ext.)", "Yes (Stan, brms)", "Yes (PyMC)", "Yes", "Yes", "Yes (PyMC)"],
        ["Mobile/tablet access", "No", "No", "No", "Web (limited)", "Web (limited)", "Yes (PWA)"],
    ],
    col_widths=[avail*0.16, avail*0.11, avail*0.14, avail*0.14, avail*0.10, avail*0.10, avail*0.25]
))
story.append(Paragraph("<b>Table 3.</b> Competitive comparison of statistical analysis platforms.", s_caption))

story.append(body(
    "<b>Key differentiators of The One-Way:</b> (1) It is the only platform that combines an SPSS-like "
    "GUI with AI-assisted analysis, native Python/R scripting, and full offline capability. (2) It is "
    "the only platform with built-in multi-language support including RTL for Arabic, addressing a "
    "market gap in the Middle East and North Africa. (3) Its notebook-native architecture combines the "
    "accessibility of SPSS with the reproducibility of Jupyter. (4) Its plugin system uses WASM sandboxing, "
    "making community extensions safer and more portable than R packages or Python modules."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 6. IMPLEMENTATION ROADMAP
# ═══════════════════════════════════════
story.append(h1("6. Implementation Roadmap"))
story.append(body(
    "The implementation is divided into four phases, each delivering a usable product increment. "
    "The phased approach allows early user feedback and iterative refinement."
))

story.append(make_table(
    ["Phase", "Timeline", "Deliverables", "Priority"],
    [
        ["Phase 1: MVP", "Months 1-4", "Web workspace (Data View, Variable View, Output), CSV/Excel import, descriptive statistics, frequencies, crosstabs, basic charts, AI chat (cloud LLM), i18n (EN, AR, FR, ES, DE, ZH, JA, RU), project save/load, offline PWA shell", "Critical"],
        ["Phase 2: Core Stats", "Months 4-8", "Correlation, regression (linear, logistic), t-test, ANOVA, chi-square, nonparametric tests, PDF/HTML export, syntax editor, AI-assisted test recommendation, collaboration (share via link)", "High"],
        ["Phase 3: Advanced", "Months 8-14", "Plugin system (Python), dashboard builder, database connectors (PostgreSQL, BigQuery), time-series/panel data, Bayesian methods, AutoML module, version history, real-time collaboration (CRDT)", "Medium"],
        ["Phase 4: Enterprise", "Months 14-20", "REST API + SDK, Docker/K8s deployment, on-premise option, LDAP/SSO integration, audit logging, admin dashboard, SLA guarantee, plugin marketplace, desktop shell (Tauri)", "Strategic"],
    ],
    col_widths=[avail*0.14, avail*0.13, avail*0.60, avail*0.13]
))
story.append(Paragraph("<b>Table 4.</b> Phased implementation roadmap.", s_caption))

story.append(body(
    "The MVP (Phase 1) is deliberately scoped to deliver a complete, usable product that already "
    "addresses six of the eight SPSS weakness categories. The remaining phases add depth and "
    "enterprise features. Each phase concludes with a public beta release and user feedback cycle."
))

story.append(PageBreak())

# ═══════════════════════════════════════
# 7. RISK ANALYSIS
# ═══════════════════════════════════════
story.append(h1("7. Risk Analysis & Mitigations"))

story.append(body(
    "Every ambitious platform project faces risks. The following table identifies the most significant "
    "risks and proposes concrete mitigations."
))

story.append(make_table(
    ["Risk", "Severity", "Probability", "Mitigation"],
    [
        ["Users resist migration from SPSS", "High", "High", "Provide SPSS .sav import + syntax compatibility layer; offer migration wizard; target new users (students, SMEs) first"],
        ["Offline AI model quality insufficient", "Medium", "Medium", "Use distilled models (Phi-3, Gemma) for offline; fall back to cloud LLM when online; allow users to choose model"],
        ["Performance on large datasets", "High", "Medium", "Arrow + DuckDB already proven at scale; implement progressive loading; set clear size limits with user warnings"],
        ["Plugin security vulnerabilities", "High", "Low", "WASM sandbox with capability-based security; Docker containers with resource limits; code review for marketplace plugins"],
        ["Multi-language translation quality", "Medium", "Medium", "Use professional translators (not AI) for v1; community translation contributions; allow user overrides"],
        ["Competitive response from IBM", "Medium", "Medium", "Focus on open-source community and innovation speed; IBM's enterprise sales cycle is slow; target underserved segments"],
    ],
    col_widths=[avail*0.22, avail*0.10, avail*0.12, avail*0.56]
))
story.append(Paragraph("<b>Table 5.</b> Risk matrix with severity, probability, and mitigation strategies.", s_caption))

story.append(PageBreak())

# ═══════════════════════════════════════
# 8. CONCLUSION
# ═══════════════════════════════════════
story.append(h1("8. Conclusion"))
story.append(body(
    "IBM SPSS retains significant market share in academia and market research due to its established "
    "user base and institutional momentum. However, its fundamental architectural limitations, "
    "prohibitive cost, and lack of modern features create a clear opportunity for a next-generation "
    "platform. The One-Way is designed to exploit this opportunity by combining the accessibility "
    "of SPSS's GUI paradigm with the power, flexibility, and reproducibility of modern data science "
    "tools, all wrapped in an AI-augmented, multilingual, offline-capable package."
))

story.append(body(
    "The proposed architecture addresses every identified weakness of SPSS, from data handling "
    "and statistical modeling to visualization, collaboration, and reproducibility. The technology "
    "stack (Next.js, FastAPI, Arrow, DuckDB, ECharts, PyMC) is proven, open-source, and "
    "community-supported, minimizing vendor lock-in and maximizing extensibility. The plugin "
    "system ensures that the platform can evolve rapidly, with the community contributing new methods "
    "and data connectors faster than any single vendor could develop them internally."
))

story.append(body(
    "The phased implementation roadmap delivers a usable MVP within four months, with each subsequent "
    "phase adding depth and enterprise readiness. The risk analysis identifies manageable threats "
    "with concrete mitigations. In summary, The One-Way is positioned to become the definitive "
    "successor to SPSS for researchers, students, and analysts who demand modern, AI-powered, "
    "accessible statistical analysis without the limitations, cost, and complexity of legacy tools."
))

# ─── Build PDF ───
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 8)
    canvas.setFillColor(C['muted'])
    canvas.drawRightString(PAGE_W - MARGIN, 12*mm, f"Page {doc.page}")
    canvas.drawString(MARGIN, 12*mm, "The One-Way | Technical Analysis | Confidential")
    canvas.restoreState()

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

print(f"PDF generated: {output_path}")
print(f"Size: {os.path.getsize(output_path) / 1024:.1f} KB")
