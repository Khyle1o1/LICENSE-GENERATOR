// Configuration - CHANGE THESE IN PRODUCTION
const SECRET_KEY = 'AOG-TECH-POS-SYSTEM-2024-SECRET-KEY-CHANGE-IN-PRODUCTION';
const PRODUCT_ID = 'AOG-TECH-POS-SYSTEM-V1';
const API_BASE_URL = '/api';

// Simple crypto implementation for browser (fallback for client-side validation)
class SimpleCrypto {
    static async sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    static async hmacSha256(key, message) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const messageData = encoder.encode(message);
        
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    static async md5(message) {
        // Simple MD5 implementation for checksum
        const hash = await this.sha256(message);
        return hash.substring(0, 32); // Use first 32 chars as MD5 substitute
    }
}

// API helper functions
class LicenseAPI {
    static async generateLicense(customerEmail, customerName, validityDays, features = ['basic'], maxActivations = 1) {
        try {
            const response = await fetch(`${API_BASE_URL}/licenses/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerEmail,
                    customerName,
                    validityDays,
                    features,
                    maxActivations
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate license');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async checkLicenseStatus(licenseKey) {
        try {
            const response = await fetch(`${API_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}/status`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to check license status');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async suspendLicense(licenseKey, reason, performedBy = 'admin') {
        try {
            const response = await fetch(`${API_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}/suspend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason, performedBy })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to suspend license');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async reactivateLicense(licenseKey, performedBy = 'admin') {
        try {
            const response = await fetch(`${API_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}/reactivate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ performedBy })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to reactivate license');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async getAllLicenses(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.email) params.append('email', filters.email);
            if (filters.name) params.append('name', filters.name);
            if (filters.limit) params.append('limit', filters.limit);

            const response = await fetch(`${API_BASE_URL}/licenses?${params}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get licenses');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async getLicenseHistory(licenseKey) {
        try {
            const response = await fetch(`${API_BASE_URL}/licenses/${encodeURIComponent(licenseKey)}/history`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get license history');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    static async getLicenseStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/licenses/stats`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get license statistics');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
}

// License generation class (kept for client-side compatibility)
class LicenseGenerator {
    static formatLicenseKey(key) {
        const clean = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        return clean.replace(/(.{5})/g, '$1-').slice(0, -1);
    }
}

// DOM elements
const licenseForm = document.getElementById('licenseForm');
const validityDaysSelect = document.getElementById('validityDays');
const customDaysInput = document.getElementById('customDays');
const licenseResult = document.getElementById('licenseResult');
const generatedKeySpan = document.getElementById('generatedKey');
const copyKeyBtn = document.getElementById('copyKey');
const downloadBtn = document.getElementById('downloadLicense');
const emailBtn = document.getElementById('emailLicense');
const generateAnotherBtn = document.getElementById('generateAnother');
const clearHistoryBtn = document.getElementById('clearHistory');
const licenseHistoryDiv = document.getElementById('licenseHistory');
const toast = document.getElementById('toast');

// Current license data
let currentLicenseData = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadLicenseHistory();
    addLicenseManagementSection();
    loadLicenseStats();
    
    // Auto-focus first input
    document.getElementById('customerEmail').focus();
});

// Add license management section to the page
function addLicenseManagementSection() {
    const mainContent = document.querySelector('.main-content');
    
    const managementSection = document.createElement('div');
    managementSection.innerHTML = `
        <!-- License Management Section -->
        <div class="card">
            <div class="card-header">
                <i class="fas fa-cogs"></i>
                <h2>License Management</h2>
            </div>
            <div class="card-body">
                <div class="management-tabs">
                    <button class="tab-btn active" data-tab="check">Check Status</button>
                    <button class="tab-btn" data-tab="manage">Manage Licenses</button>
                    <button class="tab-btn" data-tab="stats">Statistics</button>
                </div>
                
                <!-- Check License Status Tab -->
                <div id="check-tab" class="tab-content active">
                    <div class="form-group">
                        <label for="checkLicenseKey">
                            <i class="fas fa-search"></i>
                            License Key
                        </label>
                        <div class="license-check-container">
                            <input type="text" id="checkLicenseKey" placeholder="Enter license key to check status">
                            <button id="checkStatusBtn" class="btn-primary">Check Status</button>
                        </div>
                    </div>
                    <div id="licenseStatusResult" class="status-result" style="display: none;"></div>
                </div>
                
                <!-- Manage Licenses Tab -->
                <div id="manage-tab" class="tab-content">
                    <div class="manage-controls">
                        <div class="filter-group">
                            <select id="statusFilter">
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="expired">Expired</option>
                                <option value="revoked">Revoked</option>
                            </select>
                            <input type="text" id="emailFilter" placeholder="Filter by email">
                            <button id="filterLicensesBtn" class="btn-secondary">Filter</button>
                            <button id="refreshLicensesBtn" class="btn-secondary">Refresh</button>
                        </div>
                    </div>
                    <div id="allLicensesResult" class="licenses-table-container"></div>
                </div>
                
                <!-- Statistics Tab -->
                <div id="stats-tab" class="tab-content">
                    <div id="licenseStatsResult" class="stats-container"></div>
                </div>
            </div>
        </div>
    `;
    
    // Insert before the history section
    const historyCard = licenseHistoryDiv.closest('.card');
    mainContent.insertBefore(managementSection, historyCard);
    
    setupManagementEventListeners();
}

// Setup event listeners for management section
function setupManagementEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            switchTab(targetTab);
        });
    });
    
    // Check license status
    document.getElementById('checkStatusBtn').addEventListener('click', checkLicenseStatus);
    document.getElementById('checkLicenseKey').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkLicenseStatus();
        }
    });
    
    // Manage licenses
    document.getElementById('filterLicensesBtn').addEventListener('click', loadAllLicenses);
    document.getElementById('refreshLicensesBtn').addEventListener('click', () => loadAllLicenses(true));
    
    // Initial load
    loadAllLicenses();
}

