import nodemailer from 'nodemailer'

const ADMIN_EMAIL = 'msad41855@gmail.com'

function getTransporter() {
  const appPassword = process.env.ADMIN_EMAIL_APP_PASSWORD
  if (appPassword) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: ADMIN_EMAIL, pass: appPassword },
    })
  }
  return nodemailer.createTransport({ jsonTransport: true })
}

const SITE_URL = 'https://theonewaygda.vercel.app'

// ── Signed token for secure email action links ──
import { createHmac } from 'crypto'

const EMAIL_SECRET = process.env.EMAIL_ACTION_SECRET || 'oneway-email-secret-2025'

export function generateActionToken(userId: string, action: 'approve' | 'reject' | 'reset'): string {
  const payload = `${userId}:${action}:${Date.now()}`
  const signature = createHmac('sha256', EMAIL_SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

export function verifyActionToken(token: string): { userId: string; action: 'approve' | 'reject' | 'reset'; valid: boolean } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [payload, signature] = decoded.split(':')

    // Reconstruct and verify signature
    const parts = payload.split(':')
    if (parts.length < 3) return { userId: '', action: 'approve', valid: false }

    const userId = parts[0]
    const action = parts[1] as 'approve' | 'reject' | 'reset'
    const timestamp = parseInt(parts[2])

    // Check token expiry (24 hours)
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return { userId, action, valid: false }
    }

    // Verify HMAC signature
    const expectedPayload = `${userId}:${action}:${timestamp}`
    const expectedSig = createHmac('sha256', EMAIL_SECRET).update(expectedPayload).digest('hex')

    // Find the signature part (everything after the last : of payload)
    const sigIndex = decoded.lastIndexOf(':') + 1
    const actualSig = decoded.slice(sigIndex)

    if (actualSig === expectedSig) {
      return { userId, action, valid: true }
    }
    return { userId, action, valid: false }
  } catch {
    return { userId: '', action: 'approve', valid: false }
  }
}

// ═══════════════════════════════════════════════════════════
// Email 1: Admin Notification — New Access Request
// ═══════════════════════════════════════════════════════════

export async function sendAdminAccessRequestEmail(
  userName: string | null,
  userEmail: string,
  userId: string,
  ipAddress: string | null
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const displayName = userName || 'Not provided'
    const now = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })

    const approveToken = generateActionToken(userId, 'approve')
    const rejectToken = generateActionToken(userId, 'reject')
    const approveUrl = `${SITE_URL}/admin/action?token=${approveToken}`
    const rejectUrl = `${SITE_URL}/admin/action?token=${rejectToken}`

    const subject = `[TheOneWayGDA] New Access Request from ${displayName}`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">New Access Request</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">A user is requesting access to TheOneWayGDA platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">The following user has submitted an access request and is waiting for your review:</p>

<table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:24px;">
<tr><td width="130" style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Name</td>
<td style="color:#1e293b;font-size:14px;font-weight:600;">${displayName}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Email</td>
<td style="color:#6366f1;font-size:14px;font-weight:600;border-top:1px solid #e2e8f0;">${userEmail}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Date</td>
<td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${now}</td></tr>
${ipAddress ? `<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">IP</td><td style="color:#94a3b8;font-size:13px;font-family:monospace;border-top:1px solid #e2e8f0;">${ipAddress}</td></tr>` : ''}
</table>

<p style="margin:0 0 16px;color:#334155;font-size:14px;font-weight:600;">Review and take action:</p>

<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="48%" align="center" style="padding-right:6px;">
<a href="${approveUrl}" style="display:inline-block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;text-align:center;">Approve Access</a>
</td>
<td width="4%"></td>
<td width="48%" align="center" style="padding-left:6px;">
<a href="${rejectUrl}" style="display:inline-block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;text-align:center;">Reject</a>
</td>
</tr></table>

<p style="margin:20px 0 0;color:#94a3b8;font-size:11px;text-align:center;">These links are secure and expire in 24 hours.</p>

