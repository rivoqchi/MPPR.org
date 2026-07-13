import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uz = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/shared/lib/locales/uz.json'), 'utf8'),
)

function latinToCyrillic(text) {
  if (typeof text !== 'string') return text

  let s = text
  const placeholders = []

  s = s.replace(/\{\{[^}]+\}\}/g, (match) => {
    placeholders.push(match)
    return `\u0000PH${placeholders.length - 1}\u0000`
  })

  s = s.replace(/`npx prisma migrate deploy`/g, '\u0000CMD\u0000')

  const multi = [
    ['sh', 'ш'],
    ['ch', 'ч'],
    ["o'", 'ў'],
    ["O'", 'Ў'],
    ["g'", 'ғ'],
    ["G'", 'Ғ'],
    ['oʻ', 'ў'],
    ['Oʻ', 'Ў'],
    ['gʻ', 'ғ'],
    ['Gʻ', 'Ғ'],
    ['ʼ', 'ъ'],
    ['’', 'ъ'],
    ["'", 'ъ'],
  ]

  for (const [from, to] of multi) {
    s = s.split(from).join(to)
  }

  const map = {
    a: 'а',
    b: 'б',
    c: 'с',
    d: 'д',
    e: 'е',
    f: 'ф',
    g: 'г',
    h: 'ҳ',
    i: 'и',
    j: 'ж',
    k: 'к',
    l: 'л',
    m: 'м',
    n: 'н',
    o: 'о',
    p: 'п',
    q: 'қ',
    r: 'р',
    s: 'с',
    t: 'т',
    u: 'у',
    v: 'в',
    w: 'в',
    x: 'х',
    y: 'й',
    z: 'з',
    A: 'А',
    B: 'Б',
    C: 'С',
    D: 'Д',
    E: 'Е',
    F: 'Ф',
    G: 'Г',
    H: 'Ҳ',
    I: 'И',
    J: 'Ж',
    K: 'К',
    L: 'Л',
    M: 'М',
    N: 'Н',
    O: 'О',
    P: 'П',
    Q: 'Қ',
    R: 'Р',
    S: 'С',
    T: 'Т',
    U: 'У',
    V: 'В',
    W: 'В',
    X: 'Х',
    Y: 'Й',
    Z: 'З',
  }

  let out = ''
  for (const ch of s) {
    out += map[ch] ?? ch
  }

  out = out.replace(/\u0000CMD\u0000/g, '`npx prisma migrate deploy`')
  out = out.replace(/\u0000PH(\d+)\u0000/g, (_, index) => placeholders[Number(index)])

  return out
}

function walk(value) {
  if (typeof value === 'string') return latinToCyrillic(value)
  if (Array.isArray(value)) return value.map(walk)

  const result = {}
  for (const [key, nested] of Object.entries(value)) {
    result[key] = walk(nested)
  }
  return result
}

const cyrl = walk(uz)
const outputPath = path.join(__dirname, '../src/shared/lib/locales/uz-cyrl.json')
fs.writeFileSync(outputPath, `${JSON.stringify(cyrl, null, 2)}\n`, 'utf8')
console.log(`Wrote ${outputPath}`)
