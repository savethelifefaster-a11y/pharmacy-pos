localforage.config({ name: 'PharmaPOS_PRO', storeName: 'pharmacy_data' });
const DB = {
    getTable: async (t) => (await localforage.getItem(t)) || [],
    saveTable: async (t, d) => await localforage.setItem(t, d)
};

