// Millennium Potter Admin Dashboard JavaScript

// Global variables
let currentUser = null;
let currentTab = 'dashboard';

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
    if (currentUser.role !== 'admin') {
        showAlert('Access denied. Admin privileges required.');
        logout();
        return;
    }
    
    document.getElementById('adminName').textContent = currentUser.fullName || currentUser.username;
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
        case 'agents':
            loadAgents();
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
        case 'reports':
            loadReports();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        const stats = await apiCall('/dashboard/stats');
        
        document.getElementById('totalCustomers').textContent = stats.customers || 0;
        document.getElementById('totalAgents').textContent = stats.agents || 0;
        document.getElementById('totalLoans').textContent = stats.loans || 0;
        document.getElementById('totalAmount').textContent = formatCurrency(stats.totalLoanAmount || 0);
        
        // Load recent loans
        const recentLoans = await apiCall('/loans?status=pending&limit=5');
        const recentLoansContainer = document.getElementById('recentLoans');
        recentLoansContainer.innerHTML = '';
        
        if (recentLoans.length === 0) {
            recentLoansContainer.innerHTML = '<p class="text-muted">No pending loans</p>';
        } else {
            recentLoans.forEach(loan => {
                const loanItem = document.createElement('div');
                loanItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                loanItem.innerHTML = `
                    <div>
                        <strong>${loan.customerName}</strong><br>
                        <small class="text-muted">₦${loan.loanAmount.toLocaleString()}</small>
                    </div>
                    <button class="btn btn-sm btn-success" onclick="approveLoan('${loan.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                `;
                recentLoansContainer.appendChild(loanItem);
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

// Agent management functions
async function loadAgents() {
    try {
        const agents = await apiCall('/users?role=agent');
        const tbody = document.getElementById('agentsTableBody');
        tbody.innerHTML = '';
        
        agents.forEach(agent => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${agent.fullName}</td>
                <td>${agent.username}</td>
                <td>${agent.email}</td>
                <td><span class="status-badge status-approved">Active</span></td>
                <td>${agent.customerCount || 0}</td>
                <td>${agent.last_login ? formatDate(agent.last_login) : 'Never'}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editAgent('${agent.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAgent('${agent.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showAlert('Failed to load agents: ' + error.message);
    }
}

function showAddAgentModal() {
    const modal = new bootstrap.Modal(document.getElementById('addAgentModal'));
    modal.show();
}

async function addAgent() {
    const button = event.target;
    setLoading(button, true);
    
    try {
        const formData = {
            username: document.getElementById('agentUsername').value,
            email: document.getElementById('agentEmail').value,
            fullName: document.getElementById('agentName').value,
            password: document.getElementById('agentPassword').value,
            role: 'agent'
        };
        
        await apiCall('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Agent added successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addAgentModal')).hide();
        document.getElementById('addAgentForm').reset();
        loadAgents();
    } catch (error) {
        showAlert('Failed to add agent: ' + error.message);
    } finally {
        setLoading(button, false);
    }
}

// Customer management functions
async function loadCustomers() {
    try {
        const customers = await apiCall('/customers');
        const tbody = document.getElementById('customersTableBody');
        tbody.innerHTML = '';
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${customer.accountNumber}</td>
                <td>${customer.fullName}</td>
                <td>${customer.phoneNumber}</td>
                <td>${customer.agentName || 'Unassigned'}</td>
                <td>${formatCurrency(customer.loanAmountRequested || 0)}</td>
                <td><span class="status-badge status-approved">Active</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="viewCustomer('${customer.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-success me-1" onclick="editCustomer('${customer.id}')">
                        <i class="fas fa-edit"></i>
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
    // Load agents for dropdown
    loadAgentsForDropdown();
    const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
    modal.show();
}

async function loadAgentsForDropdown() {
    try {
        const agents = await apiCall('/users?role=agent');
        const select = document.getElementById('assignedAgent');
        select.innerHTML = '<option value="">Select Agent</option>';
        
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.fullName;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load agents for dropdown:', error);
    }
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
            phoneNumber: document.getElementById('phoneNumber').value,
            loanAmountRequested: document.getElementById('loanAmountRequested').value,
            occupation: document.getElementById('occupation').value,
            businessAddress: document.getElementById('businessAddress').value,
            residentialAddress: document.getElementById('residentialAddress').value,
            stateOfOrigin: document.getElementById('stateOfOrigin').value,
            agentId: document.getElementById('assignedAgent').value,
            adminId: currentUser.id
        };
        
        await apiCall('/customer/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showAlert('Customer added successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addCustomerModal')).hide();
        document.getElementById('addCustomerForm').reset();
        loadCustomers();
    } catch (error) {
        showAlert('Failed to add customer: ' + error.message);
    } finally {
        setLoading(button, false);
    }
}

// Loan management functions
async function loadLoans() {
    try {
        const loans = await apiCall('/loans');
        const tbody = document.getElementById('loansTableBody');
        tbody.innerHTML = '';
        
        loans.forEach(loan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${loan.customerName}</td>
                <td>${loan.agentName || 'N/A'}</td>
                <td>${formatCurrency(loan.loanAmount)}</td>
                <td>${formatCurrency(loan.dailyPayment)}</td>
                <td>${loan.duration} days</td>
                <td><span class="status-badge status-${loan.status}">${loan.status}</span></td>
                <td>${formatDate(loan.created_at)}</td>
                <td>
                    ${loan.status === 'pending' ? `
                        <button class="btn btn-sm btn-success me-1" onclick="approveLoan('${loan.id}')">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectLoan('${loan.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
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

async function approveLoan(loanId) {
    try {
        await apiCall(`/admin/loan/${loanId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ adminId: currentUser.id })
        });
        
        showAlert('Loan approved successfully', 'success');
        loadLoans();
        loadDashboard();
    } catch (error) {
        showAlert('Failed to approve loan: ' + error.message);
    }
}

async function rejectLoan(loanId) {
    if (!confirm('Are you sure you want to reject this loan?')) return;
    
    try {
        await apiCall(`/admin/loan/${loanId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ adminId: currentUser.id })
        });
        
        showAlert('Loan rejected successfully', 'success');
        loadLoans();
        loadDashboard();
    } catch (error) {
        showAlert('Failed to reject loan: ' + error.message);
    }
}

function filterLoans() {
    const status = document.getElementById('loanStatusFilter').value;
    // Implement filtering logic here
    loadLoans();
}

// Transaction functions
async function loadTransactions() {
    try {
        const date = document.getElementById('transactionDate').value;
        const endpoint = date ? `/transactions/daily?date=${date}` : '/transactions/daily';
        const transactions = await apiCall(endpoint);
        
        const tbody = document.getElementById('transactionsTableBody');
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(tx.date)}</td>
                <td>${tx.customerName}</td>
                <td>${tx.agentName || 'N/A'}</td>
                <td>${formatCurrency(tx.cashReceived || 0)}</td>
                <td>${formatCurrency(tx.transferReceived || 0)}</td>
                <td>${formatCurrency(tx.pickUp || 0)}</td>
                <td>${formatCurrency(tx.closingBalance || 0)}</td>
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

// Reports functions
async function loadReports() {
    try {
        // Load monthly summary
        const currentDate = new Date();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        
        const monthlySummary = await apiCall(`/summary/monthly?month=${month}&year=${year}`);
        const monthlyContainer = document.getElementById('monthlySummary');
        
        if (monthlySummary.length > 0) {
            const summary = monthlySummary[0];
            monthlyContainer.innerHTML = `
                <div class="row">
                    <div class="col-6">
                        <p><strong>Total Cash Received:</strong><br>${formatCurrency(summary.totalCashReceived)}</p>
                        <p><strong>Total Pick Up:</strong><br>${formatCurrency(summary.totalPickUp)}</p>
                        <p><strong>Total Registration:</strong><br>${formatCurrency(summary.totalRegistration)}</p>
                    </div>
                    <div class="col-6">
                        <p><strong>Total Insurance:</strong><br>${formatCurrency(summary.totalInsurance)}</p>
                        <p><strong>Total Position Charges:</strong><br>${formatCurrency(summary.totalPositionCharges)}</p>
                        <p><strong>Total Amount Disbursed:</strong><br>${formatCurrency(summary.totalAmountDisbursed)}</p>
                    </div>
                </div>
            `;
        } else {
            monthlyContainer.innerHTML = '<p class="text-muted">No data available for this month</p>';
        }
        
        // Load agent performance
        const agents = await apiCall('/users?role=agent');
        const performanceContainer = document.getElementById('agentPerformance');
        performanceContainer.innerHTML = '';
        
        agents.forEach(agent => {
            const agentCard = document.createElement('div');
            agentCard.className = 'card mb-2';
            agentCard.innerHTML = `
                <div class="card-body p-2">
                    <h6 class="mb-1">${agent.fullName}</h6>
                    <small class="text-muted">Customers: ${agent.customerCount || 0}</small>
                </div>
            `;
            performanceContainer.appendChild(agentCard);
        });
    } catch (error) {
        showAlert('Failed to load reports: ' + error.message);
    }
}

async function generateMonthlyReport() {
    try {
        const currentDate = new Date();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        
        await apiCall('/summary/monthly', {
            method: 'POST',
            body: JSON.stringify({ month, year })
        });
        
        showAlert('Monthly report generated successfully', 'success');
        loadReports();
    } catch (error) {
        showAlert('Failed to generate monthly report: ' + error.message);
    }
}

async function generateAgentReport() {
    showAlert('Agent performance report feature coming soon', 'success');
}

// Placeholder functions for future implementation
function editAgent(agentId) {
    showAlert('Edit agent feature coming soon', 'success');
}

function deleteAgent(agentId) {
    if (confirm('Are you sure you want to delete this agent?')) {
        showAlert('Delete agent feature coming soon', 'success');
    }
}

function viewCustomer(customerId) {
    showAlert('View customer feature coming soon', 'success');
}

function editCustomer(customerId) {
    showAlert('Edit customer feature coming soon', 'success');
}

function viewLoan(loanId) {
    showAlert('View loan feature coming soon', 'success');
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboard();
    
    // Set today's date for transaction filter
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
});