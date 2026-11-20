
const $ = (id) => document.getElementById(id);
const api = window.cobreAccount;
const TYPES = { desktop: 'Computador', mobile: 'Celular', tv: 'TV' };
let timer = null;

function ago(ts) {
  if (!ts) return 'nunca conectou';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'há instantes'; if (s < 3600) return 'há ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'há ' + Math.round(s / 3600) + ' h'; return 'há ' + Math.round(s / 86400) + ' dias';
}
function setLink(l) { const e = $('link'); e.textContent = l.text; e.style.color = l.ok ? 'var(--ok)' : 'var(--mu)'; }

async function drawDevices() {
  const r = await api.devices();
  if (!r.ok) { if (r.code === 'signed_out' || r.code === 'device_revoked') return render(); $('err2').textContent = r.error; return; }
  $('err2').textContent = '';
  const box = $('list'); box.textContent = '';
  for (const d of r.data) {
    const row = document.createElement('div'); row.className = 'dev';
    const dot = document.createElement('span'); dot.className = 'dot' + (d.online ? ' on' : '');
    const n = document.createElement('div'); n.className = 'n';
    const b = document.createElement('b'); b.textContent = d.name + (d.current ? ' (este)' : '');
    const s = document.createElement('span'); s.className = 'small mu';
    s.textContent = (TYPES[d.type] || d.type) + ' · ' + (d.online ? 'online' : 'offline, visto ' + ago(d.lastSeen));
    n.append(b, s); row.append(dot, n);
    if (!d.current) {
      const x = document.createElement('button'); x.textContent = 'Remover';
      x.onclick = async () => { if (confirm('Remover "' + d.name + '" da conta?')) { await api.remove(d.id); drawDevices(); } };
      row.append(x);
    }
    box.append(row);
  }
}

async function drawHostRequests() {
  const r = await api.hostRequests();
  if (!r.ok) {
    if (r.code === 'signed_out' || r.code === 'device_revoked') return render();
    $('host-request-list').textContent = r.error || 'Não foi possível consultar os pedidos.';
    return;
  }
  const box = $('host-request-list'); box.replaceChildren();
  if (!r.data.length) { box.textContent = 'Nenhum pedido pendente.'; return; }
  for (const request of r.data) {
    const row = document.createElement('div'); row.className = 'request';
    const detail = document.createElement('div');
    const name = document.createElement('b'); name.textContent = request.clientName || 'Aparelho sem nome';
    const type = document.createElement('span'); type.className = 'small mu'; type.textContent = `${TYPES[request.clientType] || request.clientType} · solicita acesso à biblioteca/áudio`;
    detail.append(name, type);
    const actions = document.createElement('div'); actions.className = 'request-actions';
    const approve = document.createElement('button'); approve.className = 'pri'; approve.textContent = 'Permitir';
    const deny = document.createElement('button'); deny.textContent = 'Recusar';
    const respond = async (allow) => {
      approve.disabled = deny.disabled = true;
      const result = allow ? await api.approveHostAccess(request.requestId) : await api.denyHostAccess(request.requestId);
      if (!result.ok) { $('host-request-list').textContent = result.error || 'Não foi possível responder ao pedido.'; await drawHostRequests(); return; }
      await drawHostRequests();
    };
    approve.onclick = () => respond(true); deny.onclick = () => respond(false);
    actions.append(approve, deny); row.append(detail, actions); box.append(row);
  }
}

async function render() {
  clearInterval(timer);
  const r = await api.status(); const s = r.data;
  const logged = r.ok && s.loggedIn;
  for (const id of ['out']) $(id).classList.toggle('hide', logged);
  for (const id of ['in', 'pair', 'host-requests', 'devs', 'outRow']) $(id).classList.toggle('hide', !logged);
  if (!logged) {
    if (r.ok) { $('email').value = s.email || ''; $('srv').value = s.server || s.defaultServer || 'http://localhost:8080'; }
    return;
  }
  $('me').textContent = s.email; $('srvTxt').textContent = s.server; setLink(s.link || { ok: false, text: '' });
  drawDevices(); drawHostRequests(); timer = setInterval(() => { drawDevices(); drawHostRequests(); }, 5000);
}

async function go(create) {
  $('err').textContent = ''; $('bin').disabled = $('bnew').disabled = true;
  const r = await api.login({ server: $('srv').value, email: $('email').value, password: $('pw').value, create });
  $('bin').disabled = $('bnew').disabled = false;
  if (!r.ok) {
    $('err').textContent = r.error + (r.code === 'network' ? ' Confira se o "Iniciar Cobre ID" está aberto e o endereço em "Avançado".' : '');
    if (r.code === 'network' || r.code === 'no_server' || r.code === 'bad_server') $('adv').open = true;
    return;
  }
  $('pw').value = '';
  // Logou: confirma rapidinho e fecha. A conexão continua em segundo plano.
  document.body.innerHTML = '<h1>Pronto!</h1><div class="mu" style="margin-top:8px">Você está conectado ao Cobre. Pode usar o app normalmente; este computador já aparece no seu celular.</div>';
  setTimeout(() => api.close(), 1800);
}
$('bin').onclick = () => go(false); $('bnew').onclick = () => go(true);
$('blater').onclick = () => api.close(); $('bnever').onclick = () => api.never();
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(false); });
$('bout').onclick = async () => { if (confirm('Sair desta conta neste computador?')) { await api.logout(); render(); } };
$('tvCode').addEventListener('input', (e) => { const v=e.target.value.replace(/[^a-z0-9]/gi,'').toUpperCase().slice(0,8); e.target.value=v.length>4?v.slice(0,4)+'-'+v.slice(4):v; });
$('tvApprove').onclick = async () => {
  $('pairErr').textContent=''; $('tvApprove').disabled=true;
  const r=await api.authorizeDevice($('tvCode').value);
  $('tvApprove').disabled=false;
  if(!r.ok){$('pairErr').textContent=r.error;return;}
  $('pairErr').style.color='var(--ok)'; $('pairErr').textContent='TV adicionada à Conta Cobre. O acesso à biblioteca do PC será ligado numa próxima etapa.';
  $('tvCode').value=''; drawDevices();
};
api.onLink(setLink);
render();
