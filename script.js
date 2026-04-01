// Initialize state
let entries = JSON.parse(localStorage.getItem('entries')) || [];
let currentFilter = 'all';

// DOM Elements
const form = document.getElementById('expense-form');
const entriesList = document.getElementById('entries-list');
const totalIncomeElement = document.getElementById('total-income');
const totalExpensesElement = document.getElementById('total-expenses');
const netBalanceElement = document.getElementById('net-balance');
const filterInputs = document.querySelectorAll('input[name="filter"]');

// Event Listeners
form.addEventListener('submit', handleSubmit);
filterInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderEntries();
    });
});

// Initialize the app
renderEntries();
updateSummary();

// Functions
function handleSubmit(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.querySelector('input[name="type"]:checked').value;
    
    if (!description || !amount || !type) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    const entry = {
        id: Date.now(),
        description,
        amount,
        type,
        date: new Date().toISOString()
    };

    entries.push(entry);
    saveToLocalStorage();
    renderEntries();
    updateSummary();
    form.reset();
    
    // Show success message with animation
    showNotification('Entry added successfully!', 'success');
    
    // Add animation to the new entry
    const newRow = entriesList.lastElementChild;
    if (newRow) {
        newRow.classList.add('animate__animated', 'animate__fadeIn');
    }
}

function deleteEntry(id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        const row = document.querySelector(`tr[data-id="${id}"]`);
        if (row) {
            row.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                entries = entries.filter(entry => entry.id !== id);
                saveToLocalStorage();
                renderEntries();
                updateSummary();
                showNotification('Entry deleted successfully!', 'success');
            }, 500);
        }
    }
}

function editEntry(id) {
    const entry = entries.find(entry => entry.id === id);
    if (!entry) return;

    // Populate form with entry data
    document.getElementById('description').value = entry.description;
    document.getElementById('amount').value = entry.amount;
    document.querySelector(`input[name="type"][value="${entry.type}"]`).checked = true;

    // Remove the entry from the list
    entries = entries.filter(e => e.id !== id);
    saveToLocalStorage();
    renderEntries();
    updateSummary();
    
    // Scroll to form with smooth animation
    document.getElementById('expense-form').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
    
    showNotification('Entry loaded for editing!', 'info');
}

function renderEntries() {
    entriesList.innerHTML = '';
    
    const filteredEntries = entries.filter(entry => {
        if (currentFilter === 'all') return true;
        return entry.type === currentFilter;
    });

    if (filteredEntries.length === 0) {
        entriesList.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center py-8">
                        <svg class="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <p class="text-lg font-medium">No entries found</p>
                        <p class="text-sm text-gray-500">Add your first entry above!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    filteredEntries.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.className = 'entry-item hover:bg-gray-50';
        row.setAttribute('data-id', entry.id);
        
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formattedDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${entry.description}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="status-badge ${entry.type === 'income' ? 'status-income' : 'status-expense'}">
                    ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${
                entry.type === 'income' ? 'text-green-600' : 'text-red-600'
            }">
                ${entry.type === 'income' ? '+' : '-'}₹${entry.amount.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div class="flex items-center space-x-3">
                    <button onclick="editEntry(${entry.id})" class="text-blue-600 hover:text-blue-900 transition-colors duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                    <button onclick="deleteEntry(${entry.id})" class="text-red-600 hover:text-red-900 transition-colors duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        entriesList.appendChild(row);
        
        // Add staggered animation for entries
        setTimeout(() => {
            row.classList.add('animate__animated', 'animate__fadeIn');
        }, index * 100);
    });
}

function updateSummary() {
    const totalIncome = entries
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalExpenses = entries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);
    
    const netBalance = totalIncome - totalExpenses;
    
    // Animate number changes
    animateNumber(totalIncomeElement, totalIncome);
    animateNumber(totalExpensesElement, totalExpenses);
    animateNumber(netBalanceElement, netBalance);
    
    // Update net balance color based on value
    netBalanceElement.className = `text-3xl font-bold ${
        netBalance >= 0 ? 'text-green-600' : 'text-red-600'
    }`;
}

function animateNumber(element, value) {
    const start = parseFloat(element.textContent.replace(/[^0-9.-]+/g, ''));
    const end = value;
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const current = start + (end - start) * easeOutQuart;
        element.textContent = `₹${current.toFixed(2)}`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function saveToLocalStorage() {
    localStorage.setItem('entries', JSON.stringify(entries));
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } notification`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('translate-y-0');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
} 