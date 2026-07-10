// One-off helper: replace every `\uXXXX` (4 hex digits) escape sequence
// in source files with the actual UTF-8 character. This is purely
// cosmetic -- the JS engine already interprets `ø` as `ø` -- but
// the escape form is hard to read and edit, and one bad double-
// escape (e.g. a future `"\ø"`) would surface as a literal
// `ø` in the UI. Normalising the source removes that footgun.
//
// Run from the project root:
//   node scripts/v0146-decode-escapes.mjs
//
// The script is idempotent: re-running it on already-decoded files
// is a no-op because there are no `\uXXXX` left to match.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const ROOTS = ["src", "e2e", "scripts"]
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"])

/** Recursively collect files with one of EXTS under the given dirs. */
function walk(root) {
  const out = []
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (name === "node_modules" || name === ".next") continue
        stack.push(full)
      } else if (st.isFile()) {
        const dot = name.lastIndexOf(".")
        if (dot >= 0 && EXTS.has(name.slice(dot))) out.push(full)
      }
    }
  }
  return out
}

const ESCAPE_RE = /\\u([0-9a-fA-F]{4})/g

let totalFiles = 0
let totalReplacements = 0
const changes = []

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const before = readFileSync(file, "utf8")
    let count = 0
    const after = before.replace(ESCAPE_RE, (_, hex) => {
      count++
      return String.fromCodePoint(parseInt(hex, 16))
    })
    if (count > 0) {
      writeFileSync(file, after, "utf8")
      totalFiles++
      totalReplacements += count
      changes.push({ file: relative(".", file), count })
    }
  }
}

console.log(`Updated ${totalFiles} files, ${totalReplacements} replacements.`)
for (const c of changes) console.log(`  ${c.count.toString().padStart(3)}  ${c.file}`)
