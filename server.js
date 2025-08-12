// server.js - Replit-ready Bank Ledger demo (SQLite)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ensure .data exists (Replit persists .data)
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// DB path inside .data for persistence
const dbPath = path.join(dataDir, 'internal.db');
const db = new sqlite3.Database(dbPath);

// initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    accountNumber TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    balance REAL DEFAULT 0,
    agentId TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    agentId TEXT,
    amount REAL,
    duration INTEGER,
    mode TEXT,
    frequency TEXT,
    installment REAL,
    interest_rate REAL,
    guarantor TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    amount REAL,
    type TEXT,
    created_at TEXT
  )`);

  // seed default admin if not exists
  db.get("SELECT COUNT(*) AS cnt FROM users WHERE role='admin'", (err, row) => {
    if (!err && row && row.cnt === 0) {
      const id = uuidv4();
      db.run("INSERT INTO users (id, username, password, role) VALUES (?,?,?,?)",
        [id, 'admin', 'admin123', 'admin']);
      console.log('Seeded admin -> username: admin password: admin123');
    }
  });
});

// --- Simple auth endpoints (demo-level, plaintext passwords for test)
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT id, username, role FROM users WHERE username=? AND password=?", [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(400).json({ error: 'invalid credentials' });
    res.json({ ok: true, user: row });
  });
});

// create agent user (signup) - agent needs admin approval (stored as user with role 'agent')
app.post('/auth/signup-agent', (req, res) => {
  const { username, password, name } = req.body;
  const id = uuidv4();
  db.run("INSERT INTO users (id, username, password, role) VALUES (?,?,?,?)", [id, username, password, 'agent'], function(err){
    if (err) return res.status(500).json({ error: err.message });
    // store agent record in users table actually covers role; admin will 'approve' by updating password/role back if needed in this demo flows.
    res.json({ ok: true, id, username });
  });
});

// Admin endpoints: list agents (we show users with role 'agent'), approve agent (set role to 'agent' - demo)
app.get('/admin/agents', (req,res) => {
  db.all("SELECT id, username, role FROM users WHERE role='agent' OR role='pending_agent'", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Admin approves agent - for this demo we just ensure they exist (no separate flag)
app.post('/admin/approve-agent', (req,res) => {
  const { username } = req.body;
  // in this simple demo we'll just respond ok (agents can be used immediately after sign up)
  res.json({ ok: true });
});

// Create customer (by agent or admin)
app.post('/customer', (req,res)=>{
  const { name, phone, agentId } = req.body;
  const id = uuidv4();
  const accountNumber = 'AC' + Math.floor(100000 + Math.random()*900000);
  db.run("INSERT INTO customers (id, accountNumber, name, phone, balance, agentId) VALUES (?,?,?,?,?,?)",
    [id, accountNumber, name, phone, 0, agentId || null], function(err){
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, customer: { id, accountNumber, name, phone, balance:0, agentId } });
    });
});

// List customers (admin: all, agent: filter by query param ?agentId=)
app.get('/customers', (req,res)=>{
  const agentId = req.query.agentId;
  if (agentId) {
    db.all("SELECT * FROM customers WHERE agentId=?", [agentId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    db.all("SELECT * FROM customers", [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});

// Transactions
app.post('/transaction', (req,res)=>{
  const { customerId, amount, type='deposit' } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.get("SELECT balance FROM customers WHERE id=?", [customerId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'customer not found' });
    const newBal = (row.balance || 0) + Number(amount);
    db.run("UPDATE customers SET balance=? WHERE id=?", [newBal, customerId], function(err){
      if (err) return res.status(500).json({ error: err.message });
      db.run("INSERT INTO transactions (id, customerId, amount, type, created_at) VALUES (?,?,?,?,?)", [id, customerId, amount, type, now]);
      res.json({ ok: true, balance: newBal });
    });
  });
});

// Loan apply (agent submits request)
app.post('/loan/apply', (req,res)=>{
  const { customerId, amount, duration, mode='fixed', frequency='daily', installment=0, interest_rate=0, guarantor } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(`INSERT INTO loans (id, customerId, agentId, amount, duration, mode, frequency, installment, interest_rate, guarantor, status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [id, customerId, null, amount, duration, mode, frequency, installment, interest_rate, guarantor, 'pending', now], function(err){
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, loanId: id });
    });
});

// Admin approve / reject loans
app.post('/admin/loan/:id/approve', (req,res)=>{
  const id = req.params.id;
  db.run("UPDATE loans SET status='approved' WHERE id=?", [id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});
app.post('/admin/loan/:id/reject', (req,res)=>{
  const id = req.params.id;
  db.run("UPDATE loans SET status='rejected' WHERE id=?", [id], function(err){
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.get('/loans', (req,res) => {
  db.all("SELECT * FROM loans", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Loan calculator endpoint (fixed and interest)
app.post('/loan/calc', (req,res)=>{
  const { amount, installment, mode, interest_rate, duration } = req.body;
  const a = Number(amount || 0);
  if (mode === 'fixed') {
    const periods = Math.ceil(a / Number(installment || 1));
    const total = periods * Number(installment || 0);
    const schedule = [];
    for (let i=1;i<=periods;i++) schedule.push({ period:i, payment: Number(installment) });
    return res.json({ periods, total, schedule });
  } else {
    const rate = Number(interest_rate || 0) / 100;
    // assume duration is in months
    const totalInterest = a * rate * (Number(duration || 0)/12);
    const total = a + totalInterest;
    const monthly = total / Number(duration || 1);
    const schedule = [];
    for (let i=1;i<=Number(duration);i++) schedule.push({ period:i, payment: Number(monthly.toFixed(2)) });
    return res.json({ periods: Number(duration), total, schedule });
  }
});

// serve index
app.get('/', (req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// start server on the port Replit expects
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on port', PORT));
