# BimaSetu

**AI insurance intelligence — understand the policy you already own.**

Live: **https://bimasetu-249955214846.us-central1.run.app**

---

## The problem

Most people aren't underinsured because they lack policies. They're underinsured
because nobody reads a 40-page policy document. Claims get rejected and go
uncontested. Credit cards bundle in accident and travel cover that is never
claimed. And none of it is accessible at the moment it actually matters.

BimaSetu reads the documents for you and answers questions in plain language.

---

## What it does

| Feature | What happens |
|---|---|
| **Policy parsing** | Upload a policy PDF. Document AI extracts the text, Gemini structures it into sum insured, room-rent caps, co-pay, exclusions, waiting periods and covered procedures. |
| **Card insurance discovery** | Name a credit card and the AI surfaces the complimentary cover attached to it — air accident, personal accident, purchase protection, travel, lost-card liability. |
| **AI assistant** | Ask coverage questions in natural language. Answers are grounded in *your* parsed policy and cards, with a confidence indicator. Conversations persist and can be reopened. |
| **Claim analysis** | Paste a rejection reason and get a verdict on whether it's contestable, the arguments in your favour, regulatory references, next steps, and a ready-to-send grievance letter. |
| **Expiry & waiting-period alerts** | Computed from today's date on every load — an expired policy says *expired*, and waiting periods count down to the date you're actually covered. |
| **Emergency contacts** | Contacts to be notified with your location if emergency mode is triggered. |
| **WhatsApp companion** | The same assistant over WhatsApp, matched to your account by phone number, with nearest-cashless-hospital lookup and an emergency flow. |

---

## Architecture

Everything runs on Google Cloud as a single Cloud Run service. There are no
microservices — all AI and data logic lives in Next.js API routes.

```
Browser ──► Cloud Run (Next.js 14, standalone)
               │
               ├─ Firebase Auth / Identity Platform ──► httpOnly session cookie
               ├─ Firestore (Admin SDK, server-mediated — no client SDK writes)
               ├─ Cloud Storage  ── policy PDFs
               ├─ Document AI    ── PDF → text
               └─ Vertex AI      ── Gemini, structured extraction + Q&A

WhatsApp ──► Twilio ──► /api/whatsapp/webhook ──► same Firestore + Vertex AI
```

**Why server-mediated Firestore:** the browser never touches Firestore or Cloud
Storage directly. Every read and write goes through an API route that verifies
the session cookie and checks document ownership. This keeps one authorization
model for both the web app and the WhatsApp channel, which has no browser
session to check rules against.

### Stack

- **Next.js 14** (App Router, TypeScript, `output: standalone`)
- **Tailwind CSS**, Radix primitives, Material Symbols
- **Firebase Auth** (Identity Platform) — email/password, session-cookie bridge
- **Firestore** (Native, `us-central1`) via Firebase Admin SDK
- **Cloud Storage** — private bucket, uniform access, public access prevention
- **Document AI** — OCR processor (`us` multi-region)
- **Vertex AI** — `gemini-2.5-flash-lite` via `@google/genai`
- **Cloud Run + Cloud Build + Artifact Registry**
- **Twilio** — WhatsApp channel

---

## Key implementation notes

**Parsing is triggered by the browser, not the server.** Cloud Run throttles
instance CPU to near zero once a response is returned, so a fire-and-forget
background task never runs. After upload the client calls `/api/policy-parser`
itself, which keeps a real request open for the duration of the work.

**Build-time vs runtime config is deliberate.** `NEXT_PUBLIC_*` values are
inlined into the client bundle by `next build` and so must be passed as Docker
build args. Everything else — project id, bucket, Document AI, Twilio
credentials — is read server-side at runtime and never baked into the image.
The WhatsApp config route sets `dynamic = "force-dynamic"` so it isn't
prerendered with build-time values.

**Phone numbers are canonicalised to `+<digits>`** and a country code is
mandatory. WhatsApp identifies senders in full international form, so a number
stored without one can never match an inbound message.

---

## Running locally

```bash
npm install
cp .env.example .env.local     # then fill in the values
gcloud auth application-default login
npm run dev
```

Application Default Credentials are enough for local development — Vertex AI,
Firestore, Cloud Storage and Document AI all authenticate off them, and
`createSessionCookie` works without a service-account key. On Cloud Run the
attached service account is used instead.

See `.env.example` for the full variable list.

## Deploying

```bash
gcloud builds submit --config cloudbuild.yaml --region=us-central1 \
  --substitutions=_FIREBASE_API_KEY=...,_FIREBASE_AUTH_DOMAIN=...,_FIREBASE_PROJECT_ID=...

gcloud run deploy bimasetu --region=us-central1 \
  --image=us-central1-docker.pkg.dev/<project>/bimasetu/app:latest
```

---

## Status

**Working and verified in production:** authentication, profile setup, policy
upload and AI parsing, card insurance discovery, the AI assistant with
persistent history, claim analysis, and date-aware alerts.

**WhatsApp:** the integration is complete and the webhook has been verified
end-to-end — it matches an inbound number to a profile and answers from that
user's parsed policy. Live delivery is currently blocked on Twilio's Trust Hub
compliance approval, which is an account-level review outside the application.

**Known limitations**

- Document AI's synchronous API caps out around 15-30 pages; longer documents
  would need `batchProcessDocuments`.
- If the browser tab is closed mid-parse, a policy stays in `parsing` — there is
  no retry mechanism yet.
- Twilio webhook signature validation is not yet enabled.
- The hospital dataset and card knowledge base are seed data, not exhaustive.
