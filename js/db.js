const DB = (() => {
  const KEYS = { products: 'ekp_products', clients: 'ekp_clients', orders: 'ekp_orders', flagged: 'ekp_initialized', ver: 'ekp_ver' };
  const VERSION = '2';  // версия данных; при изменении структуры/картинок увеличьте — сайт перечитает JSON

  function loadJSON(name) {
    return fetch(`data/${name}.json`).then(r => r.json());
  }

  async function init() {
    // если версия изменилась — перечитываем данные из JSON (сбрасываем локальное хранилище)
    if (localStorage.getItem(KEYS.ver) !== VERSION) {
      localStorage.removeItem(KEYS.flagged);
      localStorage.removeItem(KEYS.products);
      localStorage.removeItem(KEYS.clients);
      localStorage.removeItem(KEYS.orders);
    }
    if (localStorage.getItem(KEYS.flagged)) return;
    const [products, clients, orders] = await Promise.all([
      loadJSON('products'),
      loadJSON('clients'),
      loadJSON('orders'),
    ]);
    localStorage.setItem(KEYS.products, JSON.stringify(products));
    localStorage.setItem(KEYS.clients, JSON.stringify(clients));
    localStorage.setItem(KEYS.orders, JSON.stringify(orders));
    localStorage.setItem(KEYS.flagged, '1');
    localStorage.setItem(KEYS.ver, VERSION);
  }

  function reset() {
    localStorage.removeItem(KEYS.flagged);
    localStorage.removeItem(KEYS.products);
    localStorage.removeItem(KEYS.clients);
    localStorage.removeItem(KEYS.orders);
    return init();
  }

  const read = key => { try { return JSON.parse(localStorage.getItem(KEYS[key])) || []; } catch { return []; } };
  const write = (key, val) => localStorage.setItem(KEYS[key], JSON.stringify(val));

  function products() { return read('products'); }
  function clients() { return read('clients'); }
  function orders() { return read('orders'); }

  function productById(id) { return products().find(p => p.id === Number(id)) || null; }
  function saveProducts(list) { write('products', list); }
  function saveClients(list) { write('clients', list); }
  function saveOrders(list) { write('orders', list); }

  function nextId(list, prefix) {
    return list.reduce((m, x) => Math.max(m, Number(x.id) || 0), prefix) + 1;
  }

  function categories() {
    return [...new Set(products().map(p => p.category))];
  }

  function formatPrice(n) {
    return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  }

  return {
    init, reset, products, clients, orders, productById,
    saveProducts, saveClients, saveOrders, nextId, categories,
    formatPrice, KEYS,
  };
})();