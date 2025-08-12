// public/app.js - login & navigation helpers
async function api(path, opts={}) {
  opts.headers = opts.headers || {};
  opts.headers['Content-Type'] = 'application/json';
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(path, opts);
  if (!res.ok) {
    const t = await res.text().catch(()=>null);
    alert('Error: ' + (t || res.status));
    throw new Error(t || 'error');
  }
  return res.json();
}

async function adminLogin() {
  const username = document.getElementById('adminUser').value;
  const password = document.getElementById('adminPass').value;
  try {
    await api('/auth/login', { method: 'POST', body: { username, password } });
    localStorage.setItem('bl_user', JSON.stringify({ role: 'admin', username }));
    location.href = '/admin.html';
  } catch (e) {
    console.error(e);
  }
}

async function agentSignup() {
  const username = document.getElementById('agentUser').value;
  const password = document.getElementById('agentPass').value;
  const name = document.getElementById('agentName').value;
  await api('/auth/signup-agent', { method: 'POST', body: { username, password, name } });
  alert('Agent signup requested. Wait for admin approval (in demo, admin can approve via Admin UI).');
}

async function agentLogin() {
  const username = document.getElementById('agentUser').value;
  const password = document.getElementById('agentPass').value;
  try {
    const r = await api('/auth/login', { method: 'POST', body: { username, password } });
    // r.user contains role and username
    localStorage.setItem('bl_user', JSON.stringify(r.user));
    if (r.user.role === 'admin') location.href = '/admin.html'; else location.href = '/agent.html';
  } catch (e) {
    alert('Invalid credentials or not approved yet.');
  }
}
