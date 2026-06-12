import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu

function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(jsx|js)$/.test(f)) {
      const lines = readFileSync(p, 'utf8').split('\n')
      lines.forEach((l, i) => {
        const m = l.match(emojiRe)
        if (m) console.log(`${p}:${i + 1} [${m.join(' ')}] ${l.trim().slice(0, 100)}`)
      })
    }
  }
}
walk('src')