// Switch between management tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'stats') {
        loadLicenseStats();
    }
}

// Check license status
async function checkLicenseStatus() {
    const licenseKey = document.getElementById('checkLicenseKey').value.trim();
    const resultDiv = document.getElementById('licenseStatusResult');
    
    if (!licenseKey) {
        showToast('Please enter a license key', 'error');
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div class="loading">Checking license status...</div>';
        resultDiv.style.display = 'block';
        
        const result = await LicenseAPI.checkLicenseStatus(licenseKey);
        
        const statusClass = result.valid ? 'valid' : 'invalid';
        const statusIcon = result.valid ? 'check-circle' : 'times-circle';
        
        resultDiv.innerHTML = `
            <div class="license-status ${statusClass}">
                <div class="status-header">
                    <i class="fas fa-${statusIcon}"></i>
                    <span>License ${result.valid ? 'Valid' : 'Invalid'}</span>
                </div>
                <div class="status-details">
                    <div class="detail-row">
                        <span class="label">License Key:</span>
                        <span class="license-key">${result.licenseKey}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Status:</span>
                        <span class="status-badge status-${result.status}">${result.status.toUpperCase()}</span>
                    </div>
                    ${!result.valid ? `
                        <div class="detail-row">
                            <span class="label">Reason:</span>
                            <span class="reason">${result.reason}</span>
                        </div>
                    ` : ''}
                    ${result.details ? `
                        <div class="detail-row">
                            <span class="label">Details:</span>
                            <span class="details">${result.details}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="label">Customer:</span>
                        <span>${result.license.customer.name} (${result.license.customer.email})</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Expires:</span>
                        <span>${new Date(result.license.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Features:</span>
                        <span>${result.license.features.join(', ')}</span>
                    </div>
                </div>
                <div class="status-actions">
                    ${result.license.status === 'active' ? `
                        <button onclick="suspendLicensePrompt('${licenseKey}')" class="btn-warning">
                            <i class="fas fa-pause"></i> Suspend License
                        </button>
                    ` : ''}
                    ${result.license.status === 'suspended' ? `
                        <button onclick="reactivateLicensePrompt('${licenseKey}')" class="btn-success">
                            <i class="fas fa-play"></i> Reactivate License
                        </button>
                    ` : ''}
                    <button onclick="viewLicenseHistory('${licenseKey}')" class="btn-secondary">
                        <i class="fas fa-history"></i> View History
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error: ${error.message}</span>
            </div>
        `;
        showToast('Failed to check license status', 'error');
    }
}

// Load all licenses
async function loadAllLicenses(refresh = false) {
    const resultDiv = document.getElementById('allLicensesResult');
    
    try {
        if (!refresh) {
            resultDiv.innerHTML = '<div class="loading">Loading licenses...</div>';
        }
        
        const filters = {};
        const statusFilter = document.getElementById('statusFilter').value;
        const emailFilter = document.getElementById('emailFilter').value.trim();
        
        if (statusFilter) filters.status = statusFilter;
        if (emailFilter) filters.email = emailFilter;
        filters.limit = 50;
        
        const result = await LicenseAPI.getAllLicenses(filters);
        
        if (result.licenses.length === 0) {
            resultDiv.innerHTML = '<div class="no-licenses">No licenses found</div>';
            return;
        }
        
        let tableHTML = `
            <div class="licenses-table">
                <table>
                    <thead>
                        <tr>
                            <th>License Key</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Expires</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        result.licenses.forEach(license => {
            const statusClass = license.currentStatus || license.status;
            tableHTML += `
                <tr class="license-row">
                    <td class="license-key">${license.key}</td>
                    <td>
                        <div class="customer-info">
                            <div class="name">${license.customer.name}</div>
                            <div class="email">${license.customer.email}</div>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge status-${statusClass}">${statusClass.toUpperCase()}</span>
                    </td>
                    <td>${new Date(license.expiresAt).toLocaleDateString()}</td>
                    <td class="actions">
                        <button onclick="viewLicenseDetails('${license.key}')" class="btn-small btn-primary" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${license.status === 'active' ? `
                            <button onclick="suspendLicensePrompt('${license.key}')" class="btn-small btn-warning" title="Suspend">
                                <i class="fas fa-pause"></i>
                            </button>
                        ` : ''}
                        ${license.status === 'suspended' ? `
                            <button onclick="reactivateLicensePrompt('${license.key}')" class="btn-small btn-success" title="Reactivate">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
            <div class="licenses-summary">
                Showing ${result.licenses.length} licenses
            </div>
        `;
        
        resultDiv.innerHTML = tableHTML;
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error loading licenses: ${error.message}</span>
            </div>
        `;
        showToast('Failed to load licenses', 'error');
    }
}

// Load license statistics
async function loadLicenseStats() {
    const resultDiv = document.getElementById('licenseStatsResult');
    
    try {
        resultDiv.innerHTML = '<div class="loading">Loading statistics...</div>';
        
        const result = await LicenseAPI.getLicenseStats();
        const stats = result.statistics;
        
        resultDiv.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card total">
                    <div class="stat-icon"><i class="fas fa-key"></i></div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.total}</div>
                        <div class="stat-label">Total Licenses</div>
                    </div>
                </div>
                <div class="stat-card active">
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.active}</div>
                        <div class="stat-label">Active Licenses</div>
                    </div>
                </div>
                <div class="stat-card suspended">
                    <div class="stat-icon"><i class="fas fa-pause-circle"></i></div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.suspended}</div>
                        <div class="stat-label">Suspended Licenses</div>
                    </div>
                </div>
                <div class="stat-card expired">
                    <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.expired}</div>
                        <div class="stat-label">Expired Licenses</div>
                    </div>
                </div>
                <div class="stat-card revoked">
                    <div class="stat-icon"><i class="fas fa-ban"></i></div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.revoked}</div>
                        <div class="stat-label">Revoked Licenses</div>
                    </div>
                </div>
                <div class="stat-card recent">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-content">
                        <div class="stat-number">${stats.recent}</div>
                        <div class="stat-label">Recent (30 days)</div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error loading statistics: ${error.message}</span>
            </div>
        `;
        showToast('Failed to load statistics', 'error');
    }
}

// Suspend license with prompt
async function suspendLicensePrompt(licenseKey) {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;
    
    try {
        await LicenseAPI.suspendLicense(licenseKey, reason);
        showToast('License suspended successfully', 'success');
        
        // Refresh current view
        if (document.getElementById('check-tab').classList.contains('active')) {
            document.getElementById('checkLicenseKey').value = licenseKey;
            checkLicenseStatus();
        }
        if (document.getElementById('manage-tab').classList.contains('active')) {
            loadAllLicenses();
        }
        loadLicenseStats();
        
    } catch (error) {
        showToast(`Failed to suspend license: ${error.message}`, 'error');
    }
}

// Reactivate license with prompt
async function reactivateLicensePrompt(licenseKey) {
    if (!confirm('Are you sure you want to reactivate this license?')) return;
    
    try {
        await LicenseAPI.reactivateLicense(licenseKey);
        showToast('License reactivated successfully', 'success');
        
        // Refresh current view
        if (document.getElementById('check-tab').classList.contains('active')) {
            document.getElementById('checkLicenseKey').value = licenseKey;
            checkLicenseStatus();
        }
        if (document.getElementById('manage-tab').classList.contains('active')) {
            loadAllLicenses();
        }
        loadLicenseStats();
        
    } catch (error) {
        showToast(`Failed to reactivate license: ${error.message}`, 'error');
    }
}

// View license details
function viewLicenseDetails(licenseKey) {
    document.getElementById('checkLicenseKey').value = licenseKey;
    switchTab('check');
    checkLicenseStatus();
}

// View license history
async function viewLicenseHistory(licenseKey) {
    try {
        const result = await LicenseAPI.getLicenseHistory(licenseKey);
        
        let historyHTML = `
            <div class="license-history-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>License History: ${licenseKey}</h3>
                        <button onclick="closeLicenseHistory()" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
        `;
        
        if (result.history.length === 0) {
            historyHTML += '<p>No history available for this license.</p>';
        } else {
            historyHTML += '<div class="history-timeline">';
            result.history.forEach(entry => {
                historyHTML += `
                    <div class="history-entry">
                        <div class="history-time">${new Date(entry.performed_at).toLocaleString()}</div>
                        <div class="history-action">${entry.action}</div>
                        ${entry.old_status ? `<div class="history-status">From: ${entry.old_status}</div>` : ''}
                        ${entry.new_status ? `<div class="history-status">To: ${entry.new_status}</div>` : ''}
                        ${entry.reason ? `<div class="history-reason">${entry.reason}</div>` : ''}
                        <div class="history-performer">By: ${entry.performed_by}</div>
                    </div>
                `;
            });
            historyHTML += '</div>';
        }
        
        historyHTML += `
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', historyHTML);
        
    } catch (error) {
        showToast(`Failed to load license history: ${error.message}`, 'error');
    }
}

