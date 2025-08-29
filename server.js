// Millennium Potter Bank Ledger Application - Server
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));

// ensure .data exists for persistence
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// DB path inside .data for persistence
const dbPath = path.join(dataDir, 'millennium_potter.db');
const db = new sqlite3.Database(dbPath);

// Initialize comprehensive database schema
db.serialize(() => {
  // Users table (Admin and Agents)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE,
    fullName TEXT,
    role TEXT CHECK(role IN ('admin', 'agent', 'subadmin')),
    status TEXT DEFAULT 'active',
    created_at TEXT,
    last_login TEXT
  )`);

  // Customers table with comprehensive fields
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    accountNumber TEXT UNIQUE,
    unionGroupName TEXT,
    firstName TEXT,
    middleName TEXT,
    lastName TEXT,
    fullName TEXT,
    maritalStatus TEXT,
    age INTEGER,
    occupation TEXT,
    businessAddress TEXT,
    nearestBusStop TEXT,
    phoneNumber TEXT,
    stateOfOrigin TEXT,
    loanAmountRequested REAL,
    residentialAddress TEXT,
    dateOfBirth TEXT,
    photoUrl TEXT,
    documentsUrl TEXT,
    agentId TEXT,
    adminId TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    FOREIGN KEY (agentId) REFERENCES users(id),
    FOREIGN KEY (adminId) REFERENCES users(id)
  )`);

  // Guarantors table
  db.run(`CREATE TABLE IF NOT EXISTS guarantors (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    name TEXT,
    occupation TEXT,
    businessAddress TEXT,
    nearestBusStop TEXT,
    phoneNumber TEXT,
    stateOfOrigin TEXT,
    residentialAddress TEXT,
    documentsUrl TEXT,
    created_at TEXT,
    FOREIGN KEY (customerId) REFERENCES customers(id)
  )`);

  // Loans table with standardized loan structure
  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    agentId TEXT,
    adminId TEXT,
    loanAmount REAL,
    dailyPayment REAL,
    duration INTEGER,
    totalRepayment REAL,
    status TEXT DEFAULT 'pending',
    approvedBy TEXT,
    approvedAt TEXT,
    disbursedAt TEXT,
    completedAt TEXT,
    created_at TEXT,
    FOREIGN KEY (customerId) REFERENCES customers(id),
    FOREIGN KEY (agentId) REFERENCES users(id),
    FOREIGN KEY (adminId) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
  )`);

  // Daily transactions table
  db.run(`CREATE TABLE IF NOT EXISTS daily_transactions (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    loanId TEXT,
    agentId TEXT,
    date TEXT,
    previousBalance REAL,
    cashReceived REAL,
    transferReceived REAL,
    pickUp REAL,
    registrationFee REAL,
    insurance REAL,
    positionCharges REAL,
    amountDisbursed REAL,
    bank TEXT,
    cashAvailable REAL,
    nextDisbursement REAL,
    pDisbursement REAL,
    record TEXT,
    closingBalance REAL,
    transportation REAL,
    paymentStatus TEXT DEFAULT 'pending',
    created_at TEXT,
    FOREIGN KEY (customerId) REFERENCES customers(id),
    FOREIGN KEY (loanId) REFERENCES loans(id),
    FOREIGN KEY (agentId) REFERENCES users(id)
  )`);

  // Monthly summaries table
  db.run(`CREATE TABLE IF NOT EXISTS monthly_summaries (
    id TEXT PRIMARY KEY,
    agentId TEXT,
    month TEXT,
    year INTEGER,
    totalCashReceived REAL,
    totalPickUp REAL,
    totalRegistration REAL,
    totalInsurance REAL,
    totalPositionCharges REAL,
    totalAmountDisbursed REAL,
    created_at TEXT,
    FOREIGN KEY (agentId) REFERENCES users(id)
  )`);

  // Seed default admin if not exists
  db.get("SELECT COUNT(*) AS cnt FROM users WHERE role='admin'", (err, row) => {
    if (!err && row && row.cnt === 0) {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.run("INSERT INTO users (id, username, password, email, fullName, role, created_at) VALUES (?,?,?,?,?,?,?)",
        [id, 'admin', 'admin123', 'admin@millenniumpotter.com', 'Master Administrator', 'admin', now]);
      console.log('Seeded admin -> username: admin password: admin123');
    }
  });
});

// Loan structure constants
const LOAN_STRUCTURES = {
  30000: { dailyPayment: 1500, duration: 30, totalRepayment: 45000 },
  40000: { dailyPayment: 2000, duration: 25, totalRepayment: 50000 },
  50000: { dailyPayment: 2500, duration: 25, totalRepayment: 62500 },
  60000: { dailyPayment: 3000, duration: 25, totalRepayment: 75000 },
  80000: { dailyPayment: 4000, duration: 25, totalRepayment: 100000 },
  100000: { dailyPayment: 5000, duration: 25, totalRepayment: 125000 },
  150000: { dailyPayment: 7500, duration: 25, totalRepayment: 187500 },
  200000: { dailyPayment: 10000, duration: 25, totalRepayment: 250000 }
};

// Authentication endpoints
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const now = new Date().toISOString();
  
  db.get("SELECT id, username, email, fullName, role, status FROM users WHERE username=? AND password=? AND status='active'", 
    [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(400).json({ error: 'Invalid credentials' });
    
    // Update last login
    db.run("UPDATE users SET last_login=? WHERE id=?", [now, row.id]);
    
    res.json({ 
      ok: true, 
      user: row,
      token: row.id // Simple token for demo
    });
  });
});

app.post('/auth/signup', (req, res) => {
  const { username, password, email, fullName, role } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run("INSERT INTO users (id, username, password, email, fullName, role, created_at) VALUES (?,?,?,?,?,?,?)", 
    [id, username, password, email, fullName, role, now], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, id, username, role });
  });
});

// Customer registration endpoint
app.post('/customer/register', (req, res) => {
  const {
    unionGroupName, firstName, middleName, lastName, maritalStatus, age,
    occupation, businessAddress, nearestBusStop, phoneNumber, stateOfOrigin,
    loanAmountRequested, residentialAddress, dateOfBirth, photoUrl, documentsUrl,
    agentId, adminId,
    guarantorName, guarantorOccupation, guarantorBusinessAddress, guarantorNearestBusStop,
    guarantorPhoneNumber, guarantorStateOfOrigin, guarantorResidentialAddress, guarantorDocumentsUrl
  } = req.body;
  
  const customerId = uuidv4();
  const guarantorId = uuidv4();
  const now = new Date().toISOString();
  const accountNumber = 'MP' + Math.floor(100000 + Math.random() * 900000);
  const fullName = `${firstName} ${middleName} ${lastName}`.trim();
  
  db.serialize(() => {
    // Insert customer
    db.run(`INSERT INTO customers (
      id, accountNumber, unionGroupName, firstName, middleName, lastName, fullName,
      maritalStatus, age, occupation, businessAddress, nearestBusStop, phoneNumber,
      stateOfOrigin, loanAmountRequested, residentialAddress, dateOfBirth,
      photoUrl, documentsUrl, agentId, adminId, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [customerId, accountNumber, unionGroupName, firstName, middleName, lastName, fullName,
     maritalStatus, age, occupation, businessAddress, nearestBusStop, phoneNumber,
     stateOfOrigin, loanAmountRequested, residentialAddress, dateOfBirth,
     photoUrl, documentsUrl, agentId, adminId, now], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // Insert guarantor
      db.run(`INSERT INTO guarantors (
        id, customerId, name, occupation, businessAddress, nearestBusStop,
        phoneNumber, stateOfOrigin, residentialAddress, documentsUrl, created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [guarantorId, customerId, guarantorName, guarantorOccupation, guarantorBusinessAddress,
       guarantorNearestBusStop, guarantorPhoneNumber, guarantorStateOfOrigin,
       guarantorResidentialAddress, guarantorDocumentsUrl, now], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({ 
          ok: true, 
          customer: { id: customerId, accountNumber, fullName },
          guarantor: { id: guarantorId, name: guarantorName }
        });
      });
    });
  });
});

// Get customers (with filters)
app.get('/customers', (req, res) => {
  const { agentId, adminId, status } = req.query;
  let query = "SELECT c.*, g.name as guarantorName FROM customers c LEFT JOIN guarantors g ON c.id = g.customerId WHERE 1=1";
  let params = [];
  
  if (agentId) {
    query += " AND c.agentId = ?";
    params.push(agentId);
  }
  if (adminId) {
    query += " AND c.adminId = ?";
    params.push(adminId);
  }
  if (status) {
    query += " AND c.status = ?";
    params.push(status);
  }
  
  query += " ORDER BY c.created_at DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Loan application endpoint
app.post('/loan/apply', (req, res) => {
  const { customerId, loanAmount, agentId, adminId } = req.body;
  
  if (!LOAN_STRUCTURES[loanAmount]) {
    return res.status(400).json({ error: 'Invalid loan amount. Must be one of: 30000, 40000, 50000, 60000, 80000, 100000, 150000, 200000' });
  }
  
  const loanStructure = LOAN_STRUCTURES[loanAmount];
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`INSERT INTO loans (
    id, customerId, agentId, adminId, loanAmount, dailyPayment, duration,
    totalRepayment, status, created_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  [id, customerId, agentId, adminId, loanAmount, loanStructure.dailyPayment,
   loanStructure.duration, loanStructure.totalRepayment, 'pending', now], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, loanId: id, loanStructure });
  });
});

