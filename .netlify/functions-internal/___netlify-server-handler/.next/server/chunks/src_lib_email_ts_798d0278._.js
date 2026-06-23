module.exports=[492749,e=>{"use strict";var t=e.i(129508),r=e.i(246245),o=e.i(254799);let a=process.env.ADMIN_EMAIL||"",n=process.env.RESEND_API_KEY?process.env.RESEND_SENDER||"onboarding@resend.dev":a;function i(){if(process.env.RESEND_API_KEY){let e=new r.Resend(process.env.RESEND_API_KEY);return t.default.createTransport({name:"resend",version:"1.0.0",send:async(t,r)=>{try{let{from:o,to:a,subject:n,html:i,text:s}=t,l=await e.emails.send({from:"string"==typeof o?o:String(o),to:Array.isArray(a)?a:[a],subject:n,html:i,text:s});r(null,l)}catch(e){r(e instanceof Error?e:Error(String(e)))}}})}if(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD)return t.default.createTransport({host:process.env.SMTP_HOST,port:parseInt(process.env.SMTP_PORT||"587"),secure:"465"===process.env.SMTP_PORT,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});let e=process.env.ADMIN_EMAIL_APP_PASSWORD;if(e){let r=a.split("@")[1]?.toLowerCase();return r&&["outlook.com","outlook.fr","hotmail.com","live.com","msn.com"].includes(r)?t.default.createTransport({host:"smtp-mail.outlook.com",port:587,secure:!1,auth:{user:a,pass:e}}):t.default.createTransport({service:"gmail",auth:{user:a,pass:e}})}return t.default.createTransport({jsonTransport:!0})}let s=process.env.NEXT_PUBLIC_SITE_URL||"https://votre-site.netlify.app",l=process.env.EMAIL_ACTION_SECRET||"";function d(e,t){if(!l)throw Error("EMAIL_ACTION_SECRET is not configured");let r=`${e}:${t}:${Date.now()}`,a=(0,o.createHmac)("sha256",l).update(r).digest("hex");return Buffer.from(`${r}:${a}`).toString("base64url")}function p(e){try{let t=Buffer.from(e,"base64url").toString("utf-8"),[r,a]=t.split(":"),n=r.split(":");if(n.length<3)return{userId:"",action:"approve",valid:!1};let i=n[0],s=n[1],d=parseInt(n[2]);if(Date.now()-d>864e5)return{userId:i,action:s,valid:!1};let p=`${i}:${s}:${d}`,c=(0,o.createHmac)("sha256",l).update(p).digest("hex"),f=t.lastIndexOf(":")+1;if(t.slice(f)===c)return{userId:i,action:s,valid:!0};return{userId:i,action:s,valid:!1}}catch{return{userId:"",action:"approve",valid:!1}}}async function c(e,t,r,o,l){try{let p=i(),c=e||"Not provided",f=new Date().toLocaleString("en-US",{timeZone:"Europe/Paris",dateStyle:"full",timeStyle:"short"}),g=d(r,"approve"),b=d(r,"reject"),x=`${s}/admin/action?token=${g}`,h=`${s}/admin/action?token=${b}`,u=`[TheOneWayGDA] New Access Request from ${c}`,y=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
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
<td style="color:#1e293b;font-size:14px;font-weight:600;">${c}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Email</td>
<td style="color:#6366f1;font-size:14px;font-weight:600;border-top:1px solid #e2e8f0;">${t}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Date</td>
<td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${f}</td></tr>
${o?`<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">IP</td><td style="color:#94a3b8;font-size:13px;font-family:monospace;border-top:1px solid #e2e8f0;">${o}</td></tr>`:""}
${l?`<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Languages</td><td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${l}</td></tr>`:""}
</table>

<p style="margin:0 0 16px;color:#334155;font-size:14px;font-weight:600;">Review and take action:</p>

<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="48%" align="center" style="padding-right:6px;">
<a href="${x}" style="display:inline-block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;text-align:center;">Approve Access</a>
</td>
<td width="4%"></td>
<td width="48%" align="center" style="padding-left:6px;">
<a href="${h}" style="display:inline-block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;text-align:center;">Reject</a>
</td>
</tr></table>

<p style="margin:20px 0 0;color:#94a3b8;font-size:11px;text-align:center;">These links are secure and expire in 24 hours.</p>

</td></tr>
<tr><td style="padding:12px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Admin Notification<br>You can also manage all requests at <a href="${s}/admin/approvals" style="color:#6366f1;">theonewaygda.com/admin/approvals</a></p>
</td></tr></table></td></tr></table></body></html>`;return await p.sendMail({from:`"TheOneWayGDA" <${n}>`,to:a,subject:u,html:y}),process.env.RESEND_API_KEY||process.env.ADMIN_EMAIL_APP_PASSWORD?console.log(`[Email] Access request notification sent to ${a} for ${t}`):console.log(`[Email] DEV MODE — Access request notification for ${t}. Set RESEND_API_KEY to enable real emails.`),!0}catch(e){return console.error("[Email] Failed to send access request notification:",e instanceof Error?e.message:"An error occurred"),!1}}async function f(e,t){try{let r=i(),o=t||e,a=`[TheOneWayGDA] Access Approved — Welcome, ${o}!`,l=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Access Approved!</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Welcome to TheOneWayGDA platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${o},</p>
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
<a href="${s}/auth/login" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">Sign In to TheOneWayGDA</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform</p>
</td></tr></table></td></tr></table></body></html>`;return await r.sendMail({from:`"TheOneWayGDA" <${n}>`,to:e,subject:a,html:l}),console.log(`[Email] Approval email sent to ${e}`),!0}catch(e){return console.error("[Email] Failed to send approval email:",e instanceof Error?e.message:"An error occurred"),!1}}async function g(e,t){try{let r=i(),o=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6b7280,#4b5563);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Access Request Update</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TheOneWayGDA Platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${t||e},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">Thank you for your interest in TheOneWayGDA. After reviewing your request, we are unable to approve access at this time. You are welcome to submit a new request in the future.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${s}/auth/register" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6b7280,#4b5563);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Submit New Request</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform</p>
</td></tr></table></td></tr></table></body></html>`;return await r.sendMail({from:`"TheOneWayGDA" <${n}>`,to:e,subject:"[TheOneWayGDA] Access Request Update",html:o}),console.log(`[Email] Rejection email sent to ${e}`),!0}catch(e){return console.error("[Email] Failed to send rejection email:",e instanceof Error?e.message:"An error occurred"),!1}}async function b(e){try{let t=i(),r=e.name||"Anonymous",o=new Date().toLocaleString("en-US",{timeZone:"Europe/Paris",dateStyle:"full",timeStyle:"short"}),l=d(e.email,"approve"),p=d(e.email,"reject"),c=`${s}/admin/visitor-action?token=${l}`,f=`${s}/admin/visitor-action?token=${p}`,g=`[TheOneWayGDA] New Visitor: ${r} (${e.visitorType})`,b=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;">
<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">New Visitor Registration</h1>
<p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Someone just signed up via the EmailGate</p>
</td></tr>
<tr><td style="padding:24px 32px;">
<table width="100%" cellpadding="10" cellspacing="0" style="background:#f8fafc;border-radius:10px;margin-bottom:20px;">
<tr><td width="120" style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Name</td>
<td style="color:#1e293b;font-size:13px;font-weight:600;">${r}</td></tr>
<tr><td style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Email</td>
<td style="color:#6366f1;font-size:13px;font-weight:600;border-top:1px solid #e2e8f0;">${e.email}</td></tr>
<tr><td style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Type</td>
<td style="color:#1e293b;font-size:13px;border-top:1px solid #e2e8f0;text-transform:capitalize;">${e.visitorType}</td></tr>
<tr><td style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Date</td>
<td style="color:#1e293b;font-size:13px;border-top:1px solid #e2e8f0;">${o}</td></tr>
${e.country?`<tr><td style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Country</td><td style="color:#1e293b;font-size:13px;border-top:1px solid #e2e8f0;">${e.country}</td></tr>`:""}
</table>

<p style="margin:0 0 14px;color:#334155;font-size:13px;font-weight:600;">Review and take action:</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="48%" align="center" style="padding-right:6px;">
<a href="${c}" style="display:inline-block;width:100%;padding:12px 20px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600;text-align:center;">Approve</a>
</td>
<td width="4%"></td>
<td width="48%" align="center" style="padding-left:6px;">
<a href="${f}" style="display:inline-block;width:100%;padding:12px 20px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600;text-align:center;">Reject</a>
</td>
</tr></table>

<p style="margin:16px 0 0;color:#94a3b8;font-size:11px;text-align:center;line-height:1.6;">
These links are secure and expire in 24 hours.<br/>
Or manage all visitors at <strong>${s}/admin/visitors</strong>.
</p>
</td></tr>
<tr><td style="padding:10px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Visitor Notification</p>
</td></tr></table></td></tr></table></body></html>`;return await t.sendMail({from:`"TheOneWayGDA" <${n}>`,to:a,subject:g,html:b}),process.env.ADMIN_EMAIL_APP_PASSWORD?console.log(`[Email] Visitor notification sent to ${a} for ${e.email}`):console.log(`[Email] DEV MODE — Visitor notification for ${e.email}. Set ADMIN_EMAIL_APP_PASSWORD to enable real emails.`),!0}catch(e){return console.error("[Email] Failed to send visitor notification:",e instanceof Error?e.message:"An error occurred"),!1}}async function x(e,t,r){try{let o=i(),a=`${s}/auth/reset-password?token=${r}`,l=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Reset Your Password</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TheOneWayGDA Platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${t||e},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">We received a request to reset your password. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.</p>

<div style="background:#f0f0ff;border:1px solid #e0e0ff;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
<p style="margin:0;color:#4338ca;font-size:13px;font-weight:600;">Security Notice</p>
<p style="margin:6px 0 0;color:#4338ca;font-size:12px;line-height:1.6;">If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${a}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">Reset Password</a>
</td></tr></table>

<p style="margin:16px 0 0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.5;">If the button doesn't work, copy and paste this link into your browser:<br/>
<a href="${a}" style="color:#6366f1;word-break:break-all;">${a}</a></p>

</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; AI-Powered Statistical Analysis Platform</p>
</td></tr></table></td></tr></table></body></html>`;return await o.sendMail({from:`"TheOneWayGDA" <${n}>`,to:e,subject:"[TheOneWayGDA] Reset Your Password",html:l}),console.log(`[Email] Password reset email sent to ${e}`),!0}catch(e){return console.error("[Email] Failed to send password reset email:",e instanceof Error?e.message:"An error occurred"),!1}}async function h(e,t,r,o,l){try{let o=i(),l=e||t,d=new Date().toLocaleString("en-US",{timeZone:"Europe/Paris",dateStyle:"full",timeStyle:"short"}),p=r.charAt(0).toUpperCase()+r.slice(1),c=`${s}/admin/subscriptions`,f=`[TheOneWayGDA] New Subscription Purchase: ${p} Plan — ${l}`,g=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">New Subscription Purchase</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">A user has purchased a ${p} plan and needs your confirmation</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.6;">The following user has purchased a subscription and is waiting for your approval to activate it:</p>

<table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin-bottom:24px;">
<tr><td width="130" style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Name</td>
<td style="color:#1e293b;font-size:14px;font-weight:600;">${l}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Email</td>
<td style="color:#6366f1;font-size:14px;font-weight:600;border-top:1px solid #e2e8f0;">${t}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Plan</td>
<td style="color:#1e293b;font-size:14px;font-weight:700;border-top:1px solid #e2e8f0;">${p}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Date</td>
<td style="color:#1e293b;font-size:14px;border-top:1px solid #e2e8f0;">${d}</td></tr>
<tr><td style="color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-top:1px solid #e2e8f0;">Status</td>
<td style="color:#f59e0b;font-size:14px;font-weight:700;border-top:1px solid #e2e8f0;">Pending Approval</td></tr>
</table>

<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
<p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">Action Required</p>
<p style="margin:6px 0 0;color:#92400e;font-size:12px;line-height:1.6;">This subscription is currently <strong>pending</strong>. Please review and approve or reject it from your admin dashboard. The payment has already been processed via Stripe.</p>
</div>

<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td align="center">
<a href="${c}" style="display:inline-block;width:100%;padding:14px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;text-align:center;">Go to Subscription Management</a>
</td>
</tr></table>

<p style="margin:20px 0 0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Subscription Notification</p>

</td></tr>
</table></td></tr></table></body></html>`;return await o.sendMail({from:`"TheOneWayGDA" <${n}>`,to:a,subject:f,html:g}),process.env.ADMIN_EMAIL_APP_PASSWORD?console.log(`[Email] Subscription notification sent to ${a} for ${t} (${r})`):console.log(`[Email] DEV MODE — Subscription notification for ${t} (${r}). Set ADMIN_EMAIL_APP_PASSWORD to enable real emails.`),!0}catch(e){return console.error("[Email] Failed to send subscription notification:",e instanceof Error?e.message:"An error occurred"),!1}}async function u(e,t,r){try{let o=i(),a=r.charAt(0).toUpperCase()+r.slice(1),l=`[TheOneWayGDA] Subscription Activated — ${a} Plan`,d=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Subscription Activated!</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your ${a} plan is now active</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${t||e},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">Great news! Your <strong style="color:#10b981;">${a}</strong> subscription has been approved and is now active. You can start enjoying all the premium features right away.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${s}/billing" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">View My Subscription</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Subscription Notification</p>
</td></tr></table></td></tr></table></body></html>`;return await o.sendMail({from:`"TheOneWayGDA" <${n}>`,to:e,subject:l,html:d}),console.log(`[Email] Subscription approved email sent to ${e}`),!0}catch(e){return console.error("[Email] Failed to send subscription approved email:",e instanceof Error?e.message:"An error occurred"),!1}}async function y(e,t,r){try{let o=i(),a=r.charAt(0).toUpperCase()+r.slice(1),l=`[TheOneWayGDA] Subscription Update — ${a} Plan`,d=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:linear-gradient(135deg,#6b7280,#4b5563);padding:28px 32px;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Subscription Update</h1>
<p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">TheOneWayGDA Platform</p>
</td></tr>
<tr><td style="padding:28px 32px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:16px;font-weight:600;">Hi ${t||e},</p>
<p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.7;">After reviewing your ${a} subscription request, we are unable to activate it at this time. A refund will be processed if applicable. You may contact support for more information.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="${s}/billing" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6b7280,#4b5563);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">View Billing</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
<p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">TheOneWayGDA &middot; Subscription Notification</p>
</td></tr></table></td></tr></table></body></html>`;return await o.sendMail({from:`"TheOneWayGDA" <${n}>`,to:e,subject:l,html:d}),console.log(`[Email] Subscription rejected email sent to ${e}`),!0}catch(e){return console.error("[Email] Failed to send subscription rejected email:",e instanceof Error?e.message:"An error occurred"),!1}}e.s(["ADMIN_EMAIL",()=>a,"generateActionToken",()=>d,"sendAdminAccessRequestEmail",()=>c,"sendAdminSubscriptionNotificationEmail",()=>h,"sendPasswordResetEmail",()=>x,"sendUserApprovalEmail",()=>f,"sendUserRejectionEmail",()=>g,"sendUserSubscriptionApprovedEmail",()=>u,"sendUserSubscriptionRejectedEmail",()=>y,"sendVisitorNotification",()=>b,"verifyActionToken",()=>p])}];

//# sourceMappingURL=src_lib_email_ts_798d0278._.js.map