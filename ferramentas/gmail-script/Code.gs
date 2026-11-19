/**
 * Fluxo Caixa · ligação com o Gmail (Google Apps Script)
 *
 * Roda dentro da conta Google do usuário. Publicado como "App da Web", responde em JSON com os e-mails da
 * Caixa (@caixa.gov.br) que chegaram: convocação de O.S. (com o .txt da O.S. dentro), PEPT resolvida,
 * cancelamento, prazo. O Fluxo Caixa chama este endereço ao abrir e a cada 5 minutos.
 *
 * Como publicar (uma vez):
 *   1. script.google.com → Novo projeto (na conta que RECEBE os e-mails da Caixa) → cole este arquivo inteiro.
 *   2. Executar › mostrarSenha → Autorizar (o Google pede permissão para ler o Gmail) → a senha aparece no registro.
 *      A senha é criada sozinha e fica guardada no próprio script (Propriedades do script), nunca no código.
 *   3. Implantar → Nova implantação → tipo "App da Web" → Executar como "Eu" → Quem pode acessar "Qualquer pessoa".
 *   4. No Fluxo Caixa: Configurações › Gmail → colar o endereço "/exec" e a senha (ou Dados/gmail.json).
 *
 * Só leitura: não marca como lido, não move, não responde nada.
 */

// Senha que o sistema manda junto com o pedido: criada na primeira vez e guardada nas Propriedades do script.
function senha() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('TOKEN');
  if (!s) { s = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); props.setProperty('TOKEN', s); }
  return s;
}

/** Executar no editor para ver (e criar, na primeira vez) a senha que vai em Configurações › Gmail. */
function mostrarSenha() {
  Logger.log('Senha do Fluxo Caixa: ' + senha());
}

// Quantos dias para trás buscar quando o sistema não diz desde quando (primeira vez): os últimos 10 dias.
var DIAS_PADRAO = 10;

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.token || p.token !== senha()) return responder({ ok: false, erro: 'Token inválido.' });
  try {
    var desde = Number(p.desde); // segundos desde 1970 (after: do Gmail)
    if (!desde || isNaN(desde)) desde = Math.floor(Date.now() / 1000) - DIAS_PADRAO * 24 * 3600;
    var emails = buscarEmailsDaCaixa(desde);
    return responder({ ok: true, agora: new Date().toISOString(), total: emails.length, emails: emails });
  } catch (err) {
    return responder({ ok: false, erro: String(err && err.message ? err.message : err) });
  }
}

/** E-mails de @caixa.gov.br recebidos desde `desde` (segundos), no formato que o Fluxo Caixa importa. */
function buscarEmailsDaCaixa(desde) {
  var consulta = 'from:caixa.gov.br after:' + desde + ' -in:sent -in:trash';
  var threads = GmailApp.search(consulta, 0, 200);
  var saida = [];
  threads.forEach(function (t) {
    t.getMessages().forEach(function (m) {
      var de = String(m.getFrom() || '');
      if (!/@caixa(\.[a-z]+)*\s*>?\s*$/i.test(de)) return; // só o que a Caixa mandou (encaminhamentos ficam de fora)
      if (m.getDate().getTime() / 1000 < desde) return;
      saida.push(montarEmail(m));
    });
  });
  saida.sort(function (a, b) { return b.recebidoEm < a.recebidoEm ? -1 : b.recebidoEm > a.recebidoEm ? 1 : 0; });
  return saida;
}

function montarEmail(m) {
  var rem = lerRemetente(m.getFrom());
  var email = {
    id: 'gm-' + m.getId(),
    de: rem.de,
    nome: rem.nome,
    assunto: String(m.getSubject() || ''),
    corpo: limparCorpo(m.getPlainBody()),
    recebidoEm: m.getDate().toISOString(),
    lido: false,
  };
  var anexo = anexoTxt(m);
  if (anexo) email.anexo = anexo;
  return email;
}

/** "Nome <endereco>" → { de, nome } (sem nome, usa a parte antes do @, ex.: AG2976). */
function lerRemetente(v) {
  var s = String(v || '');
  var m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  var de = (m ? m[2] : s).trim().toLowerCase();
  var nome = (m ? m[1] : '').trim() || de.split('@')[0].toUpperCase();
  return { de: de, nome: nome };
}

function limparCorpo(texto) {
  return String(texto || '').replace(/\r\n/g, '\n').replace(/\u0000+/g, '').split('\n').map(function (l) { return l.replace(/[ \t]+$/g, ''); }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * O .txt da O.S. (CONVOCACAO PRESTACAO SERVICO.TXT). A Caixa manda como parte TEXT/PLAIN com
 * Content-Disposition: attachment; o Gmail costuma devolvê-la em getAttachments(). Se não vier, lê o bruto.
 */
function anexoTxt(m) {
  var atts = m.getAttachments({ includeInlineImages: false, includeAttachments: true }) || [];
  for (var i = 0; i < atts.length; i++) {
    var a = atts[i];
    var nome = String(a.getName() || '');
    var tipo = String(a.getContentType() || '').toLowerCase();
    if (/\.txt$/i.test(nome) || tipo.indexOf('text/plain') === 0) {
      return { nome: nome || 'anexo.txt', texto: limparTxt(a.getDataAsString('UTF-8')) };
    }
  }
  // ler o e-mail bruto é lento: só vale a pena quando é uma convocação de O.S. sem anexo reconhecido
  if (!/convoca/i.test(String(m.getSubject() || ''))) return null;
  return anexoDoBruto(m.getRawContent());
}

/** Plano B: acha a parte "CONTENT-DISPOSITION: ATTACHMENT" no e-mail bruto e devolve o texto dela. */
function anexoDoBruto(raw) {
  var s = String(raw || '');
  var mb = s.match(/boundary="?([^"\r\n;]+)"?/i);
  if (!mb) return null;
  var partes = s.split('--' + mb[1]);
  for (var i = 1; i < partes.length; i++) {
    var p = partes[i];
    if (!/content-disposition:\s*attachment/i.test(p)) continue;
    var nomeM = p.match(/filename="?([^"\r\n]+)"?/i);
    var corte = p.search(/\r?\n\r?\n/);
    var conteudo = corte < 0 ? '' : p.slice(corte).replace(/^\r?\n\r?\n/, '');
    if (/content-transfer-encoding:\s*base64/i.test(p)) conteudo = Utilities.newBlob(Utilities.base64Decode(conteudo.replace(/\s+/g, ''))).getDataAsString('UTF-8');
    return { nome: nomeM ? nomeM[1].trim() : 'anexo.txt', texto: limparTxt(conteudo) };
  }
  return null;
}

function limparTxt(t) {
  return String(t || '').replace(/\r\n/g, '\n').replace(/\u0000+/g, '').replace(/\n$/, '');
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Para testar dentro do editor: Executar › testar (veja o registro). */
function testar() {
  var r = buscarEmailsDaCaixa(Math.floor(Date.now() / 1000) - DIAS_PADRAO * 24 * 3600);
  Logger.log(r.length + ' e-mail(s) da Caixa nos últimos ' + DIAS_PADRAO + ' dias');
  r.slice(0, 5).forEach(function (e) { Logger.log(e.recebidoEm + ' · ' + e.de + ' · ' + e.assunto + (e.anexo ? ' · .txt com ' + e.anexo.texto.length + ' caracteres' : '')); });
}
