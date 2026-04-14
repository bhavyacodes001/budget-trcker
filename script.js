// Initialize state
let entries = JSON.parse(localStorage.getItem('entries')) || [];
let budgetLimits = JSON.parse(localStorage.getItem('budgetLimits')) || {};
let currentFilter = 'all'; // For Type: all, income, expense
let currentMonthFilter = ''; // For Date: 'YYYY-MM'

// Chart instances
let balanceChartInstance = null;
let categoryChartInstance = null;

// Category definitions
const CATEGORIES = {
    income: ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'],
    expense: ['Food', 'Rent', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Utilities', 'Other']
};

// Category colours (badge bg + text)
const CATEGORY_COLORS = {
    // Income
    Salary: 'bg-emerald-100 text-emerald-700',
    Freelance: 'bg-teal-100 text-teal-700',
    Business: 'bg-cyan-100 text-cyan-700',
    Investment: 'bg-sky-100 text-sky-700',
    Gift: 'bg-violet-100 text-violet-700',
    // Expense
    Food: 'bg-orange-100 text-orange-700',
    Rent: 'bg-rose-100 text-rose-700',
    Transport: 'bg-yellow-100 text-yellow-700',
    Shopping: 'bg-pink-100 text-pink-700',
    Entertainment: 'bg-purple-100 text-purple-700',
    Health: 'bg-red-100 text-red-700',
    Education: 'bg-blue-100 text-blue-700',
    Utilities: 'bg-indigo-100 text-indigo-700',
    Other: 'bg-gray-100 text-gray-600'
};

// DOM Elements
const form = document.getElementById('expense-form');
const entriesList = document.getElementById('entries-list');
const totalIncomeElement = document.getElementById('total-income');
const totalExpensesElement = document.getElementById('total-expenses');
const netBalanceElement = document.getElementById('net-balance');
const filterInputs = document.querySelectorAll('input[name="filter"]');
const filterMonthInput = document.getElementById('filter-month');
const categorySelect = document.getElementById('category');
const typeRadios = document.querySelectorAll('input[name="type"]');
const entryDateInput = document.getElementById('entry-date');

// Budget Elements
const budgetForm = document.getElementById('budget-form');
const budgetCategorySelect = document.getElementById('budget-category');
const budgetProgressContainer = document.getElementById('budget-progress-container');

// Populate budget categories
CATEGORIES.expense.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    budgetCategorySelect.appendChild(opt);
});

// Set today's date as default
entryDateInput.value = new Date().toISOString().split('T')[0];

// Event Listeners
form.addEventListener('submit', handleSubmit);
filterInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderEntries();
    });
});

filterMonthInput.addEventListener('change', (e) => {
    currentMonthFilter = e.target.value;
    renderEntries();
    updateSummary();
});

// Budget Listener
budgetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = budgetCategorySelect.value;
    const limit = parseFloat(document.getElementById('budget-limit').value);
    
    if (cat && limit > 0) {
        budgetLimits[cat] = limit;
        localStorage.setItem('budgetLimits', JSON.stringify(budgetLimits));
        budgetForm.reset();
        showNotification(`Budget limit set for ${cat}`, 'success');
        updateSummary(); // Re-render progress bars
    }
});

// Populate category dropdown when type changes
typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        populateCategoryDropdown(e.target.value);
    });
});

