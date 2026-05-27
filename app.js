import DB from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    setupNavigation();
    refreshDashboard();
    loadInventory();
});

// --- NAVIGATION ---
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

// --- POS / BILLING LOGIC (NEW) ---
let cart = [];
const posSearch = document.getElementById('pos-search');
const posSearchResults = document.getElementById('pos-search-results');
const posCartList = document.getElementById('pos-cart-list');
const posTotal = document.getElementById('pos-total');
const btnCheckout = document.getElementById('btn-checkout');

// Search Medicine for Billing
posSearch.addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    posSearchResults.innerHTML = '';
    if(query.length < 1) return;

    const inventory = await DB.getTable('inventory');
    const results = inventory.filter(item => item.name.toLowerCase().includes(query) && parseInt(item.qty) > 0);
    
    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-2 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded mt-1';
        div.innerHTML = `
            <div>
                <p class="font-semibold text-sm text-gray-800">${item.name}</p>
                <p class="text-xs text-gray-500">₹${item.mrp} | Stock: ${item.qty}</p>
            </div>
            <button class="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold" onclick="addToCart('${item.id}')">Add</button>
        `;
        posSearchResults.appendChild(div);
    });
});

window.addToCart = async (id) => {
    const inventory = await DB.getTable('inventory');
    const item = inventory.find(i => i.id === id);
    if(!item) return;

    const existingItem = cart.find(i => i.id === id);
    if(existingItem) {
        if(existingItem.cartQty < parseInt(item.qty)) {
            existingItem.cartQty++;
        } else {
            alert('Not enough stock available!');
        }
    } else {
        cart.push({...item, cartQty: 1});
    }
    
    posSearch.value = '';
    posSearchResults.innerHTML = '';
    renderCart();
};

function renderCart() {
    posCartList.innerHTML = '';
    let total = 0;
    
    if(cart.length === 0) {
        posCartList.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Cart is empty</p>';
        posTotal.innerText = '₹0.00';
        btnCheckout.disabled = true;
        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = parseFloat(item.mrp) * item.cartQty;
        total += itemTotal;
        
        posCartList.innerHTML += `
            <div class="flex justify-between items-center text-sm border-b pb-2">
                <div class="w-1/2">
                    <p class="font-bold text-gray-800 truncate">${item.name}</p>
                    <p class="text-xs text-gray-500">₹${item.mrp} x ${item.cartQty}</p>
                </div>
                <div class="font-bold text-gray-800">₹${itemTotal.toFixed(2)}</div>
                <button onclick="removeFromCart(${index})" class="text-red-500 p-2"><i data-feather="x-circle" class="w-4 h-4"></i></button>
            </div>
        `;
    });
    
    posTotal.innerText = `₹${total.toFixed(2)}`;
    btnCheckout.disabled = false;
    feather.replace(); // Refresh icons
}

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    renderCart();
};

// Checkout & Update Database
btnCheckout.addEventListener('click', async () => {
    if(cart.length === 0) return;
    
    let totalAmount = 0;
    let totalProfit = 0; // Simple v1 logic: Flat 15% estimated profit margin
    
    const inventory = await DB.getTable('inventory');
    
    cart.forEach(cartItem => {
        // Find in DB and deduct stock
        const dbItem = inventory.find(i => i.id === cartItem.id);
        if(dbItem) {
            dbItem.qty = (parseInt(dbItem.qty) - cartItem.cartQty).toString();
        }
        
        const itemTot = parseFloat(cartItem.mrp) * cartItem.cartQty;
        totalAmount += itemTot;
        totalProfit += itemTot * 0.15; // 15% margin
    });

    // Save updated inventory stock
    await DB.saveTable('inventory', inventory);

    // Save Sale to Dashboard History
    const sales = await DB.getTable('sales');
    const saleRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        items: cart,
        totalAmount: totalAmount.toFixed(2),
        totalProfit: totalProfit.toFixed(2)
    };
    sales.push(saleRecord);
    await DB.saveTable('sales', sales);

    // Reset everything
    cart = [];
    renderCart();
    await loadInventory();
    await refreshDashboard();
    
    alert('✅ Invoice Generated & Stock Updated!');
    
    // Auto-switch to Dashboard to show new sales numbers
    document.querySelector('[data-target="dashboard"]').click();
});

// --- INVENTORY LOGIC (From Phase 2) ---
const invForm = document.getElementById('form-add-medicine');
const invList = document.getElementById('inv-list');
const invSearch = document.getElementById('inv-search');

async function loadInventory(searchQuery = '') {
    const inventory = await DB.getTable('inventory');
    invList.innerHTML = '';
    
    const filtered = inventory.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if(filtered.length === 0) {
        invList.innerHTML = `<p class="text-center text-gray-400 text-sm py-4">No medicines found.</p>`;
        return;
    }

    filtered.forEach(item => {
        const isLowStock = parseInt(item.qty) < 10;
        
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

invForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newItem = {
        id: Date.now().toString(),
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
    alert('✅ Medicine Saved!');
});

invSearch.addEventListener('input', (e) => loadInventory(e.target.value));

window.deleteMedicine = async (id) => {
    if(confirm('Delete this medicine?')) {
        let inventory = await DB.getTable('inventory');
        inventory = inventory.filter(item => item.id !== id);
        await DB.saveTable('inventory', inventory);
        loadInventory();
    }
};
