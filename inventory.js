console.log("Inventory Module Loaded");
// async function loadInventory(q = '') {
    const inv = await DB.getTable('inventory');
    const list = document.getElementById('inv-list');
    list.innerHTML = '';
    const f = inv.filter(i => (i.name||'').toLowerCase().includes(q.toLowerCase()));
    
    f.forEach(i => {
        const priStock = Math.floor(parseInt(i.baseQty || 0) / (parseInt(i.conv) || 1));
        list.innerHTML += `
            <div class="border p-3 rounded mb-2 bg-white">
                <div class="flex justify-between">
                    <div>
                        <p class="font-bold text-sm">${i.name}</p>
                        <p class="text-xs text-gray-500">Stock: ${priStock} ${i.unitPri}</p>
                    </div>
                    <button onclick="promptPurchase('${i.id}')" class="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-bold">Add Stock</button>
                </div>
            </div>`;
    });
}

window.promptPurchase = (id) => {
    const qty = prompt("Enter quantity to add:");
    if(qty) handlePurchase(id, qty, "New Batch", "2026-12", "0.00");
};
Yahan hum baad mein specific inventory functions dalenge

