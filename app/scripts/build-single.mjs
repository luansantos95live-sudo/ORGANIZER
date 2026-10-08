// Junta o resultado do `vite build` num único HTML (JS e CSS embutidos), no formato aceito para publicar como Artifact.
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const css = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1]
const js = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1]
if (!css || !js) throw new Error('Não achei o CSS ou o JS no dist/index.html. Rode `npm run build` antes.')

const ler = (ref) => fs.readFileSync(path.join(dist, ref.replace(/^\.?\//, '')), 'utf8')
const cssTxt = ler(css)
// </script e <!-- dentro do JS quebrariam a tag embutida; as barras invertidas mantêm o sentido em strings e regex.
const jsTxt = ler(js).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--')

const saida = `<title>FluxoGestor Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${cssTxt}</style>
<div id="root"></div>
<script type="module">${jsTxt}</script>
`
fs.mkdirSync('dist-single', { recursive: true })
fs.writeFileSync('dist-single/fluxogestor-lab.html', saida)
console.log(`dist-single/fluxogestor-lab.html · ${(saida.length / 1024).toFixed(0)} kB`)
