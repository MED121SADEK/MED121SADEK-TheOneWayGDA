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

export interface VisitorNotificationData {
  name: string | null
  email: string
  visitorType: string
  country: string | null
  language: string | null
  ipAddress: string | null
  userAgent: string | null
  path: string | null
}

export async function sendVisitorNotification(data: VisitorNotificationData): Promise<boolean> {
  try {
    const transporter = getTransporter()
    const typeName = data.visitorType.charAt(0).toUpperCase() + data.visitorType.slice(1)
    const now = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })
    const subject = `[TheOneWayGDA] New ${typeName} Visitor: ${data.name || data.email}`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">New Visitor Alert</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">TheOneWayGDA Visitor Registration</p></td>
<td align="right"><span style="display:inline-block;padding:6px 14px;background:rgba(255,255,255,0.2);border-radius:20px;color:#fff;font-size:12px;font-weight:600;">${typeName}</span></td>
</tr></table></td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">A new visitor has registered on TheOneWayGDA platform:</p>
<table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:20px;">
<tr><td width="140" style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Name</td>
<td style="color:#1e293b;font-size:14px;font-weight:600;">${data.name || '<em style="color:#94a3b8;">Not provided</em>'}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Email</td>
<td style="color:#6366f1;font-size:14px;font-weight:600;border-top:1px solid #e2e8f0;"><a href="mailto:${data.email}" style="color:#6366f1;text-decoration:none;">${data.email}</a></td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Visitor Type</td>
<td style="border-top:1px solid #e2e8f0;"><span style="display:inline-block;padding:3px 10px;background:#6366f1;color:#fff;font-size:12px;font-weight:600;border-radius:6px;">${typeName}</span></td></tr>
${data.country ? `<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Country</td><td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${data.country}</td></tr>` : ''}
${data.language ? `<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Language</td><td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${data.language}</td></tr>` : ''}
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Registered</td>
<td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${now}</td></tr>
${data.ipAddress ? `<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">IP Address</td><td style="color:#94a3b8;font-size:13px;font-family:monospace;border-top:1px solid #e2e8f0;">${data.ipAddress}</td></tr>` : ''}
</table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoneway.app'}/admin/visitors" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Manage Visitors</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform<br>This is an automated notification from your visitor registration system.</p>
</td></tr></table></td></tr></table></body></html>`

    await transporter.sendMail({ from: `"TheOneWayGDA" <${ADMIN_EMAIL}>`, to: ADMIN_EMAIL, subject, html })
    if (!process.env.ADMIN_EMAIL_APP_PASSWORD) {
      console.log(`[Email] DEV MODE — Visitor notification for ${data.email} (${typeName}). Set ADMIN_EMAIL_APP_PASSWORD in .env to enable real email sending.`)
    } else {
      console.log(`[Email] Visitor notification sent to ${ADMIN_EMAIL} for ${data.email}`)
    }
    return true
  } catch (error: any) {
    console.error('[Email] Failed to send visitor notification:', error.message)
    return false
  }
}

export { ADMIN_EMAIL }
