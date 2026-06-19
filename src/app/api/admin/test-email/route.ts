import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'msad41855@gmail.com'
const SENDER_EMAIL = process.env.RESEND_API_KEY
  ? (process.env.RESEND_SENDER || 'onboarding@resend.dev')
  : ADMIN_EMAIL

const MICROSOFT_DOMAINS = ['outlook.com', 'outlook.fr', 'hotmail.com', 'live.com', 'msn.com']

function detectProvider(): { name: string; configured: boolean } {
  if (process.env.RESEND_API_KEY) return { name: 'resend', configured: true }
  const hasCustomSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  if (hasCustomSmtp) return { name: 'smtp', configured: true }
  const hasAppPassword = !!process.env.ADMIN_EMAIL_APP_PASSWORD
  if (hasAppPassword) {
    const domain = ADMIN_EMAIL.split('@')[1]?.toLowerCase()
    if (domain && MICROSOFT_DOMAINS.includes(domain)) return { name: 'outlook', configured: true }
    return { name: 'gmail', configured: true }
  }
  return { name: 'none', configured: false }
}

function buildTransporter() {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    return nodemailer.createTransport({
      name: 'resend',
      version: '1.0.0',
      send: async (mail: Record<string, unknown>, callback: (err: Error | null, info: unknown) => void) => {
        try {
          const { from, to, subject, html, text } = mail as { from: string; to: string | string[]; subject: string; html?: string; text?: string }
          const result = await resend.emails.send({
            from: typeof from === 'string' ? from : String(from),
            to: Array.isArray(to) ? to : [to],
            subject: subject as string,
            html: html as string,
            text: text as string,
          })
          callback(null, result)
        } catch (err) {
          callback(err instanceof Error ? err : new Error(String(err)))
        }
      },
    })
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  }

  const appPassword = process.env.ADMIN_EMAIL_APP_PASSWORD
  if (appPassword) {
    const domain = ADMIN_EMAIL.split('@')[1]?.toLowerCase()
    if (domain && MICROSOFT_DOMAINS.includes(domain)) {
      return nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: { user: ADMIN_EMAIL, pass: appPassword },
      })
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: ADMIN_EMAIL, pass: appPassword },
    })
  }

  return null
}

// GET /api/admin/test-email — Check email configuration status
export async function GET() {
  const { name, configured } = detectProvider()

  const providerLabels: Record<string, string> = {
    resend: `Resend → ${ADMIN_EMAIL}`,
    outlook: 'Microsoft Outlook',
    gmail: 'Gmail',
    smtp: `Custom SMTP${process.env.SMTP_HOST ? ` (${process.env.SMTP_HOST})` : ''}`,
    none: 'Not configured',
  }

  return NextResponse.json({
    configured,
    provider: name,
    providerLabel: providerLabels[name] || name,
    adminEmail: ADMIN_EMAIL,
    mode: configured ? 'live' : 'dev',
    message: configured
      ? `Email is configured via ${providerLabels[name]}. You will receive real email notifications.`
      : 'Email is NOT configured. Set RESEND_API_KEY or ADMIN_EMAIL + ADMIN_EMAIL_APP_PASSWORD in your .env to enable.',
  })
}

// POST /api/admin/test-email — Send a test email to verify configuration
export async function POST(request: NextRequest) {
  try {
    const { name, configured } = detectProvider()

    if (!configured) {
      return NextResponse.json({
        success: false,
        error: 'Email not configured',
        message: 'Set RESEND_API_KEY (recommended) or ADMIN_EMAIL + ADMIN_EMAIL_APP_PASSWORD in your .env file first.',
        setupGuide: [
          '1. Sign up free at https://resend.com/signup',
          '2. Go to https://resend.com/api-keys and create an API key',
          '3. Add RESEND_API_KEY="re_xxxx" to your .env',
          '4. Restart your server',
        ],
      }, { status: 400 })
    }

    const transporter = buildTransporter()
    if (!transporter) {
      return NextResponse.json({ success: false, error: 'Failed to create transporter' }, { status: 500 })
    }

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theonewaygda.com'
    const now = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })

    const providerLabels: Record<string, string> = {
      resend: `Resend → ${ADMIN_EMAIL}`,
      outlook: 'Microsoft Outlook',
      gmail: 'Gmail',
      smtp: `Custom SMTP (${process.env.SMTP_HOST})`,
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Email Test Successful</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TheOneWayGDA notification system is working</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">Your email configuration is working correctly. When new users register, you will receive notifications with one-click approve/reject buttons.</p>
<table width="100%" cellpadding="12" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:20px;">
<tr><td style="color:#166534;font-size:13px;font-weight:600;">Status</td>
<td style="color:#10b981;font-size:14px;font-weight:700;">Connected & Working</td></tr>
<tr style="border-top:1px solid #bbf7d0;"><td style="color:#166534;font-size:13px;font-weight:600;">Provider</td>
<td style="color:#1e293b;font-size:14px;">${providerLabels[name] || name}</td></tr>
<tr style="border-top:1px solid #bbf7d0;"><td style="color:#166534;font-size:13px;font-weight:600;">Admin Email</td>
<td style="color:#1e293b;font-size:14px;">${ADMIN_EMAIL}</td></tr>
<tr style="border-top:1px solid #bbf7d0;"><td style="color:#166534;font-size:13px;font-weight:600;">Tested at</td>
<td style="color:#1e293b;font-size:14px;">${now}</td></tr>
</table>
<p style="margin:0;color:#334155;font-size:14px;font-weight:600;">How user acceptance works:</p>
<ol style="margin:8px 0 0;padding-left:20px;color:#334155;font-size:13px;line-height:2.2;">
<li>A user registers on your site</li>
<li>You receive an email with <strong>Approve</strong> and <strong>Reject</strong> buttons</li>
<li>Click a button — the user is processed instantly</li>
<li>The user gets an automatic welcome/rejection email</li>
</ol>
<p style="margin:16px 0 0;color:#64748b;font-size:12px;">You can also manage all requests at <a href="${SITE_URL}/admin/approvals" style="color:#6366f1;">${SITE_URL}/admin/approvals</a></p>
</td></tr>
<tr><td style="padding:12px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Email System Test</p>
</td></tr></table></td></tr></table></body></html>`

    await transporter.sendMail({
      from: `"TheOneWayGDA" <${SENDER_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: '[TheOneWayGDA] Email Test — Configuration Verified',
      html,
    })

    console.log('[Email] Test email sent successfully to', ADMIN_EMAIL)

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${ADMIN_EMAIL}. Check your inbox!`,
      provider: name,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send test email'
    console.error('[Email] Test email failed:', message)

    return NextResponse.json({
      success: false,
      error: message,
      hint: 'Check your API key and verify your sender email is configured in Resend.',
    }, { status: 500 })
  }
}