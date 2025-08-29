// Millennium Potter Bank Ledger - Client-side JavaScript

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

// API functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
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

// Authentication functions
async function login(username, password) {
    const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (response.ok) {
        // Store user data
        localStorage.setItem('mp_user', JSON.stringify(response.user));
        localStorage.setItem('mp_token', response.token);
        
        // Redirect based on role
        if (response.user.role === 'admin') {
            window.location.href = '/admin';
        } else if (response.user.role === 'agent') {
            window.location.href = '/agent';
        } else {
            showAlert('Unknown user role');
        }
    } else {
        throw new Error(response.error || 'Login failed');
    }
}

async function signup(username, email, fullName, password, role) {
    const response = await apiCall('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, email, fullName, password, role })
    });
    
    if (response.ok) {
        showAlert(`Successfully registered as ${role}! You can now login.`, 'success');
        return response;
    } else {
        throw new Error(response.error || 'Registration failed');
    }
}

// Form event handlers
document.addEventListener('DOMContentLoaded', function() {
    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const button = this.querySelector('button[type="submit"]');
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            
            setLoading(button, true);
            
            try {
                await login(username, password);
            } catch (error) {
                showAlert(error.message);
            } finally {
                setLoading(button, false);
            }
        });
    }

    // Admin Signup Form
    const adminSignupForm = document.getElementById('adminSignupForm');
    if (adminSignupForm) {
        adminSignupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const button = this.querySelector('button[type="submit"]');
            const username = document.getElementById('adminSignupUsername').value;
            const email = document.getElementById('adminSignupEmail').value;
            const fullName = document.getElementById('adminSignupName').value;
            const password = document.getElementById('adminSignupPassword').value;
            
            setLoading(button, true);
            
            try {
                await signup(username, email, fullName, password, 'admin');
                this.reset();
            } catch (error) {
                showAlert(error.message);
            } finally {
                setLoading(button, false);
            }
        });
    }

    // Agent Login Form
    const agentLoginForm = document.getElementById('agentLoginForm');
    if (agentLoginForm) {
        agentLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const button = this.querySelector('button[type="submit"]');
            const username = document.getElementById('agentUsername').value;
            const password = document.getElementById('agentPassword').value;
            
            setLoading(button, true);
            
            try {
                await login(username, password);
            } catch (error) {
                showAlert(error.message);
            } finally {
                setLoading(button, false);
            }
        });
    }

    // Agent Signup Form
    const agentSignupForm = document.getElementById('agentSignupForm');
    if (agentSignupForm) {
        agentSignupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const button = this.querySelector('button[type="submit"]');
            const username = document.getElementById('agentSignupUsername').value;
            const email = document.getElementById('agentSignupEmail').value;
            const fullName = document.getElementById('agentSignupName').value;
            const password = document.getElementById('agentSignupPassword').value;
            
            setLoading(button, true);
            
            try {
                await signup(username, email, fullName, password, 'agent');
                this.reset();
            } catch (error) {
                showAlert(error.message);
            } finally {
                setLoading(button, false);
            }
        });
    }
});

// Check if user is already logged in
function checkAuth() {
    const user = localStorage.getItem('mp_user');
    const token = localStorage.getItem('mp_token');
    
    if (user && token) {
        const userData = JSON.parse(user);
        if (userData.role === 'admin') {
            window.location.href = '/admin';
        } else if (userData.role === 'agent') {
            window.location.href = '/agent';
        }
    }
}

// Run auth check on page load
checkAuth();
