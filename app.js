import DB from './db.js';

// --- SYSTEM INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    setupNavigation();
    refreshDashboard();
    loadInventory(); // Load stock on boot
});

// --- MOBILE ROUTING ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const modules = document.querySelectorAll('.module-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.currentTarget.getAttribute('data-target');
            
            modules.forEach(mod => mod.classList.add('hidden-section'));
            document.getElementById(`module-${targetId}`).classList.remove('hidden-section');
            
            navButtons.forEach(b => {
                b.classList.remove('text-emerald-600');
                b.classList.add('text-gray-400');
            });
            btn.currentTarget.classList.remove('text-gray-400');
            btn.currentTarget.classList.add('text-emerald-600');
        });
    });
}

// --- DASHBOARD LOGIC ---
async function refreshDashboard() {
    const sales = await DB.getTable('sales');
    let todayTotal = 0, todayProfit = 0;
    const today = new Date().toISOString().split('T')[0];
    
    sales.forEach(sale => {
        if(sale.date === today) {
            todayTotal += parseFloat(sale.totalAmount);
            todayProfit += parseFloat(sale.totalProfit);
        }
    });

    document.getElementById('dash-sales').innerText = `₹${todayTotal.toFixed(2)}`;
    document.getElementById('dash-profit').innerText = `₹${todayProfit.toFixed(2)}`;
}

// --- INVENTORY LOGIC ---
const invForm = document.getElementById('form-add-medicine');
const invList = document.getElementById('inv-list');
const invSearch = document.getElementById('inv-search');

// Load and display medicines
async function loadInventory(searchQuery = '') {
    const inventory = await DB.getTable('inventory');
    invList.innerHTML = '';
    
    // Filter by search
    const filtered = inventory.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if(filtered.length === 0) {
        invList.innerHTML = `<p class="text-center text-gray-400 text-sm py-4">No medicines found.</p>`;
        return;
    }

    filtered.forEach(item => {
        const isLowStock = parseInt(item.qty) < 10; // Mobile Bug Hunter check: Flag low stock visually
        
        invList.innerHTML += `
            <div class="border rounded p-3 flex justify-between items-center ${isLowStock ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}">
                <div class="w-3/4">
                    <p class="font-bold text-gray-800 truncate">${item.name}</p>
                    <p class="text-xs text-gray-500 mt-1">Batch: ${item.batch} | Exp: ${item.expiry}</p>
                    <p class="text-sm font-semibold text-gray-700 mt-1">MRP: ₹${item.mrp}</p>
                </div>
                <div class="w-1/4 text-right flex flex-col items-end">
                    <span class="text-sm font-bold ${isLowStock ? 'text-red-600' : 'text-emerald-600'} bg-gray-100 px-2 py-1 rounded">
                        ${item.qty} units
                    </span>
                    <button onclick="deleteMedicine('${item.id}')" class="text-red-500 text-xs mt-2 font-semibold">Remove</button>
                </div>
            </div>
        `;
    });
}

// Add new medicine
invForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevents page reload on mobile
    
    const newItem = {
        id: Date.now().toString(), // Unique ID based on timestamp
        name: document.getElementById('inv-name').value,
        batch: document.getElementById('inv-batch').value,
        expiry: document.getElementById('inv-expiry').value,
        mrp: document.getElementById('inv-mrp').value,
        qty: document.getElementById('inv-qty').value
    };

    const inventory = await DB.getTable('inventory');
    inventory.push(newItem);
    await DB.saveTable('inventory', inventory);
    
    invForm.reset();
    await loadInventory();
    
    // Quick mobile alert
    alert('✅ Medicine Saved!');
});

// Search functionality (Real-time)
invSearch.addEventListener('input', (e) => {
    loadInventory(e.target.value);
});

// Global Delete Function (Attached to window so inline HTML onclick can access it)
window.deleteMedicine = async (id) => {
    if(confirm('Delete this medicine?')) {
        let inventory = await DB.getTable('inventory');
        inventory = inventory.filter(item => item.id !== id);
        await DB.saveTable('inventory', inventory);
        loadInventory();
    }
};

