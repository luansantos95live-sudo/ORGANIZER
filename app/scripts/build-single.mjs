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

// 4) Sistema local COM as O.S. reais (12/11/2026): se existir ../Dados/os-reais.json (backup só com O.S., gerado por
// scripts/importar-pastas.ts), grava ../Dados/Fluxo_Caixa.html, que o atalho abre. Na primeira abertura (ou enquanto o
// navegador só tiver as O.S. de exemplo, ids "os-N") ele coloca as O.S. reais no lugar; depois disso o que o usuário mexer
// fica salvo e nunca é sobrescrito. A pasta Dados está no .gitignore (dados reais de clientes não vão para o repositório).
const reais = path.resolve('..', 'Dados', 'os-reais.json')
if (fs.existsSync(reais)) {
  const os = JSON.parse(fs.readFileSync(reais, 'utf8')).os ?? []
  const id = `${os.length}-${fs.statSync(reais).mtimeMs.toFixed(0)}`
  // Atualizações (ex.: PEPTs registradas dos prints, scripts/aplicar-pepts.ts): cada uma entra uma vez, só em O.S. sem PEPT.
  const arqAtual = path.resolve('..', 'Dados', 'atualizacoes.json')
  const atualizacoes = fs.existsSync(arqAtual) ? JSON.parse(fs.readFileSync(arqAtual, 'utf8')) : []
  // Ligação do Gmail (endereço do script e senha): fica em Dados/gmail.json, fora do repositório.
  const arqGmail = path.resolve('..', 'Dados', 'gmail.json')
  const gmail = fs.existsSync(arqGmail) ? JSON.parse(fs.readFileSync(arqGmail, 'utf8')) : null
  // Dados da empresa, contrato e perfis (12/11): Dados/config.json, fora do repositório; entram uma vez e só nos campos vazios.
  const arqConfig = path.resolve('..', 'Dados', 'config.json')
  const cfgReal = fs.existsSync(arqConfig) ? JSON.parse(fs.readFileSync(arqConfig, 'utf8')) : null
  const semente = `<script>(function(){var ID=${JSON.stringify(id)},K='fluxocaixa-v3',M='fluxocaixa-reais';try{
var a=JSON.parse(localStorage.getItem(K)||'null'),os=a&&a.state&&a.state.os;
var exemplo=!os||!os.length||os.every(function(o){return /^os-[0-9]+$/.test(o.id)});
if(exemplo&&localStorage.getItem(M)!==ID){a=a||{state:{},version:0};a.state=a.state||{};a.state.os=${JSON.stringify(os).replace(/<\//g, '<\/')};a.state.rotas=[];a.state.fechamentos={};
localStorage.setItem(K,JSON.stringify(a));localStorage.setItem(M,ID)}
a=JSON.parse(localStorage.getItem(K)||'null')||{state:{},version:0};a.state=a.state||{};
// produção: sem os e-mails de teste (ids "em-…"); só ficam os que vierem do Gmail
a.state.emails=(a.state.emails||[]).filter(function(e){return !/^em-/.test(e.id)});
// ligação do Gmail guardada em Dados/gmail.json (pasta compartilhada no OneDrive): vale em qualquer PC, se ainda não houver
var G=${JSON.stringify(gmail)};if(G&&G.url){a.state.config=a.state.config||{};var g=a.state.config.gmail||{};if(!g.url){g={url:G.url,token:G.token||'',criarOs:!!G.criarOs}}
// regras de produção (12/11): data de corte (e-mails antes dela só ficam para consulta) e polos da O.S. automática; entram uma vez
if(G.ativoDesde&&!g.ativoDesde){g.ativoDesde=G.ativoDesde;g.polos=G.polos||[];g.criarOs=!!G.criarOs}a.state.config.gmail=g}
var C=${JSON.stringify(cfgReal).replace(/<\//g, '<\/')};if(C&&localStorage.getItem('fluxocaixa-config-real')!==C.id){var cf=a.state.config=a.state.config||{};
var enche=function(dst,src){for(var k in src){if(k==='id')continue;var v=src[k];if(v&&typeof v==='object'){dst[k]=dst[k]||{};enche(dst[k],v)}else if(dst[k]==null||dst[k]===''||(k==='nome'&&(dst[k]==='Luan'||dst[k]==='Marco (RT)')))dst[k]=v}};
enche(cf,C);localStorage.setItem('fluxocaixa-config-real',C.id)}
localStorage.setItem(K,JSON.stringify(a));
var U=${JSON.stringify(atualizacoes).replace(/<\//g, '<\/')},F='fluxocaixa-atualizacoes',feitas=JSON.parse(localStorage.getItem(F)||'[]'),mudou=false;
a=JSON.parse(localStorage.getItem(K)||'null');var lista=a&&a.state&&a.state.os||[];
U.forEach(function(u){if(feitas.indexOf(u.id)>=0)return;feitas.push(u.id);
if(u.novasRecentes){var cand=lista.filter(function(x){return !/^pasta-/.test(x.id)&&!/^os-[0-9]+$/.test(x.id)&&x.status!=='cancelada'}).sort(function(x,y){return ((y.historico&&y.historico[0]&&y.historico[0].data)||'').localeCompare((x.historico&&x.historico[0]&&x.historico[0].data)||'')}).slice(0,u.novasRecentes);cand.forEach(function(x){x.nova=true});mudou=mudou||cand.length>0;return}
if(u.emailsNaoLidosDesde){(a.state.emails||[]).forEach(function(e){if(e.importadaId&&e.recebidoEm>=u.emailsNaoLidosDesde)e.lido=false});mudou=true;return}
if(u.rota){var R=u.rota,ps=[];R.paradas.forEach(function(q){var x=lista.filter(function(y){return y.referencia===q.ref})[0];if(!x)return;if(q.lat!=null){x.endereco=x.endereco||{};x.endereco.lat=q.lat;x.endereco.lng=q.lng}ps.push({osId:x.id,hora:q.hora})});
a.state.rotas=(a.state.rotas||[]).filter(function(r){return r.id!==R.id&&!(r.status==='rascunho'&&r.descricao==='Sugestão com as O.S. em aberto')});
a.state.rotas.unshift({id:R.id,codigo:R.codigo,responsavel:'luan',status:'rascunho',data:R.data,hora:R.hora,partida:R.partida,velocidadeMedia:R.velocidadeMedia||60,descricao:R.descricao,paradas:ps,ordemManual:true});
if(R.duracaoVistoria){a.state.config=a.state.config||{};a.state.config.duracaoVistoria=R.duracaoVistoria}mudou=true;return}
if(u.configForcar){a.state.config=a.state.config||{};for(var cc in u.configForcar)a.state.config[cc]=u.configForcar[cc];mudou=true;return}
if(u.removerResp){var n=lista.length;lista=a.state.os=lista.filter(function(x){return x.responsavel!==u.removerResp});mudou=mudou||n!==lista.length;return}
var o=lista.filter(function(x){return u.ref?x.referencia===u.ref:x.id===u.osId})[0];
if(!o||(!u.forcar&&o.pepts&&o.pepts.length))return;for(var c in u.campos){if(u.campos[c]===null)delete o[c];else o[c]=u.campos[c]}mudou=true});
if(mudou)localStorage.setItem(K,JSON.stringify(a));localStorage.setItem(F,JSON.stringify(feitas))}catch(e){}})()</script>`
  // Amostragens reais (18/11/2026): Dados/amostragens-reais.json (montado dos modelos SisDEA das O.S. e do banco LFX).
  // Cada amostragem entra uma vez só (ids guardados em "fluxocaixa-amostragens-reais"): se o usuário editar ou excluir,
  // a próxima abertura não sobrescreve nem traz de volta. Nada das amostragens já cadastradas é mexido.
  const arqAmostras = path.resolve('..', 'Dados', 'amostragens-reais.json')
  const amostrasReais = fs.existsSync(arqAmostras) ? JSON.parse(fs.readFileSync(arqAmostras, 'utf8')).amostras ?? [] : []
  const sementeAmostras = amostrasReais.length
    ? `<script>(function(){var K='fluxocaixa-amostragens',M='fluxocaixa-amostragens-reais';try{
var L=${JSON.stringify(amostrasReais).replace(/<\//g, '<\/')};
var a=JSON.parse(localStorage.getItem(K)||'null')||{state:{amostras:[]},version:1};a.state=a.state||{};var lista=a.state.amostras=a.state.amostras||[];
var feitas=JSON.parse(localStorage.getItem(M)||'[]'),novas=0;
L.forEach(function(x){if(feitas.indexOf(x.id)>=0)return;feitas.push(x.id);if(lista.some(function(y){return y.id===x.id}))return;lista.push(x);novas++});
if(novas)localStorage.setItem(K,JSON.stringify(a));localStorage.setItem(M,JSON.stringify(feitas))}catch(e){}})()</script>`
    : ''
  const comReais = independente.replace('<div id="root"></div>', `${semente}
${sementeAmostras}
<div id="root"></div>`)
  fs.writeFileSync(path.resolve('..', 'Dados', 'Fluxo_Caixa.html'), comReais)
  console.log(`../Dados/Fluxo_Caixa.html (sistema local com ${os.length} O.S. reais) · ${(comReais.length / 1024).toFixed(0)} kB`)
}
