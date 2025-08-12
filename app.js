
async function api(path, opts={}){
  opts.headers = opts.headers || {};
  opts.headers['Content-Type'] = 'application/json';
  if(opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(path, opts);
  if(!res.ok){ const t = await res.text(); alert('Error: '+t); throw new Error(t); }
  return res.json();
}

async function adminLogin(){
  const username = document.getElementById('adminUser').value;
  const password = document.getElementById('adminPass').value;
  try{ await api('/admin/login', { method:'POST', body:{ username, password }}); localStorage.setItem('bl_user', JSON.stringify({ role:'admin', username })); location.href='/admin.html'; }catch(e){ console.error(e); }
}

async function agentSignup(){
  const username = document.getElementById('agentUser').value;
  const password = document.getElementById('agentPass').value;
  const name = document.getElementById('agentName').value;
  await api('/agent/signup', { method:'POST', body:{ username, password, name }});
  alert('Signup requested. Wait for admin approval.');
}

async function agentLogin(){
  const username = document.getElementById('agentUser').value;
  const password = document.getElementById('agentPass').value;
  try{
    const r = await api('/agent/login', { method:'POST', body:{ username, password }});
    localStorage.setItem('bl_user', JSON.stringify({ role:'agent', username }));
    location.href='/agent.html';
  }catch(e){ alert('Login failed or not approved yet'); }
}
