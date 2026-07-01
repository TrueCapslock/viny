// Server-side wrapper around the OpenRouter chat-completions API for
// the v0.12.0 photo-identification flow. The user's saved OpenRouter
// key is fetched from the User row by the /api/ocr-vision route and
// passed in here; the key never reaches the browser.
//
// We POST a base64 data URL to the standard OpenAI-compatible
// /api/v1/chat/completions endpoint with a directive OCR prompt. The
// response text is meant to be a near-clean multi-line transcription
// of the label -- the client then runs it through `buildSearchQuery`
// to assemble the final wineapi.io search query.

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

/// Directive OCR prompt. Asks the model to behave as an OCR engine and
/// emit ONLY the raw text on the label, one line per visual line. We
/// don't trust the output to be 100% clean (some models still add
/// intro lines like "Here is the text:") so the client passes the
/// result through `buildSearchQuery` which has a small-print regex to
/// drop commentary.
const OCR_PROMPT = `You are an OCR engine. Read the text visible on this wine or beer bottle label.

Output rules:
- Output ONLY the raw text visible on the label.
- One line per visual line of the label, preserving the original line breaks.
- Do not add commentary, explanations, translations, formatting, or markdown.
- Do not write "Here is the text:" or similar intro lines.
- If a character is partially obscured, do your best to read it.
- Preserve the original language (English, Norwegian Bokm\u00e5l, French, Italian, German, etc.).

Output the text now.`

/**
 * Call the OpenRouter chat-completions API with an image+text message
 * and return the model's text content. Throws on HTTP error or if
 * the response shape is unexpected. Caller is expected to fetch the
 * user's saved OpenRouter key and the configured vision model.
 */
export async function recognizeWithOpenRouter(
  apiKey: string,
  model: string,
  imageBuffer: Buffer | ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<string> {
  // Build the data URL from the bytes. The lib accepts the three most
  // common Node / browser byte types so the route can hand off
  // whatever it has without an extra copy.
  let base64: string
  if (Buffer.isBuffer(imageBuffer)) {
    base64 = imageBuffer.toString("base64")
  } else if (imageBuffer instanceof ArrayBuffer) {
    base64 = Buffer.from(imageBuffer).toString("base64")
  } else {
    base64 = Buffer.from(imageBuffer).toString("base64")
  }
  const dataUrl = `data:${contentType};base64,${base64}`

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    // Surface the upstream body in the error so the client can
    // display something useful (rate-limit message, auth error, etc.)
    const body = await res.text().catch(() => "")
    const suffix = body ? `: ${body.slice(0, 300)}` : ""
    throw new Error(
      `OpenRouter ${res.status} ${res.statusText}${suffix}`,
    )
  }

  const data: unknown = await res.json()
  // OpenRouter's chat-completions response shape: choices is an array
  // of { message: { content: <string> } } objects. We type-narrow
  // with optional chaining and check `typeof text === "string"` to
  // reject unexpected shapes without throwing.
  const text = (data as { choices?: { message?: { content?: unknown } }[] })
    ?.choices?.[0]?.message?.content
  if (typeof text !== "string" || text.length === 0) {
    throw new Error("OpenRouter returned an empty or unexpected response")
  }
  return text
}