// Admin loan approval/rejection
app.post('/admin/loan/:id/approve', (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;
  const now = new Date().toISOString();
  
  db.run("UPDATE loans SET status='approved', approvedBy=?, approvedAt=? WHERE id=?", 
    [adminId, now, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.post('/admin/loan/:id/reject', (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;
  const now = new Date().toISOString();
  
  db.run("UPDATE loans SET status='rejected', approvedBy=?, approvedAt=? WHERE id=?", 
    [adminId, now, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// Get loans with filters
app.get('/loans', (req, res) => {
  const { agentId, adminId, status, customerId } = req.query;
  let query = `SELECT l.*, c.fullName as customerName, c.accountNumber, u.fullName as agentName 
               FROM loans l 
               LEFT JOIN customers c ON l.customerId = c.id 
               LEFT JOIN users u ON l.agentId = u.id 
               WHERE 1=1`;
  let params = [];
  
  if (agentId) {
    query += " AND l.agentId = ?";
    params.push(agentId);
  }
  if (adminId) {
    query += " AND l.adminId = ?";
    params.push(adminId);
  }
  if (status) {
    query += " AND l.status = ?";
    params.push(status);
  }
  if (customerId) {
    query += " AND l.customerId = ?";
    params.push(customerId);
  }
  
  query += " ORDER BY l.created_at DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Daily transaction recording
app.post('/transaction/daily', (req, res) => {
  const {
    customerId, loanId, agentId, date, previousBalance, cashReceived, transferReceived,
    pickUp, registrationFee, insurance, positionCharges, amountDisbursed, bank,
    cashAvailable, nextDisbursement, pDisbursement, record, closingBalance, transportation
  } = req.body;
  
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`INSERT INTO daily_transactions (
    id, customerId, loanId, agentId, date, previousBalance, cashReceived, transferReceived,
    pickUp, registrationFee, insurance, positionCharges, amountDisbursed, bank,
    cashAvailable, nextDisbursement, pDisbursement, record, closingBalance, transportation, created_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [id, customerId, loanId, agentId, date, previousBalance, cashReceived, transferReceived,
   pickUp, registrationFee, insurance, positionCharges, amountDisbursed, bank,
   cashAvailable, nextDisbursement, pDisbursement, record, closingBalance, transportation, now], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, transactionId: id });
  });
});

// Get daily transactions
app.get('/transactions/daily', (req, res) => {
  const { agentId, customerId, loanId, date } = req.query;
  let query = `SELECT dt.*, c.fullName as customerName, c.accountNumber, l.loanAmount, l.dailyPayment
               FROM daily_transactions dt
               LEFT JOIN customers c ON dt.customerId = c.id
               LEFT JOIN loans l ON dt.loanId = l.id
               WHERE 1=1`;
  let params = [];
  
  if (agentId) {
    query += " AND dt.agentId = ?";
    params.push(agentId);
  }
  if (customerId) {
    query += " AND dt.customerId = ?";
    params.push(customerId);
  }
  if (loanId) {
    query += " AND dt.loanId = ?";
    params.push(loanId);
  }
  if (date) {
    query += " AND dt.date = ?";
    params.push(date);
  }
  
  query += " ORDER BY dt.date DESC, dt.created_at DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Monthly summary
app.post('/summary/monthly', (req, res) => {
  const { agentId, month, year } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Calculate totals from daily transactions
  const query = `SELECT 
    SUM(cashReceived + transferReceived) as totalCashReceived,
    SUM(pickUp) as totalPickUp,
    SUM(registrationFee) as totalRegistration,
    SUM(insurance) as totalInsurance,
    SUM(positionCharges) as totalPositionCharges,
    SUM(amountDisbursed) as totalAmountDisbursed
    FROM daily_transactions 
    WHERE agentId = ? AND strftime('%m', date) = ? AND strftime('%Y', date) = ?`;
  
  db.get(query, [agentId, month, year], (err, totals) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.run(`INSERT INTO monthly_summaries (
      id, agentId, month, year, totalCashReceived, totalPickUp, totalRegistration,
      totalInsurance, totalPositionCharges, totalAmountDisbursed, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, agentId, month, year, totals.totalCashReceived || 0, totals.totalPickUp || 0,
     totals.totalRegistration || 0, totals.totalInsurance || 0, totals.totalPositionCharges || 0,
     totals.totalAmountDisbursed || 0, now], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, summaryId: id, totals });
    });
  });
});

// Get monthly summaries
app.get('/summary/monthly', (req, res) => {
  const { agentId, month, year } = req.query;
  let query = "SELECT * FROM monthly_summaries WHERE 1=1";
  let params = [];
  
  if (agentId) {
    query += " AND agentId = ?";
    params.push(agentId);
  }
  if (month) {
    query += " AND month = ?";
    params.push(month);
  }
  if (year) {
    query += " AND year = ?";
    params.push(year);
  }
  
  query += " ORDER BY year DESC, month DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get users (agents/admins)
app.get('/users', (req, res) => {
  const { role, status } = req.query;
  let query = "SELECT id, username, email, fullName, role, status, created_at, last_login FROM users WHERE 1=1";
  let params = [];
  
  if (role) {
    query += " AND role = ?";
    params.push(role);
  }
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  
  query += " ORDER BY created_at DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Dashboard statistics
app.get('/dashboard/stats', (req, res) => {
  const { agentId, adminId } = req.query;
  
  const stats = {};
  
  // Customer count
  let customerQuery = "SELECT COUNT(*) as count FROM customers WHERE 1=1";
  let customerParams = [];
  if (agentId) {
    customerQuery += " AND agentId = ?";
    customerParams.push(agentId);
  }
  if (adminId) {
    customerQuery += " AND adminId = ?";
    customerParams.push(adminId);
  }
  
  db.get(customerQuery, customerParams, (err, customerCount) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.customers = customerCount.count;
    
    // Loan count
    let loanQuery = "SELECT COUNT(*) as count, SUM(loanAmount) as totalAmount FROM loans WHERE 1=1";
    let loanParams = [];
    if (agentId) {
      loanQuery += " AND agentId = ?";
      loanParams.push(agentId);
    }
    if (adminId) {
      loanQuery += " AND adminId = ?";
      loanParams.push(adminId);
    }
    
    db.get(loanQuery, loanParams, (err, loanStats) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.loans = loanStats.count;
      stats.totalLoanAmount = loanStats.totalAmount || 0;
      
      // Transaction count
      let txQuery = "SELECT COUNT(*) as count, SUM(cashReceived + transferReceived) as totalReceived FROM daily_transactions WHERE 1=1";
      let txParams = [];
      if (agentId) {
        txQuery += " AND agentId = ?";
        txParams.push(agentId);
      }
      
      db.get(txQuery, txParams, (err, txStats) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.transactions = txStats.count;
        stats.totalReceived = txStats.totalReceived || 0;
        
        res.json(stats);
      });
    });
  });
});

// Serve static files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/agent', (req, res) => res.sendFile(path.join(__dirname, 'agent.html')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Millennium Potter Bank Ledger Server running on port ${PORT}`));
