/**
 * Reset-password email template.
 *
 * Pure render function — no I/O, no Resend, no env reads. The caller
 * (the API route, or the dev preview page) supplies the inputs and
 * gets back `{ subject, text, html }` ready to send or render.
 *
 * Extracted from src/app/api/forgot-password/route.ts so the dev
 * preview at /dev/emails can render the same template with sample
 * data and the Playwright snapshot test can pin its visual output.
 */

export interface ResetPasswordInput {
  /** Absolute URL the user clicks to open the password-reset form. */
  resetUrl: string
}

export interface RenderedEmail {
  subject: string
  text: string
  html: string
}

/** Stable id used for the preview-page anchor and the snapshot filename. */
export const RESET_PASSWORD_TEMPLATE_ID = "reset-password" as const

const SUBJECT = "Tilbakestill passordet ditt på Uva"

function buildText(resetUrl: string): string {
  return (
    `Hei!\n\n` +
    `Vi har mottatt en forespørsel om å tilbakestille passordet ditt på Uva.\n` +
    `Klikk på lenken under for å velge et nytt passord:\n\n` +
    `${resetUrl}\n\n` +
    `Lenken er gyldig i 24 timer. Hvis du ikke har bedt om dette, kan du\n` +
    `ignorere e-posten – passordet ditt blir ikke endret.\n\n` +
    `– Uva`
  )
}

function buildHtml(resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #fca5a5 0%, #fecaca 100%); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #7f1d1d; font-size: 20px; font-weight: 600;">Uva</h1>
      </div>
      <div style="background: #fff; padding: 28px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.5;">
          Hei! Vi har mottatt en forespørsel om å tilbakestille passordet ditt.
        </p>
        <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5;">
          Klikk på knappen under for å velge et nytt passord:
        </p>
        <p style="margin: 0 0 24px; text-align: center;">
          <a href="${resetUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #fca5a5 0%, #fecaca 100%); color: #7f1d1d; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-size: 15px; font-weight: 600;">
            Tilbakestill passord
          </a>
        </p>
        <p style="margin: 0 0 8px; font-size: 13px; line-height: 1.5; color: #6b7280;">
          Lenken er gyldig i 24 timer. Hvis knappen ikke virker, kopier URL-en under
          inn i nettleseren din:
        </p>
        <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #6b7280;">
          ${resetUrl}
        </p>
        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
          Hvis du ikke har bedt om dette, kan du ignorere e-posten – passordet ditt
          blir ikke endret.
        </p>
      </div>
    </div>
  `
}

export function renderResetPassword(input: ResetPasswordInput): RenderedEmail {
  return {
    subject: SUBJECT,
    text: buildText(input.resetUrl),
    html: buildHtml(input.resetUrl),
  }
}
