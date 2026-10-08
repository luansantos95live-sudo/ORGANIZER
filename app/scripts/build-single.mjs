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

const fontes = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`

// 1) Versão para publicar como Artifact: a plataforma já envolve a página com html, head e body.
const artefato = `<title>FluxoGestor Lab</title>
${fontes}
<style>${cssTxt}</style>
<div id="root"></div>
<script type="module">${jsTxt}</script>
`

// 2) Versão independente: abre direto no Chrome (arquivo ou site), com a codificação declarada.
const independente = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FluxoGestor Lab</title>
${fontes}
<style>${cssTxt}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${jsTxt}</script>
</body>
</html>
`
fs.mkdirSync('dist-single', { recursive: true })
fs.writeFileSync('dist-single/fluxogestor-lab.html', artefato)
fs.writeFileSync('dist-single/index.html', independente)
console.log(`dist-single/fluxogestor-lab.html (Artifact) · ${(artefato.length / 1024).toFixed(0)} kB`)
console.log(`dist-single/index.html (independente) · ${(independente.length / 1024).toFixed(0)} kB`)
