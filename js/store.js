const Store = (() => {
  function emit() { window.dispatchEvent(new CustomEvent('store:change')); }

  // Корзина (CartContext)
  const CART_KEY = 'ekp_cart';
  function getCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch { return {}; } }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
  function cartCount() { return Object.values(getCart()).reduce((s, n) => s + Number(n) || 0, 0); }
  function cartTotal() {
    const cart = getCart();
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = DB.productById(id); return p ? sum + p.price * qty : sum;
    }, 0);
  }
  function cartItems() {
    return Object.entries(getCart()).map(([id, qty]) => ({ product: DB.productById(id), qty }))
      .filter(x => x.product);
  }
  function addToCart(id, qty = 1) {
    const cart = getCart(); cart[id] = (cart[id] || 0) + qty; saveCart(cart); emit();
  }
  function setCartQty(id, qty) {
    const cart = getCart();
    if (qty <= 0) delete cart[id]; else cart[id] = qty;
    saveCart(cart); emit();
  }
  function clearCart() { saveCart({}); emit(); }

  // Авторизация (AuthContext)
  const AUTH_KEY = 'ekp_auth';
  function currentUser() {
    const id = localStorage.getItem(AUTH_KEY);
    if (!id) return null;
    return DB.clients().find(c => c.id === Number(id)) || null;
  }
  const isAuthed = () => !!currentUser();
  const isAdmin = () => { const u = currentUser(); return u && u.role === 'admin'; };
  function login(email, password) {
    const u = DB.clients().find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!u) return { error: 'Пользователь с таким email не найден' };
    if (u.password !== password) return { error: 'Неверный пароль' };
    localStorage.setItem(AUTH_KEY, u.id); emit();
    return { user: u };
  }
  function register(name, email, password, phone, address) {
    const existing = DB.clients().some(c => c.email.toLowerCase() === email.toLowerCase());
    if (existing) return { error: 'Пользователь с таким email уже зарегистрирован' };
    if (password.length < 5) return { error: 'Пароль должен быть не короче 5 символов' };
    const clients = DB.clients();
    const user = { id: DB.nextId(clients, 100), name, email, phone, address, role: 'client', password };
    clients.push(user); DB.saveClients(clients);
    localStorage.setItem(AUTH_KEY, user.id); emit();
    return { user };
  }
  function logout() { localStorage.removeItem(AUTH_KEY); emit(); location.hash = '/'; }

  // Избранное
  const FAV_KEY = 'ekp_fav';
  function favList() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } }
  function inFav(id) { return favList().includes(Number(id)); }
  function toggleFav(id) {
    const f = favList(); const n = Number(id);
    const i = f.indexOf(n); i >= 0 ? f.splice(i, 1) : f.push(n);
    localStorage.setItem(FAV_KEY, JSON.stringify(f)); emit();
  }

  return {
    emit, getCart, cartCount, cartTotal, cartItems, addToCart, setCartQty, clearCart,
    currentUser, isAuthed, isAdmin, login, register, logout,
    favList, inFav, toggleFav,
  };
})();