// Close license history modal
function closeLicenseHistory() {
    const modal = document.querySelector('.license-history-modal');
    if (modal) {
        modal.remove();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    licenseForm.addEventListener('submit', handleFormSubmit);
    
    // Validity days change
    validityDaysSelect.addEventListener('change', handleValidityChange);
    
    // Copy license key
    copyKeyBtn.addEventListener('click', copyLicenseKey);
    
    // Download license
    downloadBtn.addEventListener('click', downloadLicenseInfo);
    
    // Email license
    emailBtn.addEventListener('click', emailLicenseInfo);
    
    // Generate another
    generateAnotherBtn.addEventListener('click', generateAnother);
    
    // Clear history
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Form reset
    licenseForm.addEventListener('reset', function() {
        hideLicenseResult();
    });
    
    // Real-time validation
    document.getElementById('customerEmail').addEventListener('input', validateEmail);
    document.getElementById('customerName').addEventListener('input', validateName);
}

// Handle form submission - Updated to use API
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(licenseForm);
    const customerEmail = formData.get('customerEmail').trim();
    const customerName = formData.get('customerName').trim();
    let validityDays = parseInt(formData.get('validityDays'));
    const features = formData.get('features').split(',').map(f => f.trim());
    
    // Handle custom days
    if (formData.get('validityDays') === 'custom') {
        validityDays = parseInt(formData.get('customDays'));
        if (!validityDays || validityDays < 1 || validityDays > 3650) {
            showToast('Please enter a valid number of days (1-3650)', 'error');
            return;
        }
    }
    
    // Validate inputs
    if (!validateInputs(customerEmail, customerName, validityDays)) {
        return;
    }
    
    // Show loading state
    const submitBtn = licenseForm.querySelector('button[type="submit"]');
    const originalContent = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="loading"></div> Generating...';
    submitBtn.disabled = true;
    
    try {
        // Generate license key via API
        const result = await LicenseAPI.generateLicense(
            customerEmail,
            customerName,
            validityDays,
            features
        );
        
        currentLicenseData = {
            licenseKey: result.license.key,
            email: result.license.customer.email,
            name: result.license.customer.name,
            features: result.license.features,
            maxActivations: result.license.maxActivations,
            expiry: new Date(result.license.expiresAt).getTime(),
            generated: new Date(result.license.generatedAt).getTime(),
            status: result.license.status,
            version: '1.0'
        };
        
        // Display result
        displayLicenseResult(currentLicenseData);
        
        // Save to localStorage for history (legacy compatibility)
        saveLicenseToHistory(currentLicenseData);
        
        // Update history display
        loadLicenseHistory();
        
        // Update stats if visible
        if (document.getElementById('stats-tab') && document.getElementById('stats-tab').classList.contains('active')) {
            loadLicenseStats();
        }
        
        showToast('License key generated successfully!', 'success');
        
    } catch (error) {
        console.error('License generation error:', error);
        showToast(`Failed to generate license: ${error.message}`, 'error');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalContent;
        submitBtn.disabled = false;
    }
}

