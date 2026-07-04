import { notFound } from "next/navigation"
import {
  renderResetPassword,
  RESET_PASSWORD_TEMPLATE_ID,
} from "@/emails/reset-password"

/**
 * Dev-only email-template preview.
 *
 * Renders every transactional email template the app sends, with
 * sample data, so visual changes can be reviewed in the browser
 * without configuring Resend or staging an SMTP catch.
 *
 * Guard: in production (NODE_ENV=production, which Vercel sets on
 * main + every preview branch), the page 404s unless
 * ENABLE_EMAIL_PREVIEW=1 is set explicitly. Local `npm run dev` runs
 * with NODE_ENV=development, so the page is reachable there by
 * default. This makes it usable on Vercel preview branches (just set
 * ENABLE_EMAIL_PREVIEW=1 in the branch's env) while keeping the
 * route inert on production deploys.
 *
 * Each template is wrapped in an <iframe srcDoc> rather than a plain
 * <div dangerouslySetInnerHTML> so the email's CSS cannot bleed into
 * the Next.js layout. The iframes are sandboxed (sandbox="") to
 * block any scripts the template might one day ship.
 *
 * The data-testid="email-<id>" attribute on the iframe is the hook
 * the Playwright snapshot test in e2e/emails.spec.ts uses to pin
 * each template's visual output.
 */

const SAMPLE_RESET_URL =
  "https://uva.example.com/reset-passord?token=sample-token-for-preview"

const TEMPLATES = [
  {
    id: RESET_PASSWORD_TEMPLATE_ID,
    label: "Tilbakestill passord (forgot-password)",
    render: () => renderResetPassword({ resetUrl: SAMPLE_RESET_URL }),
  },
] as const

export default function DevEmailsPage() {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.ENABLE_EMAIL_PREVIEW
  ) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-cream-50 px-6 py-10">
      <header className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold text-wine-900">
          Email templates
        </h1>
        <p className="mt-1 text-sm text-wine-700">
          Dev-only preview of every transactional email the app sends.
          Rendered with sample data — no Resend, no SMTP catch needed.
        </p>
        <p className="mt-1 text-xs text-wine-600">
          Production-gated: returns 404 unless{" "}
          <code className="rounded bg-wine-50 px-1 py-0.5 font-mono">
            ENABLE_EMAIL_PREVIEW=1
          </code>{" "}
          is set.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-3xl space-y-10">
        {TEMPLATES.map((t) => {
          const rendered = t.render()
          return (
            <section
              key={t.id}
              data-testid={`email-section-${t.id}`}
              className="rounded-xl border border-wine-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-wine-900">
                  {t.label}
                </h2>
                <span className="rounded-full bg-wine-50 px-2.5 py-0.5 font-mono text-xs text-wine-700">
                  {t.id}
                </span>
              </div>

              <iframe
                data-testid={`email-${t.id}`}
                srcDoc={rendered.html}
                sandbox=""
                title={t.label}
                style={{
                  width: 600,
                  height: 720,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  display: "block",
                  margin: "0 auto",
                }}
              />

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-wine-700">
                  Plain text
                </summary>
                <pre
                  data-testid={`email-text-${t.id}`}
                  className="mt-2 overflow-x-auto rounded-md bg-wine-50 p-3 text-xs text-wine-900"
                >
                  {rendered.text}
                </pre>
              </details>

              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-wine-700">
                  Subject
                </summary>
                <p
                  data-testid={`email-subject-${t.id}`}
                  className="mt-2 rounded-md bg-wine-50 px-3 py-2 text-sm text-wine-900"
                >
                  {rendered.subject}
                </p>
              </details>
            </section>
          )
        })}
      </div>
    </main>
  )
}
