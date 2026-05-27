console.log("Purchase Module Loaded");

async function handlePurchase(itemId, additionalBaseQty, newBatch, newExpiry, purchasePrice) {
    const inv = await DB.getTable('inventory');
    const item = inv.find(i => i.id === itemId);
    
    if (item) {
        // Update Base Stock
        item.baseQty = (parseInt(item.baseQty) + parseInt(additionalBaseQty)).toString();
        // Update Batch & Expiry (Latest Inward)
        item.batch = newBatch;
        item.expiry = newExpiry;
        item.pp = parseFloat(purchasePrice);
        
        await DB.saveTable('inventory', inv);
        alert(`✅ ${item.name} stock updated!`);
        loadInventory(); // Function from inventory.js
    }
}

