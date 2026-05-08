# Bluom Affiliate & Influencer Playbook

## 1. How to Grant Pro Access (Step-by-Step)

### Step 1 — Get their Clerk ID
1. Go to [Clerk Dashboard → Users](https://dashboard.clerk.com/apps/app_377Hh9dMZsEBLrRCfw24FrhcoI7/instances/ins_37gWIhU2W5j4mUAncaBfCx1tvU9/user-authentication/user-and-authentication)
2. Search the influencer's name or email → copy their `user_xxxx` ID

### Step 2 — Run the Convex mutation
1. Go to [Convex Dashboard → Functions](https://dashboard.convex.dev/t/jorge-carvalho/bluomapp/cheerful-snake-681)
2. Click **admin → grantManualAccess** → Run function
3. Fill in:

```json
{
  "clerkId": "user_XXXXXXXXXXXXXXXX",
  "tier": "1_month",
  "name": "Pedro Silva",
  "handle": "@pedrofit",
  "platform": "instagram",
  "language": "pt",
  "offerCode": "PEDRO20",
  "commissionPct": 20,
  "notes": "Fitness creator, 50k IG, agreed to 3 posts"
}
```

**Available tiers:** `1_month` · `3_months` · `6_months` · `1_year` · `2_years` · `lifetime` · `family`

### Step 3 — Generate their Apple Offer Code (replaces Promo Codes)

**Important:** Apple deprecated IAP Promo Codes. The "Generate Promo Codes" button is greyed out for all in-app purchases. Use **Offer Codes** instead — they're more powerful (eligibility rules, expiration, up to 1 million codes per app per quarter) and they support non-renewing subscriptions.

Apple docs: https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases

**Step-by-step in App Store Connect:**

1. Go to https://appstoreconnect.apple.com → sign in
2. **My Apps** → select **Bluom: Nutrition & Fitness AI**
3. Top tab bar → **Subscriptions** (or **Monetization → Subscriptions**)
4. Pick the subscription product (e.g. Bluom Pro monthly or yearly)
5. Scroll down → **Subscription Offers** section → click **+** → choose **Offer Codes**
6. Configure the offer:
   - **Reference Name:** internal label, e.g. `Influencer 1-Month Free`
   - **Offer Code Name (Customer-Facing):** e.g. `INFLUENCER1M`
   - **Customer Eligibility:** New / Existing / Expired subscribers — typically "All" for influencer testing
   - **Country/Region:** All (or restrict to specific markets)
   - **Duration:** 1 month / 3 months / etc.
   - **Type:** Free, Pay as you go, or Pay up front
   - **Number of Periods:** how many billing cycles the offer applies to
7. **Codes:** generate either:
   - **Custom codes** (one shared code anyone can redeem, e.g. `PEDRO20`) — best for influencer audiences sharing one link
   - **One-Time Use codes** (download as CSV, give one per person) — best for individual influencer free access
8. Save → Apple generates a redeem URL: `https://apps.apple.com/redeem?ctx=offercodes&id=6759072102&code=XXXXXXX`
9. Send the redeem URL to the influencer

**Per-quarter limit:** up to 1 million codes per app per quarter (vs the old 100/6mo for promo codes — this is way better).

**For RevenueCat tracking:** RevenueCat detects offer code redemptions automatically via Apple Server-to-Server notifications, so the user's `isPremium` status in Convex updates without you doing anything (see Section 6).

### Step 4 — Send them the DM (scripts below)

---

## 2. Wilson Silva — 1 Month Access

**Clerk ID:** `user_3CosGrUeCtMGgxrWjGmU52B2hD8`

Run this in the Convex dashboard → admin → grantManualAccess:

```json
{
  "clerkId": "user_3CosGrUeCtMGgxrWjGmU52B2hD8",
  "tier": "1_month",
  "name": "Wilson Silva",
  "notes": "Family/Friend — 1 month trial"
}
```

Expires automatically in 30 days. To extend, run `extendAffiliateAccess` with a new tier.

---

## 3. Tier Reference

| Tier | Who it's for | Duration |
|------|-------------|----------|
| `1_month` | Micro-influencers trying the app | 30 days |
| `3_months` | Mid-tier (10k–50k followers) | 90 days |
| `6_months` | Strong creators (50k–200k) | 180 days |
| `1_year` | Large creators (200k+) | 365 days |
| `2_years` | Mega influencers (1M+) | 730 days |
| `lifetime` | Mega / strategic partners | Forever |
| `family` | Family / inner circle | Forever |

---

## 4. Business Email Setup (Free — Namecheap Email Forwarding)

You need branded inboxes on `bluom.app`. All emails forward to **ggovsaas@gmail.com**.

**Aliases configured (✅ DONE — Apr 30, 2026):**
- `support@bluom.app` → ggovsaas@gmail.com (customer support, App Store contact)
- `affiliates@bluom.app` → ggovsaas@gmail.com (Impact.com signup and influencer outreach)

DNS authority is **Namecheap BasicDNS** (confirmed). Vercel hosts the website via the existing A record `@ → 216.198.79.1` and CNAME `www → cname.vercel-dns.com.` — these are independent from email and untouched.

### How it was set up (for reference, in case more aliases are needed)

1. Go to [Namecheap → bluom.app domain page](https://ap.www.namecheap.com/domains/domaincontrolpanel/bluom.app/domain)
2. Scroll to **REDIRECT EMAIL** section
3. Click **+ ADD FORWARDER**, type the alias on the left and `ggovsaas@gmail.com` on the right, click the green ✓ to save
4. Mail Settings dropdown is set to "Email Forwarding" → Namecheap auto-creates the MX + SPF records

The auto-created SPF: `v=spf1 include:spf.efwd.registrar-servers.com ~all` (locked TXT, do not modify).

### Send FROM these addresses in Gmail (free, with caveats)

Free Namecheap forwarding does **inbound only**. To send from these addresses, set up Gmail's "Send mail as":

1. Gmail → **Settings (⚙) → See all settings → Accounts and Import → Send mail as → Add another email address**
2. Name: `Bluom Support` / `Bluom Affiliates`
3. Email: `support@bluom.app` / `affiliates@bluom.app`
4. **Uncheck** "Treat as an alias" (so replies come back to that address, not your gmail)
5. Click Next → use Gmail's SMTP via your account (free) — recipients see `support@bluom.app` but Gmail may append "via gmail.com" in some clients (Outlook, older Gmail)

**Caveat:** for fully clean professional outbound (no "via gmail.com"), upgrade to Namecheap Private Email (~$11/year first year) and use its SMTP server (`mail.privateemail.com`, port 587).

### Sign up for Impact.com
- Use `affiliates@bluom.app` as your business email — the verification link lands in your Gmail via the forwarder

---

## 5. Outreach DM Scripts

### 🇬🇧 ENGLISH

**Cold DM (Instagram / TikTok)**
> Hey [Name] 👋 I've been following your content — your [specific post/video] really hit home.
>
> I built a peak-performance app called **Bluom** — AI nutrition, 2,000+ workouts, biohacking, mental wellness, GPS training, and more. It's basically the app I always wished existed.
>
> I'd love to give you a **free Master Key** (full Pro access) so you can experience it yourself — no strings attached. If you love it, we can talk about a partnership where your audience gets an exclusive discount and you earn commission on every member they bring in.
>
> Want me to send you the key? 🔑

**Follow-up (if no reply after 5 days)**
> Hey [Name] — just following up! I sent Bluom's free Master Key your way. The app just hit [X] downloads and we're growing fast. Happy to jump on a quick call if easier. 🙌

**Confirmation (after they agree)**
> Amazing! I'm activating your Pro access right now. You'll get a personal redemption link in the next message. Once you've had a chance to explore it, I'd love to hear your thoughts — and we can set up your unique promo code (e.g. `[NAME]20`) for your audience. 🚀

---

### 🇧🇷 PORTUGUÊS

**DM Frio**
> Olá [Nome] 👋 Tenho acompanhado o teu conteúdo — o teu post sobre [assunto específico] foi muito bom!
>
> Criei uma app de alta performance chamada **Bluom** — nutrição com IA, +2.000 treinos, biohacking, bem-estar mental, treino GPS e muito mais. É basicamente a app que eu sempre quis ter.
>
> Queria dar-te um **Master Key gratuito** (acesso Pro completo) para experimentares à vontade — sem compromisso nenhum. Se gostares, podemos falar de uma parceria em que o teu público tem desconto exclusivo e tu ganhas comissão por cada membro que trouxer.
>
> Posso enviar-te o link agora? 🔑

**Follow-up (5 dias depois, sem resposta)**
> Olá [Nome], só a relembrar! Quis enviar-te o Master Key da Bluom. A app está a crescer muito rápido e adorava ter a tua opinião. Se preferires, podemos também fazer uma call rápida. 🙌

**Confirmação (depois de aceitarem)**
> Fantástico! Estou a ativar o teu acesso Pro agora. Receberás o link de resgate na próxima mensagem. Quando explorares a app, diz-me o que achas — e vamos criar o teu código único (ex: `[NOME]20`) para partilhares com o teu público. 🚀

---

### 🇪🇸 ESPAÑOL

**DM Frío**
> ¡Hola [Nombre]! 👋 He estado siguiendo tu contenido — tu publicación sobre [tema específico] me pareció genial.
>
> Creé una app de alto rendimiento llamada **Bluom** — nutrición con IA, +2.000 entrenamientos, biohacking, bienestar mental, GPS para entrenar y mucho más. Es básicamente la app que siempre quise tener.
>
> Me gustaría darte una **Master Key gratuita** (acceso Pro completo) para que la pruebes sin compromiso. Si te encanta, podemos hablar de una colaboración donde tu audiencia tenga un descuento exclusivo y tú ganes comisión por cada miembro que traiga.
>
> ¿Te envío el enlace ahora? 🔑

**Seguimiento (5 días sin respuesta)**
> ¡Hola [Nombre]! Solo quería hacer un seguimiento. Quería enviarte la Master Key de Bluom — la app está creciendo muy rápido y me encantaría conocer tu opinión. Si prefieres, también podemos hacer una llamada rápida. 🙌

**Confirmación (después de aceptar)**
> ¡Genial! Estoy activando tu acceso Pro ahora mismo. Recibirás el enlace de canje en el próximo mensaje. Cuando hayas explorado la app, cuéntame qué te parece — y creamos tu código único (ej: `[NOMBRE]20`) para compartir con tu audiencia. 🚀

---

## 6. RevenueCat Setup Checklist

- [ ] Go to [RevenueCat Dashboard](https://app.revenuecat.com/projects/223c9fcd/apps/appb556ea78bc)
- [ ] **Integrations → App Store Server Notifications**: enable and paste the URL into App Store Connect → your app → App Information → App Store Server Notifications
- [ ] **Entitlements**: confirm your "Pro" entitlement is mapped to your Bluom Pro subscription product ID
- [ ] When an influencer redeems an Apple offer code, RevenueCat detects it automatically and updates their `isPremium` status in Convex via your existing webhook

---

## 7. Affiliate Tracking Without Impact.com

Until you have full Impact.com tracking set up, track payouts manually using **Apple Subscription Offer Codes** (not the deprecated promo codes — see Section 1, Step 3):

1. In App Store Connect → **Sales and Trends → Subscription Offer Codes Report**
2. Filter by each influencer's custom offer code (e.g. `PEDRO20`)
3. Download the CSV monthly → count redemptions → pay commission manually

**Commission formula:** `redemptions × subscription_price × commissionPct/100`

For Google Play (Android) influencer tracking: use **Google Play Console → Monetization → Promotions → Promo Codes** (Google still allows promo codes for IAPs).

Use `affiliates@bluom.app` (currently forwarding to your Gmail) as your Impact.com business email.

---

## 8. Convex Admin Panel Quick Reference

| Action | Convex Function |
|--------|----------------|
| Grant access | `admin → grantManualAccess` |
| Extend/upgrade tier | `admin → extendAffiliateAccess` |
| Revoke access | `admin → revokeManualAccess` |
| View all affiliates | `admin → listAffiliates` |
| View active only | `admin → listAffiliates` with `{ "status": "active" }` |
