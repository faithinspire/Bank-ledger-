// Millennium Potter Agent Dashboard JavaScript

// Global variables
let currentUser = null;
let currentTab = 'dashboard';
let loanStructures = {
    30000: { dailyPayment: 1500, duration: 30, totalRepayment: 45000 },
    40000: { dailyPayment: 2000, duration: 25, totalRepayment: 50000 },
    50000: { dailyPayment: 2500, duration: 25, totalRepayment: 62500 },
    60000: { dailyPayment: 3000, duration: 25, totalRepayment: 75000 },
    80000: { dailyPayment: 4000, duration: 25, totalRepayment: 100000 },
    100000: { dailyPayment: 5000, duration: 25, totalRepayment: 125000 },
    150000: { dailyPayment: 7500, duration: 25, totalRepayment: 187500 },
    200000: { dailyPayment: 10000, duration: 25, totalRepayment: 250000 }
};

// Utility functions
function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const loading = button.querySelector('.loading');
    
    if (isLoading) {
        btnText.style.display = 'none';
        loading.style.display = 'inline-block';
        button.disabled = true;
    } else {
        btnText.style.display = 'inline';
        loading.style.display = 'none';
        button.disabled = false;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-NG');
}

// API functions
async function apiCall(endpoint, options = {}) {
    try {
        const token = localStorage.getItem('mp_token');
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Authentication
function checkAuth() {
    const user = localStorage.getItem('mp_user');
    const token = localStorage.getItem('mp_token');
    
    if (!user || !token) {
        window.location.href = '/';
        return;
    }
    
    currentUser = JSON.parse(user);
    if (currentUser.role !== 'agent') {
        showAlert('Access denied. Agent privileges required.');
        logout();
        return;
    }
    
    document.getElementById('agentName').textContent = currentUser.fullName || currentUser.username;
}

function logout() {
    localStorage.removeItem('mp_user');
    localStorage.removeItem('mp_token');
    window.location.href = '/';
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked nav link
    event.target.classList.add('active');
    
    currentTab = tabName;
    
    // Load data for the tab
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'loans':
            loadLoans();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'ledger':
            loadLedger();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const stats = await apiCall(`/dashboard/stats?agentId=${currentUser.id}`);
        
        document.getElementById('totalCustomers').textContent = stats.customers || 0;
        document.getElementById('pendingLoans').textContent = stats.pendingLoans || 0;
        document.getElementById('approvedLoans').textContent = stats.approvedLoans || 0;
        document.getElementById('todayCollections').textContent = formatCurrency(stats.todayCollections || 0);
        
        // Load recent activities
        const recentActivities = await apiCall('/transactions/daily?agentId=' + currentUser.id + '&limit=5');
        const activitiesContainer = document.getElementById('recentActivities');
        activitiesContainer.innerHTML = '';
        
        if (recentActivities.length === 0) {
            activitiesContainer.innerHTML = '<p class="text-muted">No recent activities</p>';
        } else {
            recentActivities.forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                activityItem.innerHTML = `
                    <div>
                        <strong>${activity.customerName}</strong><br>
                        <small class="text-muted">Payment: ${formatCurrency(activity.cashReceived + activity.transferReceived)}</small>
                    </div>
                    <small class="text-muted">${formatDate(activity.date)}</small>
                `;
                activitiesContainer.appendChild(activityItem);
            });
        }
    } catch (error) {
        showAlert('Failed to load dashboard data: ' + error.message);
    }
}

async function refreshStats() {
    await loadDashboard();
    showAlert('Dashboard refreshed successfully', 'success');
}

// Customer management functions
async function loadCustomers() {
    try {
        const customers = await apiCall(`/customers?agentId=${currentUser.id}`);
        const tbody = document.getElementById('customersTableBody');
        tbody.innerHTML = '';
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.accountNumber}</td>
                <td>${customer.fullName}</td>
                <td>${customer.phoneNumber}</td>
                <td>${formatCurrency(customer.loanAmountRequested || 0)}</td>
                <td><span class="status-badge status-approved">Active</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="viewCustomer('${customer.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success me-1" onclick="editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="applyLoanForCustomer('${customer.id}')">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Failed to load customers: ' + error.message);
    }
}

async function refreshCustomers() {
    await loadCustomers();
    showAlert('Customers refreshed successfully', 'success');
}

function showAddCustomerModal() {
    const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
    modal.show();
}

