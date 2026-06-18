import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const ADMIN_EMAIL = 'msad41855@gmail.com'

// GET /api/admin/test-email — Check email configuration status (no auth needed for status check)
export async function GET() {
  const hasAppPassword = !!process.env.ADMIN_EMAIL_APP_PASSWORD
  const hasCustomSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  const isConfigured = hasAppPassword || hasCustomSmtp

  return NextResponse.json({
    configured: isConfigured,
    provider: hasAppPassword ? 'gmail' : hasCustomSmtp ? 'smtp' : 'none',
    adminEmail: ADMIN_EMAIL,
    mode: isConfigured ? 'live' : 'dev',
    message: isConfigured
      ? 'Email is configured. You will receive real email notifications.'
      : 'Email is NOT configured. Notifications are logged to console only. Set ADMIN_EMAIL_APP_PASSWORD in your .env to enable.',
  })
}

// POST /api/admin/test-email — Send a test email to verify configuration
export async function POST(request: NextRequest) {
  try {
    const hasAppPassword = !!process.env.ADMIN_EMAIL_APP_PASSWORD
    const hasCustomSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)

    if (!hasAppPassword && !hasCustomSmtp) {
      return NextResponse.json({
        success: false,
        error: 'Email not configured',
        message: 'Set ADMIN_EMAIL_APP_PASSWORD (for Gmail) or SMTP_HOST/SMTP_USER/SMTP_PASSWORD in your .env file first.',
        setupGuide: [
          '1. Go to https://myaccount.google.com/apppasswords',
          '2. Generate a new App Password for "TheOneWayGDA"',
          '3. Add ADMIN_EMAIL_APP_PASSWORD="the-16-char-code" to your .env',
          '4. Restart your server',
        ],
      }, { status: 400 })
    }

    let transporter
    if (hasAppPassword) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: ADMIN_EMAIL, pass: process.env.ADMIN_EMAIL_APP_PASSWORD },
      })
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      })
    }

    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://theonewaygda.com'
    const now = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })

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
<td style="color:#1e293b;font-size:14px;">${hasAppPassword ? 'Gmail (App Password)' : `Custom SMTP (${process.env.SMTP_HOST})`}</td></tr>
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
      from: `"TheOneWayGDA" <${ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: '[TheOneWayGDA] Email Test — Configuration Verified',
      html,
    })

    console.log('[Email] Test email sent successfully to', ADMIN_EMAIL)

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${ADMIN_EMAIL}. Check your inbox!`,
      provider: hasAppPassword ? 'gmail' : 'smtp',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send test email'
    console.error('[Email] Test email failed:', message)

    return NextResponse.json({
      success: false,
      error: message,
      hint: 'If you see an authentication error, make sure your App Password is correct. If you see a connection error, check your network settings.',
    }, { status: 500 })
  }
}