function populateCategoryDropdown(type) {
    categorySelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select Category --';
    categorySelect.appendChild(placeholder);

    (CATEGORIES[type] || []).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

function updateMonthFilterOptions() {
    // Unique months in format YYYY-MM
    const uniqueMonths = [...new Set(entries.map(e => e.date ? e.date.substring(0, 7) : ''))].filter(Boolean).sort().reverse();
    
    const currentVal = filterMonthInput.value;
    filterMonthInput.innerHTML = '<option value="">All Time</option>';
    
    uniqueMonths.forEach(ym => {
        const [year, month] = ym.split('-');
        const date = new Date(year, month - 1, 1);
        const name = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const opt = document.createElement('option');
        opt.value = ym;
        opt.textContent = name;
        filterMonthInput.appendChild(opt);
    });
    
    // Retain previous selection if valid
    if (uniqueMonths.includes(currentVal)) {
        filterMonthInput.value = currentVal;
    } else {
        filterMonthInput.value = '';
        currentMonthFilter = '';
    }
}

// Initialize the app
updateMonthFilterOptions();
renderEntries();
updateSummary();

// Functions
function handleSubmit(e) {
    e.preventDefault();

    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const typeChecked = document.querySelector('input[name="type"]:checked');
    const type = typeChecked ? typeChecked.value : '';
    const category = categorySelect.value;
    const entryDate = entryDateInput.value;

    if (!description || !amount || !type || !category || !entryDate) {
        showNotification('Please fill in all fields including category', 'error');
        return;
    }

    const entry = {
        id: Date.now(),
        description,
        amount,
        type,
        category,
        date: entryDate
    };

    entries.push(entry);
    saveToLocalStorage();
    updateMonthFilterOptions();
    renderEntries();
    updateSummary();
    form.reset();
    categorySelect.innerHTML = '<option value="">-- Select Type First --</option>';
    entryDateInput.value = new Date().toISOString().split('T')[0];

    // Show success message with animation
    showNotification('Entry added successfully!', 'success');

    // Budget Warning Check
    if (type === 'expense' && budgetLimits[category]) {
        // Calculate total for this exact month + category
        const entryMonth = entryDate.substring(0, 7);
        const currentTotal = entries
            .filter(e => e.date && e.date.startsWith(entryMonth) && e.type === 'expense' && e.category === category)
            .reduce((sum, e) => sum + e.amount, 0);

        if (currentTotal > budgetLimits[category]) {
            setTimeout(() => showNotification(`Warning: You have exceeded your budget for ${category}!`, 'error'), 1000);
        } else if (currentTotal >= budgetLimits[category] * 0.8) {
            setTimeout(() => showNotification(`Nearing limit: 80%+ of ${category} budget used.`, 'info'), 1000);
        }
    }

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
                updateMonthFilterOptions();
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

    // Populate category dropdown for this type, then select the saved category
    populateCategoryDropdown(entry.type);
    categorySelect.value = entry.category || '';

    // Restore the saved date
    entryDateInput.value = entry.date || new Date().toISOString().split('T')[0];

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
        // Type filter check
        if (currentFilter !== 'all' && entry.type !== currentFilter) {
            return false;
        }
        
        // Month filter check ('YYYY-MM')
        if (currentMonthFilter && (!entry.date || !entry.date.startsWith(currentMonthFilter))) {
            return false;
        }
        
        return true;
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

        // entry.date is now 'YYYY-MM-DD' string — parse correctly without timezone shift
        const dateStr = entry.date || new Date().toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const formattedDate = date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const catColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other'];

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formattedDate}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${entry.description}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="category-badge ${catColor}">
                    ${entry.category || '—'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="status-badge ${entry.type === 'income' ? 'status-income' : 'status-expense'}">
                    ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'
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
    // Determine which entries to include in the summary
    const summaryEntries = currentMonthFilter 
        ? entries.filter(entry => entry.date && entry.date.startsWith(currentMonthFilter)) 
        : entries;

    const totalIncome = summaryEntries
        .filter(entry => entry.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);

    const totalExpenses = summaryEntries
        .filter(entry => entry.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

    const netBalance = totalIncome - totalExpenses;

    // Animate number changes
    animateNumber(totalIncomeElement, totalIncome);
    animateNumber(totalExpensesElement, totalExpenses);
    animateNumber(netBalanceElement, netBalance);

    // Update net balance color based on value
    netBalanceElement.className = `text-3xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'
        }`;

    // Update charts and budget progress
    renderCharts(summaryEntries);
    renderBudgetProgress(summaryEntries);
}

function renderBudgetProgress(summaryEntries) {
    budgetProgressContainer.innerHTML = '';
    const activeLimits = Object.keys(budgetLimits);
    
    if(activeLimits.length === 0) {
        budgetProgressContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No budget limits set yet. Select a category above.</p>';
        return;
    }
    
    // Calculate total spent per category in currently viewed entries
    const expenses = summaryEntries.filter(e => e.type === 'expense');
    const spentPerCategory = {};
    expenses.forEach(e => {
        spentPerCategory[e.category] = (spentPerCategory[e.category] || 0) + e.amount;
    });
    
    // Render progress bar for each set limit
    activeLimits.forEach(cat => {
        const limit = budgetLimits[cat];
        const spent = spentPerCategory[cat] || 0;
        const percentage = Math.min((spent / limit) * 100, 100).toFixed(1);
        
        let colorClass = 'bg-blue-500';
        if (percentage >= 100) colorClass = 'bg-red-500';
        else if (percentage >= 80) colorClass = 'bg-yellow-500';
        
        const div = document.createElement('div');
        div.className = 'w-full';
        div.innerHTML = `
            <div class="flex justify-between mb-1">
                <span class="text-sm font-medium text-gray-700">${cat}</span>
                <span class="text-sm font-medium ${percentage >= 100 ? 'text-red-600' : 'text-gray-700'}">₹${spent.toFixed(2)} / ₹${limit.toFixed(2)}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
                <div class="${colorClass} h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
            </div>
        `;
        // Double click to remove limit
        div.addEventListener('dblclick', () => {
             if(confirm(`Remove budget limit for ${cat}?`)) {
                 delete budgetLimits[cat];
                 localStorage.setItem('budgetLimits', JSON.stringify(budgetLimits));
                 updateSummary();
             }
        });
        div.title = "Double-click to remove limit";
        div.style.cursor = "pointer";

        budgetProgressContainer.appendChild(div);
    });
}

function renderCharts(entriesToChart) {
    const totalIncome = entriesToChart.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = entriesToChart.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    
    // Balance Doughnut Chart
    const balanceCtx = document.getElementById('balanceChart');
    if (balanceChartInstance) balanceChartInstance.destroy();
    
    balanceChartInstance = new Chart(balanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: ['#10B981', '#EF4444'], // Tailwind green-500, red-500
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Category Pie Chart
    const expenses = entriesToChart.filter(e => e.type === 'expense');
    const categoryTotals = {};
    expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const categoryLabels = Object.keys(categoryTotals);
    const categoryData = Object.values(categoryTotals);

    const categoryCtx = document.getElementById('categoryChart');
    if (categoryChartInstance) categoryChartInstance.destroy();

    // Map Tailwind colors approx
    const catColors = {
        'Food': '#fb923c', 'Rent': '#f43f5e', 'Transport': '#facc15', 'Shopping': '#f472b6',
        'Entertainment': '#c084fc', 'Health': '#f87171', 'Education': '#60a5fa', 'Utilities': '#818cf8', 'Other': '#9ca3af'
    };
    
    const bgColors = categoryLabels.map(label => catColors[label] || '#9ca3af');

    categoryChartInstance = new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: categoryLabels.length > 0 ? categoryLabels : ['No Expenses Yet'],
            datasets: [{
                data: categoryData.length > 0 ? categoryData : [1],
                backgroundColor: categoryData.length > 0 ? bgColors : ['#e5e7eb'], // gray-200 empty
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { enabled: categoryData.length > 0 } // Hide tooltips if empty
            }
        }
    });
}

function animateNumber(element, value) {
    const start = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const end = value || 0;
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
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
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