async function addCustomer() {
    const button = event.target;
    setLoading(button, true);
    
    try {
        const formData = {
            unionGroupName: document.getElementById('unionGroupName').value,
            firstName: document.getElementById('firstName').value,
            middleName: document.getElementById('middleName').value,
            lastName: document.getElementById('lastName').value,
            maritalStatus: document.getElementById('maritalStatus').value,
            age: document.getElementById('age').value,
            dateOfBirth: document.getElementById('dateOfBirth').value,
            occupation: document.getElementById('occupation').value,
            businessAddress: document.getElementById('businessAddress').value,
            nearestBusStop: document.getElementById('nearestBusStop').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            stateOfOrigin: document.getElementById('stateOfOrigin').value,
            residentialAddress: document.getElementById('residentialAddress').value,
            loanAmountRequested: document.getElementById('loanAmountRequested').value,
            agentId: currentUser.id,
            guarantorName: document.getElementById('guarantorName').value,
            guarantorOccupation: document.getElementById('guarantorOccupation').value,
            guarantorBusinessAddress: document.getElementById('guarantorBusinessAddress').value,
            guarantorNearestBusStop: document.getElementById('guarantorNearestBusStop').value,
            guarantorPhoneNumber: document.getElementById('guarantorPhoneNumber').value,
            guarantorStateOfOrigin: document.getElementById('guarantorStateOfOrigin').value,
            guarantorResidentialAddress: document.getElementById('guarantorResidentialAddress').value
        };
        
        await apiCall('/customer/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Customer registered successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addCustomerModal')).hide();
        document.getElementById('addCustomerForm').reset();
        loadCustomers();
        loadDashboard();
    } catch (error) {
        showAlert('Failed to register customer: ' + error.message);
    } finally {
        setLoading(button, false);
    }
}

