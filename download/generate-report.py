from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
import os

pdfmetrics.registerFont(TTFont('LibSans', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibSansB', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LibSerif', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibSerifB', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
registerFontFamily('LibSans', normal='LibSans', bold='LibSansB')
registerFontFamily('LibSerif', normal='LibSerif', bold='LibSerifB')

ACCENT = colors.HexColor('#532bcb')
TP = colors.HexColor('#202223')
TM = colors.HexColor('#757c81')
BS = colors.HexColor('#d6dbdf')

out = "/home/z/my-project/download/THEONEWAYGDA_Improvement_Report.pdf"
doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=1.2*inch, rightMargin=1.2*inch, topMargin=1*inch, bottomMargin=1*inch)

ts = ParagraphStyle('TS', fontName='LibSansB', fontSize=22, leading=28, textColor=TP)
sub = ParagraphStyle('Sub', fontName='LibSans', fontSize=11, leading=16, textColor=TM, spaceAfter=20)
h1 = ParagraphStyle('H1', fontName='LibSansB', fontSize=14, leading=19, textColor=ACCENT, spaceBefore=16, spaceAfter=6)
body = ParagraphStyle('Body', fontName='LibSerif', fontSize=10.5, leading=17, textColor=TP, spaceAfter=6)
hs = ParagraphStyle('HS', fontName='LibSansB', fontSize=10, textColor=colors.white, alignment=TA_CENTER)
cs = ParagraphStyle('CS', fontName='LibSans', fontSize=9.5, textColor=TP, alignment=TA_CENTER)
cl = ParagraphStyle('CL', fontName='LibSerif', fontSize=9.5, textColor=TP, alignment=TA_LEFT)
cap = ParagraphStyle('Cap', fontName='LibSans', fontSize=9, textColor=TM, alignment=TA_CENTER, spaceBefore=3, spaceAfter=12)

story = []
story.append(Paragraph('THEONEWAYGDA Platform', ts))
story.append(Paragraph('Improvement Report', ParagraphStyle('T2', fontName='LibSansB', fontSize=15, leading=20, textColor=ACCENT, spaceAfter=6)))
story.append(Paragraph('Date: June 6, 2026  |  Version: Post-audit fixes', sub))

story.append(Paragraph('1. Executive Summary', h1))
story.append(Paragraph(
    'This report documents the security improvements, bug fixes, and feature verifications performed on the THEONEWAYGDA platform. '
    'After a comprehensive audit of the codebase (57 Prisma models, 113+ API routes, Stripe payment integration), '
    'several critical issues were identified and resolved. The platform already had robust login/registration, '
    'account isolation, and subscription notification systems in place. The work focused on fixing underlying bugs '
    'that weakened these existing systems.', body))

story.append(Paragraph('2. Existing Features Verified (Already Working)', h1))
story.append(Paragraph('The following features were found already fully implemented and verified operational:', body))

aw = 460
cw = [aw*0.22, aw*0.78]
rows = [
    [Paragraph('<b>Feature</b>', hs), Paragraph('<b>Details</b>', hs)],
    [Paragraph('Login System', cs), Paragraph('Full login at /auth/login with email/password, session tokens (30-day expiry), activity logging. Handles pending (202), rejected (403), approved (200) states.', cl)],
    [Paragraph('Registration', cs), Paragraph('Registration at /auth/register creates users with role="pending", sends admin notification email, creates Visitor record. Password hashed with SHA-256 + random salt.', cl)],
    [Paragraph('Navbar Login Icon', cs), Paragraph('Navbar shows "Sign In" + "Register" buttons (LogIn/UserPlus icons) when logged out; "Dashboard" + avatar when logged in. Responsive mobile menu included.', cl)],
    [Paragraph('Account Isolation', cs), Paragraph('All core API routes (/api/billing, /api/auth/[id], /api/auth/activity, /api/checkout, /api/stripe/portal) verify session token and scope queries to session.userId.', cl)],
    [Paragraph('Notification Email', cs), Paragraph('Stripe webhook sets status="pending_approval", sends email to msad41855@gmail.com via sendAdminSubscriptionNotificationEmail().', cl)],
    [Paragraph('Admin Approval', cs), Paragraph('/api/admin/subscriptions/[id]/approve activates subscription, upgrades user role, sends approval email. /reject cancels Stripe subscription.', cl)],
]
t = Table(rows, colWidths=cw, hAlign='CENTER')
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), ACCENT), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    *[('BACKGROUND', (0,i), (-1,i), colors.white if i%2==1 else BS) for i in range(1,7)],
    ('GRID', (0,0), (-1,-1), 0.5, TM), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(Spacer(1,10))
story.append(t)
story.append(Paragraph('Table 1: Features verified as already implemented', cap))

story.append(Paragraph('3. Bugs Found and Fixed', h1))
cw2 = [aw*0.26, aw*0.12, aw*0.62]
rows2 = [
    [Paragraph('<b>Bug</b>', hs), Paragraph('<b>Severity</b>', hs), Paragraph('<b>Fix Applied</b>', hs)],
    [Paragraph('Admin subscriptions page field mismatch', cl), Paragraph('High', cs), Paragraph('Changed data.subscriptions to data.pending to match API response format', cl)],
    [Paragraph('/api/auth/stats projectCount leaks data', cl), Paragraph('High', cs), Paragraph('Scoped projectCount (model has no userId). Scoped workflow/automation to user email', cl)],
    [Paragraph('PATCH /api/auth/[id] missing expiry', cl), Paragraph('Medium', cs), Paragraph('Added session.expiresAt validation before authorization check', cl)],
    [Paragraph('PATCH /api/billing free upgrade exploit', cl), Paragraph('High', cs), Paragraph('Restricted PATCH to plan="free" only. Paid upgrades require Stripe checkout', cl)],
    [Paragraph('Approve only handles pro plan', cl), Paragraph('Medium', cs), Paragraph('Updated to set role based on plan: pro=pro, enterprise=admin', cl)],
]
t2 = Table(rows2, colWidths=cw2, hAlign='CENTER')
t2.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), ACCENT), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    *[('BACKGROUND', (0,i), (-1,i), colors.white if i%2==1 else BS) for i in range(1,6)],
    ('GRID', (0,0), (-1,-1), 0.5, TM), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('LEFTPADDING', (0,0), (-1,-1), 8), ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ('TOPPADDING', (0,0), (-1,-1), 5), ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(Spacer(1,10))
story.append(t2)
story.append(Paragraph('Table 2: Bugs identified and fixed during audit', cap))

story.append(Paragraph('4. Files Modified', h1))
for f in [
    'src/app/(dashboard)/admin/subscriptions/page.tsx - Fixed data field parsing',
    'src/app/api/auth/stats/route.ts - Scoped queries to authenticated user',
    'src/app/api/auth/[id]/route.ts - Added session expiry check in PATCH',
    'src/app/api/billing/route.ts - Restricted PATCH to free plan only',
    'src/app/api/admin/subscriptions/[id]/approve/route.ts - Enterprise role handling',
]:
    story.append(Paragraph(f'  {f}', body))

story.append(Paragraph('5. Remaining Recommendations', h1))
for r in [
    'Audit 30+ high-risk [id]-parameter API routes for potential IDOR vulnerabilities',
    'Add userId field to Project, WorkflowPipeline, and AutomationRule models',
    'Set up Vercel environment variables for production deployment',
    'Configure DNS for theonewaygda.com custom domain',
]:
    story.append(Paragraph(f'  {r}', body))

doc.build(story)
print(f"OK: {out} ({os.path.getsize(out)} bytes)")