</td></tr>
<tr><td style="padding:12px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Admin Notification<br>You can also manage all requests at <a href="${SITE_URL}/admin/approvals" style="color:#6366f1;">theonewaygda.vercel.app/admin/approvals</a></p>
</td></tr></table></td></tr></table></body></html>`

    await transporter.sendMail({ from: `"TheOneWayGDA" <${ADMIN_EMAIL}>`, to: ADMIN_EMAIL, subject, html })

    if (!process.env.ADMIN_EMAIL_APP_PASSWORD) {
      console.log(`[Email] DEV MODE — Access request notification for ${userEmail}. Set ADMIN_EMAIL_APP_PASSWORD to enable real emails.`)
    } else {
      console.log(`[Email] Access request notification sent to ${ADMIN_EMAIL} for ${userEmail}`)
    }
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    console.error('[Email] Failed to send access request notification:', message)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// Email 2: User Approval — Welcome Email
// ═══════════════════════════════════════════════════════════

export async function sendUserApprovalEmail(userEmail: string, userName: string | null): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const displayName = userName || userEmail
    const subject = `[TheOneWayGDA] Access Approved — Welcome, ${displayName}!`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Access Approved!</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Welcome to TheOneWayGDA platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${displayName},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">Great news! Your access request to TheOneWayGDA has been <strong style="color:#10b981;">approved</strong>. You can now sign in and explore the full platform.</p>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
<p style="margin:0;color:#166534;font-size:13px;font-weight:600;">What you can do now:</p>
<ul style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:13px;line-height:2;">
<li>Access the AI Model Leaderboard and benchmarks</li>
<li>Use the AI Copilot for data analysis assistance</li>
<li>Create and manage projects in your workspace</li>
<li>Join teams and collaborate with others</li>
</ul></div>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${SITE_URL}/auth/login" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">Sign In to TheOneWayGDA</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform</p>
</td></tr></table></td></tr></table></body></html>`

    await transporter.sendMail({ from: `"TheOneWayGDA" <${ADMIN_EMAIL}>`, to: userEmail, subject, html })
    console.log(`[Email] Approval email sent to ${userEmail}`)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    console.error('[Email] Failed to send approval email:', message)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// Email 3: User Rejection
// ═══════════════════════════════════════════════════════════

export async function sendUserRejectionEmail(userEmail: string, userName: string | null): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const displayName = userName || userEmail
    const subject = `[TheOneWayGDA] Access Request Update`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6b7280,#4b5563);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Access Request Update</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TheOneWayGDA Platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${displayName},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">Thank you for your interest in TheOneWayGDA. After reviewing your request, we are unable to approve access at this time. You are welcome to submit a new request in the future.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${SITE_URL}/auth/register" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6b7280,#4b5563);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Submit New Request</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform</p>
</td></tr></table></td></tr></table></body></html>`

    await transporter.sendMail({ from: `"TheOneWayGDA" <${ADMIN_EMAIL}>`, to: userEmail, subject, html })
    console.log(`[Email] Rejection email sent to ${userEmail}`)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    console.error('[Email] Failed to send rejection email:', message)
    return false
  }
}

// ── Legacy: Visitor notifications ──
export { ADMIN_EMAIL }

export interface VisitorNotificationData {
  name: string | null; email: string; visitorType: string; country: string | null
  language: string | null; ipAddress: string | null; userAgent: string | null; path: string | null
}

export async function sendVisitorNotification(_data: VisitorNotificationData): Promise<boolean> {
  return true
}

// ═══════════════════════════════════════════════════════════
// Email 4: Password Reset
// ═══════════════════════════════════════════════════════════

export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetToken: string
): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const displayName = userName || userEmail
    const subject = `[TheOneWayGDA] Reset Your Password`
    const resetUrl = `${SITE_URL}/auth/reset-password?token=${resetToken}`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Reset Your Password</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TheOneWayGDA Platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${displayName},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">We received a request to reset your password. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.</p>

<div style="background:#f0f0ff;border:1px solid #e0e0ff;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
<p style="margin:0;color:#4338ca;font-size:13px;font-weight:600;">Security Notice</p>
<p style="margin:6px 0 0;color:#4338ca;font-size:12px;line-height:1.6;">If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">Reset Password</a>
</td></tr></table>

<p style="margin:16px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/>
<a href="${resetUrl}" style="color:#6366f1;word-break:break-all;">${resetUrl}</a></p>

</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform</p>
</td></tr></table></td></tr></table></body></html>`

    await transporter.sendMail({ from: `"TheOneWayGDA" <${ADMIN_EMAIL}>`, to: userEmail, subject, html })
    console.log(`[Email] Password reset email sent to ${userEmail}`)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    console.error('[Email] Failed to send password reset email:', message)
    return false
  }
}
