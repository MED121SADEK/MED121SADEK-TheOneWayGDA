# is-a.dev Custom Domain Setup Guide

**Target Domain:** `theonewaygda.is-a.dev`  
**Vercel Project:** `theonewaygda.vercel.app`  
**Vercel Project ID:** `prj_A8xjgWJs2jbCyTsngvZVhSef0BAk`

---

## ✅ Step 0 — What's Already Done

The custom domain has already been **added to your Vercel project** via the API.  
Vercel is waiting for DNS verification before it starts serving traffic on the new domain.

**Verification status:** `pending_domain_verification`  
**Verification TXT record required:**

| Type  | Domain                              | Value                                                        |
|-------|-------------------------------------|--------------------------------------------------------------|
| TXT   | `_vercel.theonewaygda.is-a.dev`     | `vc-domain-verify=theonewaygda.is-a.dev,4c485d1dba0c5ae119c4` |

---

## Step 1 — Fork the is-a.dev Repository

1. Go to [https://github.com/is-a-dev/register](https://github.com/is-a-dev/register)
2. Click **Fork** to create your own copy of the repository
3. Clone your fork locally:

```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/register.git
cd register
```

---

## Step 2 — Create the Domain DNS File

Create a new file at **`domains/theonewaygda.json`** inside the cloned repo with the following content:

```json
{
  "description": "The One Way - Professional Solutions",
  "repo": "https://github.com/<YOUR_GITHUB_USERNAME>/theonewaygda",
  "owner": {
    "username": "<YOUR_GITHUB_USERNAME>",
    "email": "<YOUR_EMAIL>"
  },
  "record": {
    "CNAME": "theonewaygda.vercel.app"
  }
}
```

> **Important:** Replace `<YOUR_GITHUB_USERNAME>` and `<YOUR_EMAIL>` with your actual GitHub username and email.

**What this does:**  
This creates a `CNAME` DNS record so that `theonewaygda.is-a.dev` points to `theonewaygda.vercel.app`.

---

## Step 3 — Create the Vercel Verification TXT File

Vercel requires a TXT record to verify you own the domain. Create another file at **`domains/_vercel.theonewaygda.json`** with this content:

```json
{
  "description": "Vercel domain verification record for theonewaygda.is-a.dev",
  "record": {
    "TXT": ["vc-domain-verify=theonewaygda.is-a.dev,4c485d1dba0c5ae119c4"]
  }
}
```

**What this does:**  
This creates a `TXT` DNS record at `_vercel.theonewaygda.is-a.dev` which Vercel uses to verify you control the domain.

---

## Step 4 — Commit and Push

```bash
git add domains/theonewaygda.json domains/_vercel.theonewaygda.json
git commit -m "Add theonewaygda.is-a.dev domain with Vercel verification"
git push origin main
```

---

## Step 5 — Open a Pull Request

1. Go to your forked repo on GitHub
2. Click **"Contribute" → "Open Pull Request"**
3. The PR should be opened against the original `is-a-dev/register` repo
4. Fill in the PR description (e.g., "Add theonewaygda.is-a.dev domain")
5. Submit the PR and **wait for it to be merged**

> ⚠️ **The is-a.dev maintainers will review your PR.** DNS records are only live after the PR is merged.

---

## Step 6 — Verify Everything Works

After the PR is merged (usually within a few hours to a few days):

### 6a. Verify DNS Propagation

```bash
# Check the CNAME record
dig theonewaygda.is-a.dev CNAME +short

# Check the TXT verification record
dig _vercel.theonewaygda.is-a.dev TXT +short
```

Expected results:
- CNAME → `theonewaygda.vercel.app`
- TXT → `vc-domain-verify=theonewaygda.is-a.dev,4c485d1dba0c5ae119c4`

### 6b. Check Vercel Domain Status

Once DNS propagates, Vercel will automatically verify the domain. You can check at:

- **Vercel Dashboard** → [https://vercel.com/the-one-ways-projects/theonewaygda/domains](https://vercel.com/the-one-ways-projects/theonewaygda/domains)

### 6c. Test the Domain

```bash
curl -I https://theonewaygda.is-a.dev
```

You should see a `200 OK` response (or a redirect to your main domain).

---

## Step 7 — Configure Vercel to Redirect (Optional)

If you want `theonewaygda.is-a.dev` to be the **primary domain** (and redirect the default `theonewaygda.vercel.app` to it):

1. Go to **Vercel Dashboard → Settings → Domains**
2. Click the ⋯ menu next to `theonewaygda.is-a.dev`
3. Select **"Set as Primary"**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PR not merged yet | Be patient — is-a.dev maintainers review manually |
| DNS not propagating | Wait up to 48 hours after PR merge |
| Vercel shows "Invalid Configuration" | Make sure the CNAME points to `theonewaygda.vercel.app` |
| SSL certificate error | Wait 15-30 minutes after Vercel verifies the domain |
| Domain shows Vercel 404 | Make sure the domain is assigned to the correct project |

---

## File Summary

You need to create **two files** in the `domains/` folder of your forked `is-a-dev/register` repo:

| File | Purpose |
|------|---------|
| `domains/theonewaygda.json` | CNAME record → `theonewaygda.vercel.app` |
| `domains/_vercel.theonewaygda.json` | TXT record → Vercel domain verification |

Both files are also saved in this project's `download/` folder for convenience:
- `/download/is-a-dev-theonewaygda.json` — main domain config
- `/download/is-a-dev-_vercel.theonewaygda.json` — verification TXT config
