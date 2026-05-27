console.log("POS Module Loaded");
let cart = [];

document.getElementById('pos-search').addEventListener('input', async (e) => {
    const q = e.target.value.toLowerCase();
    const res = document.getElementById('pos-search-results');
    res.innerHTML = '';
    if(q.length < 1) return;
    const inv = await DB.getTable('inventory');
    const filtered = inv.filter(i => (i.name.toLowerCase().includes(q) || (i.salt||'').toLowerCase().includes(q)) && parseInt(i.baseQty) > 0);
    
    filtered.forEach(i => {
        res.innerHTML += `
            <div class="p-3 border-b flex justify-between items-center bg-white hover:bg-blue-50 cursor-pointer" onclick="addToCart('${i.id}')">
                <div><p class="font-bold text-sm text-gray-800">${i.name}</p><p class="text-[10px] text-gray-500">Stock: ${Math.floor(i.baseQty/i.conv)}</p></div>
                <p class="text-green-600 font-bold">₹${i.sp}</p>
            </div>`;
    });
});

window.addToCart = async (id) => {
    const inv = await DB.getTable('inventory');
    const item = inv.find(i => i.id === id);
    if(!item) return;
    const ext = cart.find(i => i.id === id);
    if(!ext) { cart.push({...item, cartQty: 1, sellUnitType: 'PRI'}); renderCart(); }
};

function renderCart() {
    const list = document.getElementById('pos-cart-list');
    list.innerHTML = '';
    let total = 0;
    cart.forEach((i, idx) => {
        let price = i.sellUnitType === 'PRI' ? i.sp : (i.sp / i.conv);
        total += (price * i.cartQty);
        list.innerHTML += `<div class="p-2 border-b text-sm"><b>${i.name}</b> - ${i.cartQty} ${i.unitPri} - ₹${(price*i.cartQty).toFixed(2)}</div>`;
    });
    document.getElementById('pos-total').innerText = `₹${total.toFixed(2)}`;
}