// Validate inputs
function validateInputs(email, name, days) {
    if (!email || !name || !days) {
        showToast('Please fill in all required fields', 'error');
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        document.getElementById('customerEmail').focus();
        return false;
    }

    if (name.length < 2) {
        showToast('Customer name must be at least 2 characters long', 'error');
        document.getElementById('customerName').focus();
        return false;
    }

    if (days < 1 || days > 3650) {
        showToast('Validity period must be between 1 and 3650 days', 'error');
        return false;
    }

    return true;
}

function validateEmail() {
    const email = document.getElementById('customerEmail').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (email && !emailRegex.test(email)) {
        document.getElementById('customerEmail').setCustomValidity('Please enter a valid email address');
    } else {
        document.getElementById('customerEmail').setCustomValidity('');
    }
}

function validateName() {
    const name = document.getElementById('customerName').value;
    
    if (name && name.length < 2) {
        document.getElementById('customerName').setCustomValidity('Name must be at least 2 characters long');
    } else {
        document.getElementById('customerName').setCustomValidity('');
    }
}

function handleValidityChange() {
    const select = document.getElementById('validityDays');
    const customInput = document.getElementById('customDays');
    
    if (select.value === 'custom') {
        customInput.style.display = 'block';
        customInput.required = true;
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
}

function displayLicenseResult(licenseData) {
    generatedKeySpan.textContent = licenseData.licenseKey;
    document.getElementById('resultName').textContent = licenseData.name;
    document.getElementById('resultEmail').textContent = licenseData.email;
    document.getElementById('resultExpiry').textContent = new Date(licenseData.expiry).toLocaleDateString();
    document.getElementById('resultFeatures').textContent = licenseData.features.join(', ');
    document.getElementById('resultGenerated').textContent = new Date(licenseData.generated).toLocaleDateString();
    
    licenseResult.style.display = 'block';
    licenseResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideLicenseResult() {
    licenseResult.style.display = 'none';
    currentLicenseData = null;
}

async function copyLicenseKey() {
    try {
        const licenseKey = generatedKeySpan.textContent;
        await navigator.clipboard.writeText(licenseKey);
        
        // Visual feedback
        const originalIcon = copyKeyBtn.innerHTML;
        copyKeyBtn.innerHTML = '<i class="fas fa-check"></i>';
        copyKeyBtn.classList.add('copied');
        
        setTimeout(() => {
            copyKeyBtn.innerHTML = originalIcon;
            copyKeyBtn.classList.remove('copied');
        }, 2000);
        
        showToast('License key copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = generatedKeySpan.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showToast('License key copied to clipboard!', 'success');
    }
}

function downloadLicenseInfo() {
    if (!currentLicenseData) return;
    
    const licenseInfo = {
        'License Key': currentLicenseData.licenseKey,
        'Customer Name': currentLicenseData.name,
        'Customer Email': currentLicenseData.email,
        'Product ID': PRODUCT_ID,
        'Features': currentLicenseData.features.join(', '),
        'Max Activations': currentLicenseData.maxActivations,
        'Generated Date': new Date(currentLicenseData.generated).toLocaleDateString(),
        'Expiry Date': new Date(currentLicenseData.expiry).toLocaleDateString(),
        'Status': currentLicenseData.status || 'Active',
        'Version': currentLicenseData.version
    };
    
    // Create downloadable content
    let content = 'AOG Tech License Information\n';
    content += '=' .repeat(40) + '\n\n';
    
    for (const [key, value] of Object.entries(licenseInfo)) {
        content += `${key}: ${value}\n`;
    }
    
    content += '\n' + '=' .repeat(40) + '\n';
    content += 'This license is valid for the specified customer and product.\n';
    content += 'Keep this information secure and do not share with unauthorized users.\n';
    content += `Generated by AOG Tech License Generator on ${new Date().toLocaleDateString()}\n`;
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license-${currentLicenseData.licenseKey.replace(/[^A-Z0-9]/g, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('License information downloaded!', 'success');
}

function emailLicenseInfo() {
    if (!currentLicenseData) return;
    
    const subject = 'Your AOG Tech License Key';
    const body = `Dear ${currentLicenseData.name},

Thank you for your purchase. Your license information is below:

License Key: ${currentLicenseData.licenseKey}
Product: ${PRODUCT_ID}
Features: ${currentLicenseData.features.join(', ')}
Valid Until: ${new Date(currentLicenseData.expiry).toLocaleDateString()}
Max Activations: ${currentLicenseData.maxActivations}

Please keep this information secure and do not share it with unauthorized users.

Best regards,
AOG Tech Support Team`;
    
    const mailtoLink = `mailto:${currentLicenseData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}

function generateAnother() {
    hideLicenseResult();
    licenseForm.reset();
    document.getElementById('customerEmail').focus();
    
    // Reset custom days if shown
    const customInput = document.getElementById('customDays');
    customInput.style.display = 'none';
    customInput.required = false;
}

function saveLicenseToHistory(licenseData) {
    try {
        let history = JSON.parse(localStorage.getItem('licenseHistory')) || [];
        
        // Add current license to history
        history.unshift({
            ...licenseData,
            id: Date.now()
        });
        
        // Keep only last 50 entries
        history = history.slice(0, 50);
        
        localStorage.setItem('licenseHistory', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadLicenseHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('licenseHistory')) || [];
        
        if (history.length === 0) {
            licenseHistoryDiv.innerHTML = `
                <div class="no-history">
                    <i class="fas fa-info-circle"></i>
                    <p>No licenses generated yet</p>
                </div>
            `;
            return;
        }
        
        let historyHTML = '';
        history.slice(0, 10).forEach(license => {
            historyHTML += `
                <div class="history-item">
                    <div class="license-summary">
                        <div class="license-key-display">${license.licenseKey}</div>
                        <div class="customer-info">
                            <strong>${license.name}</strong> - ${license.email}
                        </div>
                        <div class="license-meta">
                            <span class="expiry">Expires: ${new Date(license.expiry).toLocaleDateString()}</span>
                            <span class="generated">Generated: ${new Date(license.generated).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button onclick="copyHistoryKey('${license.licenseKey}')" class="btn-small btn-secondary" title="Copy Key">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button onclick="checkHistoryLicenseStatus('${license.licenseKey}')" class="btn-small btn-primary" title="Check Status">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        licenseHistoryDiv.innerHTML = historyHTML;
        
    } catch (error) {
        console.error('Error loading localStorage:', error);
        licenseHistoryDiv.innerHTML = `
            <div class="no-history">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading history</p>
            </div>
        `;
    }
}

async function copyHistoryKey(licenseKey) {
    try {
        await navigator.clipboard.writeText(licenseKey);
        showToast('License key copied!', 'success');
    } catch (error) {
        showToast('Failed to copy license key', 'error');
    }
}

function checkHistoryLicenseStatus(licenseKey) {
    document.getElementById('checkLicenseKey').value = licenseKey;
    switchTab('check');
    checkLicenseStatus();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear the license history? This action cannot be undone.')) {
        localStorage.removeItem('licenseHistory');
        loadLicenseHistory();
        showToast('License history cleared', 'success');
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
} 