// Loan management functions
async function loadLoans() {
    try {
        const loans = await apiCall(`/loans?agentId=${currentUser.id}`);
        const tbody = document.getElementById('loansTableBody');
        tbody.innerHTML = '';
        
        loans.forEach(loan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${loan.customerName}</td>
                <td>${formatCurrency(loan.loanAmount)}</td>
                <td>${formatCurrency(loan.dailyPayment)}</td>
                <td>${loan.duration} days</td>
                <td><span class="status-badge status-${loan.status}">${loan.status}</span></td>
                <td>${formatDate(loan.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewLoan('${loan.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Failed to load loans: ' + error.message);
    }
}

async function refreshLoans() {
    await loadLoans();
    showAlert('Loans refreshed successfully', 'success');
}

function showAddLoanModal() {
    loadCustomersForLoanDropdown();
    const modal = new bootstrap.Modal(document.getElementById('addLoanModal'));
    modal.show();
}

async function loadCustomersForLoanDropdown() {
    try {
        const customers = await apiCall(`/customers?agentId=${currentUser.id}`);
        const select = document.getElementById('loanCustomer');
        select.innerHTML = '<option value="">Choose Customer</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.fullName} (${customer.accountNumber})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load customers for loan dropdown:', error);
    }
}

function updateLoanDetails() {
    const amount = document.getElementById('loanAmount').value;
    const detailsDiv = document.getElementById('loanDetails');
    
    if (amount && loanStructures[amount]) {
        const structure = loanStructures[amount];
        detailsDiv.innerHTML = `
            <strong>Loan Details:</strong><br>
            Daily Payment: ${formatCurrency(structure.dailyPayment)}<br>
            Duration: ${structure.duration} days<br>
            Total Repayment: ${formatCurrency(structure.totalRepayment)}
        `;
        detailsDiv.style.display = 'block';
    } else {
        detailsDiv.style.display = 'none';
    }
}

async function addLoan() {
    const button = event.target;
    setLoading(button, true);
    
    try {
        const customerId = document.getElementById('loanCustomer').value;
        const loanAmount = document.getElementById('loanAmount').value;
        
        if (!customerId || !loanAmount) {
            throw new Error('Please select both customer and loan amount');
        }
        
        const formData = {
            customerId: customerId,
            loanAmount: parseInt(loanAmount),
            agentId: currentUser.id
        };
        
        await apiCall('/loan/apply', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Loan application submitted successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addLoanModal')).hide();
        document.getElementById('addLoanForm').reset();
        document.getElementById('loanDetails').style.display = 'none';
        loadLoans();
        loadDashboard();
    } catch (error) {
        showAlert('Failed to submit loan application: ' + error.message);
    } finally {
        setLoading(button, false);
    }
}

// Transaction functions
async function loadTransactions() {
    try {
        const date = document.getElementById('transactionDate').value;
        const endpoint = date ? `/transactions/daily?agentId=${currentUser.id}&date=${date}` : `/transactions/daily?agentId=${currentUser.id}`;
        const transactions = await apiCall(endpoint);
        
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(tx.date)}</td>
                <td>${tx.customerName}</td>
                <td>${formatCurrency(tx.cashReceived || 0)}</td>
                <td>${formatCurrency(tx.transferReceived || 0)}</td>
                <td>${formatCurrency(tx.pickUp || 0)}</td>
                <td>${formatCurrency(tx.closingBalance || 0)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editTransaction('${tx.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Failed to load transactions: ' + error.message);
    }
}

async function refreshTransactions() {
    await loadTransactions();
    showAlert('Transactions refreshed successfully', 'success');
}

function filterTransactions() {
    loadTransactions();
}

function showAddTransactionModal() {
    loadCustomersForTransactionDropdown();
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    const modal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
    modal.show();
}

async function loadCustomersForTransactionDropdown() {
    try {
        const customers = await apiCall(`/customers?agentId=${currentUser.id}`);
        const select = document.getElementById('transactionCustomer');
        select.innerHTML = '<option value="">Select Customer</option>';
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.fullName} (${customer.accountNumber})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load customers for transaction dropdown:', error);
    }
}

async function addTransaction() {
    const button = event.target;
    setLoading(button, true);
    
    try {
        const formData = {
            customerId: document.getElementById('transactionCustomer').value,
            agentId: currentUser.id,
            date: document.getElementById('transactionDate').value,
            cashReceived: parseFloat(document.getElementById('cashReceived').value) || 0,
            transferReceived: parseFloat(document.getElementById('transferReceived').value) || 0,
            pickUp: parseFloat(document.getElementById('pickUp').value) || 0,
            registrationFee: parseFloat(document.getElementById('registrationFee').value) || 0,
            insurance: parseFloat(document.getElementById('insurance').value) || 0,
            positionCharges: parseFloat(document.getElementById('positionCharges').value) || 0,
            amountDisbursed: parseFloat(document.getElementById('amountDisbursed').value) || 0,
            bank: document.getElementById('bank').value,
            previousBalance: 0, // This would be calculated based on previous transactions
            cashAvailable: 0, // This would be calculated
            nextDisbursement: 0, // This would be calculated
            pDisbursement: 0, // This would be calculated
            record: '', // This would be filled based on business logic
            closingBalance: 0, // This would be calculated
            transportation: 0 // This would be filled based on business logic
        };
        
        await apiCall('/transaction/daily', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Payment recorded successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addTransactionModal')).hide();
        document.getElementById('addTransactionForm').reset();
        loadTransactions();
        loadDashboard();
    } catch (error) {
        showAlert('Failed to record payment: ' + error.message);
    } finally {
        setLoading(button, false);
    }
}

// Ledger functions
async function loadLedger() {
    try {
        const date = document.getElementById('ledgerDate').value;
        const endpoint = date ? `/transactions/daily?agentId=${currentUser.id}&date=${date}` : `/transactions/daily?agentId=${currentUser.id}`;
        const transactions = await apiCall(endpoint);
        
        const tbody = document.getElementById('ledgerTableBody');
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tx.customerName}</td>
                <td>${formatCurrency(tx.previousBalance || 0)}</td>
                <td>${formatCurrency(tx.cashReceived || 0)}</td>
                <td>${formatCurrency(tx.transferReceived || 0)}</td>
                <td>${formatCurrency(tx.pickUp || 0)}</td>
                <td>${formatCurrency(tx.registrationFee || 0)}</td>
                <td>${formatCurrency(tx.insurance || 0)}</td>
                <td>${formatCurrency(tx.positionCharges || 0)}</td>
                <td>${formatCurrency(tx.amountDisbursed || 0)}</td>
                <td>${tx.bank || '-'}</td>
                <td>${formatCurrency(tx.cashAvailable || 0)}</td>
                <td>${formatCurrency(tx.nextDisbursement || 0)}</td>
                <td>${formatCurrency(tx.pDisbursement || 0)}</td>
                <td>${tx.record || '-'}</td>
                <td>${formatCurrency(tx.closingBalance || 0)}</td>
                <td>${formatCurrency(tx.transportation || 0)}</td>
                <td><span class="status-badge status-${tx.paymentStatus || 'pending'}">${tx.paymentStatus || 'pending'}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Failed to load ledger: ' + error.message);
    }
}

async function refreshLedger() {
    await loadLedger();
    showAlert('Ledger refreshed successfully', 'success');
}

// Reports functions
async function loadReports() {
    try {
        // Load daily summary
        const today = new Date().toISOString().split('T')[0];
        const dailyTransactions = await apiCall(`/transactions/daily?agentId=${currentUser.id}&date=${today}`);
        
        const dailyContainer = document.getElementById('dailySummary');
        if (dailyTransactions.length > 0) {
            const totalCash = dailyTransactions.reduce((sum, tx) => sum + (tx.cashReceived || 0), 0);
            const totalTransfer = dailyTransactions.reduce((sum, tx) => sum + (tx.transferReceived || 0), 0);
            const totalPickUp = dailyTransactions.reduce((sum, tx) => sum + (tx.pickUp || 0), 0);
            
            dailyContainer.innerHTML = `
                <div class="row">
                    <div class="col-6">
                        <p><strong>Total Cash Received:</strong><br>${formatCurrency(totalCash)}</p>
                        <p><strong>Total Transfer:</strong><br>${formatCurrency(totalTransfer)}</p>
                    </div>
                    <div class="col-6">
                        <p><strong>Total Pick Up:</strong><br>${formatCurrency(totalPickUp)}</p>
                        <p><strong>Total Collections:</strong><br>${formatCurrency(totalCash + totalTransfer)}</p>
                    </div>
                </div>
            `;
        } else {
            dailyContainer.innerHTML = '<p class="text-muted">No transactions for today</p>';
        }
        
        // Load customer performance
        const customers = await apiCall(`/customers?agentId=${currentUser.id}`);
        const performanceContainer = document.getElementById('customerPerformance');
        performanceContainer.innerHTML = '';
        
        customers.forEach(customer => {
            const customerCard = document.createElement('div');
            customerCard.className = 'card mb-2';
            customerCard.innerHTML = `
                <div class="card-body p-2">
                    <h6 class="mb-1">${customer.fullName}</h6>
                    <small class="text-muted">Account: ${customer.accountNumber}</small><br>
                    <small class="text-muted">Loan: ${formatCurrency(customer.loanAmountRequested || 0)}</small>
                </div>
            `;
            performanceContainer.appendChild(customerCard);
        });
    } catch (error) {
        showAlert('Failed to load reports: ' + error.message);
    }
}

async function generateDailyReport() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const transactions = await apiCall(`/transactions/daily?agentId=${currentUser.id}&date=${today}`);
        
        // Create a simple report
        const report = {
            date: today,
            agent: currentUser.fullName,
            totalTransactions: transactions.length,
            totalCash: transactions.reduce((sum, tx) => sum + (tx.cashReceived || 0), 0),
            totalTransfer: transactions.reduce((sum, tx) => sum + (tx.transferReceived || 0), 0),
            totalPickUp: transactions.reduce((sum, tx) => sum + (tx.pickUp || 0), 0)
        };
        
        // In a real application, this would generate a PDF or Excel file
        console.log('Daily Report:', report);
        showAlert('Daily report generated successfully', 'success');
    } catch (error) {
        showAlert('Failed to generate daily report: ' + error.message);
    }
}

async function generateMonthlyReport() {
    try {
        const currentDate = new Date();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        
        await apiCall('/summary/monthly', {
            method: 'POST',
            body: JSON.stringify({ 
                agentId: currentUser.id, 
                month, 
                year 
            })
        });
        
        showAlert('Monthly report generated successfully', 'success');
        loadReports();
    } catch (error) {
        showAlert('Failed to generate monthly report: ' + error.message);
    }
}

// Placeholder functions for future implementation
function viewCustomer(customerId) {
    showAlert('View customer feature coming soon', 'success');
}

function editCustomer(customerId) {
    showAlert('Edit customer feature coming soon', 'success');
}

function applyLoanForCustomer(customerId) {
    showAlert('Apply loan feature coming soon', 'success');
}

function viewLoan(loanId) {
    showAlert('View loan feature coming soon', 'success');
}

function editTransaction(transactionId) {
    showAlert('Edit transaction feature coming soon', 'success');
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboard();
    
    // Set today's date for transaction and ledger filters
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
    document.getElementById('ledgerDate').value = today;
});