// Assemble src/ en un seul fichier : styles, script, polices et médias intégrés.
// Sans argument, écrit ../../v8/index.html ; un chemin en argument écrit ailleurs, pour un essai.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = dirname(fileURLToPath(import.meta.url))
const lire = (chemin) => readFile(resolve(racine, chemin), 'utf8')

async function policesIntegrees() {
  const morceaux = (await lire('src/polices.css')).split(/(url\("\.\.\/polices\/[^"]+"\))/)
  const integres = await Promise.all(morceaux.map(async (morceau) => {
    const fichier = morceau.match(/^url\("\.\.\/(polices\/[^"]+)"\)$/)?.[1]
    if (!fichier) return morceau
    const octets = await readFile(resolve(racine, fichier))
    return `url("data:font/woff2;base64,${octets.toString('base64')}")`
  }))
  return integres.join('')
}

const TYPES_MEDIAS = { mp4: 'video/mp4', webm: 'video/webm', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
async function mediasIntegres(html) {
  let resultat = html
  for (const chemin of new Set(html.match(/(?<=src=")medias\/[^"]+/g) || [])) {
    const type = TYPES_MEDIAS[chemin.split('.').pop().toLowerCase()]
    if (!type) throw new Error(`Type de média non pris en charge : ${chemin}`)
    const octets = await readFile(resolve(racine, 'src', chemin))
    resultat = resultat.replaceAll(`src="${chemin}"`, `src="data:${type};base64,${octets.toString('base64')}"`)
  }
  return resultat
}

const [gabarit, polices, css, script] = await Promise.all([
  lire('src/index.html'), policesIntegrees(), lire('src/style.css'), lire('src/app.js'),
])

// Contrôle éditorial facultatif : mots-exclus.local (non versionné), un mot par ligne.
const fichierExclus = resolve(racine, 'mots-exclus.local')
if (existsSync(fichierExclus)) {
  const mots = (await readFile(fichierExclus, 'utf8')).split(/\r?\n/).map((m) => m.trim()).filter(Boolean)
  for (const mot of mots) {
    const motif = new RegExp(`(?<!\\p{L})${mot}(?!\\p{L})`, 'iu')
    if ([gabarit, css, script].some((t) => motif.test(t))) throw new Error(`Mot exclu présent dans la page : ${mot}`)
  }
}

const page = (await mediasIntegres(gabarit))
  .replace('<link rel="stylesheet" href="polices.css">', () => `<style>${polices}</style>`)
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}</style>`)
  .replace('<script src="app.js"></script>', () => `<script>\n${script}</script>`)

const sortie = process.argv[2] ? resolve(process.argv[2]) : resolve(racine, '../../v8/index.html')
await mkdir(dirname(sortie), { recursive: true })
await writeFile(sortie, page)
const nombre = (page.match(/<section class="scene/g) || []).length
console.log(`${sortie} : ${nombre} écrans, ${Math.round(Buffer.byteLength(page) / 1024)} ko`)
