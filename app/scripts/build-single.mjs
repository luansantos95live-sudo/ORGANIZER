// Junta o resultado do `vite build` num único HTML (JS e CSS embutidos).
// Gera o sistema local, igual ao FLUXO ARQ: ../dist/Fluxo_Caixa.html, aberto pelo atalho "Fluxo Caixa" no Chrome.
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

// Título e ícone. O Chrome usa o ícone PNG na janela de aplicativo e na barra de tarefas do Windows,
// por isso a logo vai em PNG (32 e 256 px, de ferramentas/gerar-icone.py) além do SVG da aba.
const fonte = fs.readFileSync('index.html', 'utf8')
const titulo = fonte.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Fluxo Caixa'
const png = (t) => {
  const arq = path.resolve('..', 'ferramentas', `fluxo-${t}.png`)
  return fs.existsSync(arq) ? `<link rel="icon" type="image/png" sizes="${t}x${t}" href="data:image/png;base64,${fs.readFileSync(arq).toString('base64')}">\n` : ''
}
const icone = png(256) + png(32) + (fonte.match(/<link rel="icon"[^>]*>/)?.[0] ?? '')

// Fonte Jost da internet, como no FLUXO ARQ; sem internet o sistema usa Segoe UI e continua funcionando.
const fontes = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Montserrat:wght@400;600&display=swap" rel="stylesheet">`

// 1) Versão para publicar como Artifact: a plataforma já envolve a página com html, head e body.
const artefato = `<title>${titulo}</title>
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
<title>${titulo}</title>
${icone}
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
// 3) O sistema local, na pasta do projeto (o atalho abre este arquivo).
const local = path.resolve('..', 'dist', 'Fluxo_Caixa.html')
fs.mkdirSync(path.dirname(local), { recursive: true })
fs.writeFileSync(local, independente)
console.log(`dist-single/fluxogestor-lab.html (Artifact) · ${(artefato.length / 1024).toFixed(0)} kB`)
console.log(`dist-single/index.html (independente) · ${(independente.length / 1024).toFixed(0)} kB`)
console.log(`../dist/Fluxo_Caixa.html (sistema local) · ${(independente.length / 1024).toFixed(0)} kB`)
