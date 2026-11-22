const App = (() => {
  const ROUTES = [
    { re: /^#\/$/, render: () => Pages.home() },
    { re: /^#\/catalog(?:\?([^#]*))?$/, render: (m) => Pages.catalog(m[1] || '') },
    { re: /^#\/product\/(\d+)$/, render: (m) => Pages.product(m[1]) },
    { re: /^#\/cart$/, render: () => Pages.cart() },
    { re: /^#\/checkout$/, render: () => Pages.checkout() },
    { re: /^#\/login(?:\?([^#]*))?$/, render: (m) => Pages.auth('login', m[1] || '') },
    { re: /^#\/register(?:\?([^#]*))?$/, render: (m) => Pages.auth('register', m[1] || '') },
    { re: /^#\/profile\/orders$/, render: () => Pages.orders() },
    { re: /^#\/profile\/favorites$/, render: () => Pages.favorites() },
    { re: /^#\/profile$/, render: () => Pages.profile() },
    { re: /^#\/admin\/products$/, render: () => Pages.adminProducts() },
    { re: /^#\/admin\/orders(?:\?([^#]*))?$/, render: (m) => Pages.adminOrders() },
  ];

  let currentRoute = null;

  function matchedRoute() {
    const hash = location.hash || '#/';
    for (const r of ROUTES) {
      const m = hash.match(r.re);
      if (m) return { r, m };
    }
    return null;
  }

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = '<div class="loading">Загрузка…</div>';

    const mt = matchedRoute();
    const content = mt ? mt.r.render(mt.m) : Pages.notFound();

    if (mt && mt.r.re.source.includes('profile') && !Store.isAuthed()) {
      toast('Войдите, чтобы продолжить');
      setTimeout(() => location.hash = '/login?redirect=' + encodeURIComponent(location.hash), 150);
      return;
    }

    app.innerHTML = content;
    scrollTo(0, 0);
  }

  function headerHTML() {
    const user = Store.currentUser();
    const favCount = Store.favList().length;
    const cats = DB.categories();
    return `
      <div class="header-inner">
        <button class="burger" data-burger aria-label="Меню">${Icons.menu}</button>
        <a class="logo" href="#/">⛺ <span>Экипировка+</span></a>
        <div class="header-nav" data-nav>
          <a href="#/" class="hn">Главная</a>
          <a href="#/catalog" class="hn">Каталог</a>
          <div class="hn dd">
            <button class="hn" data-ddbutton>Категории ▾</button>
            <div class="dd__menu" data-ddmenu>
              ${cats.map(c => `<a href="#/catalog?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}
            </div>
          </div>
          ${Store.isAdmin() ? `<div class="hn dd"><button class="hn">Админ ▾</button><div class="dd__menu">${Icons.box}<a href="#/admin/products">Товары</a><a href="#/admin/orders">Заказы</a></div></div>` : ''}
        </div>
        <div class="header-actions">
          <a class="hbtn ${favCount ? 'hbtn--hot' : ''}" href="#/profile/favorites" aria-label="Избранное">${Icons.heart}<span class="hbtn__badge">${favCount || ''}</span></a>
          <button class="hbtn" data-cartbtn aria-label="Корзина">${Icons.cart}<span class="hbtn__badge">${Store.cartCount() || ''}</span></button>
          <a class="hbtn" href="${user ? '#/profile' : '#/login'}" aria-label="Аккаунт">${Icons.user}<span class="hbtn__badge">${user ? esc((user.name || '?')[0]) : ''}</span></a>
        </div>
      </div>`;
  }

  function footerHTML() {
    const cats = DB.categories();
    return `
      <div class="footer-grid">
        <div class="footer-col">
          <div class="logo">⛺ <span>Экипировка+</span></div>
          <p>Интернет-магазин туристического снаряжения и экипировки. Палатки, рюкзаки, спальники и одежда для любых путешествий с доставкой по всей России.</p>
        </div>
        <div class="footer-col">
          <h4>Каталог</h4>
          <a href="#/catalog">Все товары</a>
          ${cats.slice(0, 5).map(c => `<a href="#/catalog?cat=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}
        </div>
        <div class="footer-col">
          <h4>Покупателям</h4>
          <a href="#/cart">Корзина</a>
          <a href="#/profile">Личный кабинет</a>
          <a href="#/profile/favorites">Избранное</a>
        </div>
        <div class="footer-col">
          <h4>Контакты</h4>
          <span>☎ +7 (800) 123-45-67</span>
          <span>✉ info@sad-ogorod.ru</span>
          <span>🕘 Пн–Сб: 9:00–20:00</span>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Экипировка+. Курсовая работа · ПМ 04 «Разработка веб-приложения на стороне клиента»</div>`;
  }

  function renderShell() {
    document.getElementById('site-header').innerHTML = headerHTML();
    document.getElementById('site-footer').innerHTML = footerHTML();
  }

  function headerCartHTML() {
    const items = Store.cartItems();
    return `
      <div class="headercart" data-headercart>
        <div class="headercart__head"><b>Корзина</b><button data-cartclose>${Icons.close}</button></div>
        ${items.length ? `
        ${items.map(({ product: p, qty }) => `
          <div class="headercart__row">
            <img src="${esc(p.image)}" alt="" />
            <div><a href="#/product/${p.id}">${esc(p.title)}</a><span>${qty} × ${DB.formatPrice(p.price)}</span></div>
            <b>${DB.formatPrice(p.price * qty)}</b>
          </div>`).join('')}
        <div class="headercart__foot">
          <span>Итого: <b>${DB.formatPrice(Store.cartTotal())}</b></span>
          <a class="btn btn--primary btn--sm" href="#/checkout">Оформить</a>
        </div>` : '<p class="muted">Корзина пуста</p>'}
      </div>`;
  }

  function toggleHeaderCart(force) {
    const holder = document.getElementById('header-cart');
    const shown = holder.classList.contains('is-open');
    const next = force != null ? force : !shown;
    if (next) {
      holder.innerHTML = headerCartHTML();
      holder.classList.add('is-open');
    } else {
      holder.classList.remove('is-open');
    }
  }

  // ---------------- Делегирование событий ----------------
  function bindPage(root) {
    if (!root) return;
    root.addEventListener('click', onDocClick);
    root.addEventListener('submit', onDocSubmit);
    root.addEventListener('change', onDocChange);
    root.addEventListener('input', onDocInput);
  }

  function qtyFromEl(btn) {
    const row = btn.closest('.qty');
    if (!row) return null;
    const val = row.querySelector('.qty__val');
    return val ? Number(val.value) || 1 : 1;
  }

  function onDocClick(e) {
    const t = e.target.closest('[data-action],[data-cartbtn],[data-cartqty],[data-cartval],[data-cartdel],[data-burger],[data-ddbutton],[data-ddmenu] a,[data-cartclose],[data-close],[data-step],[data-next],[data-prev],[data-logout],[data-addprod],[data-editprod],[data-delprod],[data-ostatus]');
    if (!t) return;

    // модалка закрытие
    if (t.matches('[data-close]')) { modal.close(); return; }

    // избранное
    if (t.dataset.action === 'fav' || t.dataset.action === 'favpage') {
      e.preventDefault();
      Store.toggleFav(t.dataset.id);
      toast(Store.inFav(t.dataset.id) ? 'Добавлено в избранное' : 'Убрано из избранного');
      renderShell(); render();
      return;
    }

    // корзина
    if (t.matches('[data-action="add"]')) {
      e.preventDefault();
      const id = t.dataset.id;
      const p = DB.productById(id);
      if (!p || p.stock <= 0) return;
      let qty = 1;
      const row = t.closest('.qty');
      if (row) qty = qtyFromEl(row) || 1;
      const inCart = Store.getCart()[id] || 0;
      if (inCart + qty > p.stock) { toast('На складе недостаточно товара'); return; }
      Store.addToCart(id, qty);
      toast(`«${p.title}» в корзине`);
      return;
    }
    if (t.matches('[data-action="buy"]')) {
      e.preventDefault();
      const id = t.dataset.id;
      const qty = qtyFromEl(t) || 1;
      Store.addToCart(id, qty);
      toast('Товар добавлен, оформляем заказ');
      setTimeout(() => location.hash = '/checkout', 300);
      return;
    }

    // кнопка корзины в шапке
    if (t.matches('[data-cartbtn]')) { e.preventDefault(); toggleHeaderCart(); return; }
    if (t.matches('[data-cartclose]')) { toggleHeaderCart(false); return; }

    // количество / удаление в корзине
    if (t.matches('[data-cartqty]')) {
      const id = t.dataset.id;
      const cur = Store.getCart()[id] || 1;
      Store.setCartQty(id, cur + Number(t.dataset.cartqty));
      render(); toggleHeaderCart(true);
      return;
    }
    if (t.matches('[data-cartdel]')) {
      Store.setCartQty(t.dataset.id, 0);
      toast('Товар удалён из корзины');
      render();
      return;
    }
    if (t.matches('[data-cartval]')) {
      return; // ловим через input
    }

    // бургер
    if (t.matches('[data-burger]')) {
      document.querySelector('.header-nav').classList.toggle('is-open');
      return;
    }
    // выпадающие меню
    if (t.matches('[data-ddbutton]')) {
      const menu = t.parentElement.querySelector('[data-ddmenu]');
      if (menu) menu.classList.toggle('is-open');
    }
    if (t.matches('[data-ddmenu] a')) {
      t.closest('.dd').querySelector('[data-ddmenu]').classList.remove('is-open');
    }

    // оформление заказа — шаги
    if (t.matches('[data-step]')) {
      const form = t.closest('form');
      gotoStep(form, Number(t.dataset.step));
      return;
    }
    if (t.matches('[data-next]')) {
      const form = t.closest('form');
      const panel = t.closest('.cstep-panel');
      const step = Number(panel.dataset.panel);
      if (!validateStep(form, step)) return;
      gotoStep(form, step + 1);
      return;
    }
    if (t.matches('[data-prev]')) {
      const form = t.closest('form');
      const step = Number(t.closest('.cstep-panel').dataset.panel);
      gotoStep(form, step - 1);
    }

    // кнопаки админ-товаров
    if (t.matches('[data-addprod]')) {
      modal.open(Pages.productForm(null));
      return;
    }
    if (t.matches('[data-editprod]')) {
      modal.open(Pages.productForm(t.dataset.id));
      return;
    }
    if (t.matches('[data-delprod]')) {
      const id = t.dataset.id;
      if (!confirm('Удалить товар?')) return;
      DB.saveProducts(DB.products().filter(p => p.id !== Number(id)));
      toast('Товар удалён');
      render();
      return;
    }

    // изменение статуса заказа в админке (вызывается через onDocChange)

    if (t.matches('[data-logout]')) { Store.logout(); return; }
  }

  function onDocInput(e) {
    // корзина: смена количества
    if (e.target.matches('[data-cartval]')) {
      const id = e.target.dataset.id;
      const qty = Number(e.target.value);
      if (!qty || qty < 1) return;
      Store.setCartQty(id, qty);
      render(); toggleHeaderCart(true);
      return;
    }
    // количество на странице товара
    if (e.target.matches('[data-qty-val]')) {
      const p = DB.productById(e.target.closest('[data-action]')?.dataset.id);
      return;
    }
  }

  function onDocChange(e) {
    // каталог: фильтры и сортировка
    const root = e.target.closest('[data-sort],[data-cat],[data-min],[data-max],[data-stock],[data-rating],[data-search]');
    if (root) {
      const params = new URLSearchParams(location.hash.split('?')[1] || '');
      const el = e.target;
      if (el.matches('[data-sort]')) { params.set('sort', el.value); }
      else if (el.matches('[data-cat]')) {
        if (el.checked) params.set('cat', el.dataset.cat); else params.delete('cat');
      }
      else if (el.matches('[data-min]')) { el.value ? params.set('min', el.value) : params.delete('min'); }
      else if (el.matches('[data-max]')) { el.value ? params.set('max', el.value) : params.delete('max'); }
      else if (el.matches('[data-stock]')) { el.checked ? params.set('stock', '1') : params.delete('stock'); }
      else if (el.matches('[data-rating]')) { el.checked ? params.set('rating', el.value || '4') : params.delete('rating'); }
      params.delete('page');
      location.hash = '#/catalog?' + params.toString();
      return;
    }
    if (e.target.matches('[data-reset]')) { location.hash = '#/catalog'; return; }

    // админ: смена статуса заказа
    if (e.target.matches('[data-ostatus]')) {
      const id = e.target.dataset.id;
      const orders = DB.orders();
      const o = orders.find(x => x.id === Number(id));
      if (o) { o.status = e.target.value; DB.saveOrders(orders); toast('Статус заказа №' + id + ' обновлён'); }
      return;
    }

    // админ: фильтр заказов по статусу
    if (e.target.matches('[data-ordstat]')) {
      const q = new URLSearchParams(location.hash.split('?')[1] || '');
      e.target.value ? q.set('status', e.target.value) : q.delete('status');
      location.hash = '#/admin/orders' + (q.toString() ? '?' + q.toString() : '');
      return;
    }

    // автодополнение при вводе поиска
    if (e.target.matches('[data-search]')) {
      clearTimeout(e.target._t);
      e.target._t = setTimeout(() => {
        const p = new URLSearchParams(location.hash.split('?')[1] || '');
        e.target.value ? p.set('search', e.target.value) : p.delete('search');
        p.delete('page');
        location.hash = '#/catalog?' + p.toString();
      }, 400);
      return;
    }
  }

  function onDocSubmit(e) {
    const form = e.target.closest('form');
    if (!form) return;
    e.preventDefault();

    // авторизация / регистрация
    if (form.matches('.auth__form')) {
      const name = form.querySelector('[name=name]')?.value || '';
      const email = form.querySelector('[name=email]').value;
      const pass = form.querySelector('[name=password]').value;
      const phone = form.querySelector('[name=phone]')?.value || '';
      const address = form.querySelector('[name=address]')?.value || '';
      const errEl = form.querySelector('[data-aerr]');
      const res = location.hash.startsWith('#/register')
        ? Store.register(name, email, pass, phone, address)
        : Store.login(email, pass);
      if (res.error) { errEl.textContent = res.error; errEl.hidden = false; return; }
      errEl.hidden = true;
      toast('Добро пожаловать!');
      const q = new URLSearchParams(location.hash.split('?')[1] || '');
      location.hash = q.get('redirect') && q.get('redirect')[0] === '/' ? q.get('redirect') : '/';
      return;
    }

    // отзыв
    if (form.matches('[data-revform]')) {
      if (!Store.isAuthed()) { toast('Отзывы могут оставлять авторизованные пользователи'); setTimeout(() => location.hash = '/login', 300); return; }
      const text = form.querySelector('[data-revtext]').value.trim();
      const rating = Number(form.querySelector('.stars-input').dataset.val || 0);
      if (!text || !rating) { toast('Заполните отзыв и выберите оценку'); return; }
      e.preventDefault();
      const prodId = Number(location.hash.match(/product\/(\d+)/)[1]);
      const products = DB.products();
      const p = products.find(x => x.id === prodId);
      const user = Store.currentUser();
      if (p) {
        if (!p.reviews) p.reviews = [];
        p.reviews.unshift({ name: user.name, rating, text, date: new Date().toISOString() });
        p.reviewsCount = (p.reviewsCount || 0) + 1;
        p.rating = p.rating ? Math.round(((p.rating * (p.reviewsCount - 1)) + rating) / p.reviewsCount * 10) / 10 : rating;
        DB.saveProducts(products);
      }
      toast('Спасибо за отзыв!');
      render();
      return;
    }

    // подтверждение заказа
    if (form.matches('[data-checkout]')) {
      // уже перешли на подтверждение
      submitOrder();
      return;
    }

    // профиль
    if (form.matches('[data-profile]')) {
      const name = form.querySelector('[name=name]').value;
      const email = form.querySelector('[name=email]').value;
      const phone = form.querySelector('[name=phone]').value;
      const address = form.querySelector('[name=address]').value;
      const clients = DB.clients();
      const u = Store.currentUser();
      const other = clients.find(c => c.email.toLowerCase() === email.toLowerCase() && c.id !== u.id);
      if (other) { toast('Такой email уже занят'); return; }
      const idx = clients.findIndex(c => c.id === u.id);
      if (idx >= 0) { clients[idx] = { ...clients[idx], name, email, phone, address }; DB.saveClients(clients); }
      toast('Профиль сохранён');
      render();
      return;
    }

    // форма товара (админ)
    if (form.matches('[data-prodform]')) {
      const err = form.querySelector('[data-pf-err]');
      const catSel = form.querySelector('[name=category]');
      const newcat = form.querySelector('[name=newcat]').value.trim();
      const cat = catSel.value === '__new' ? newcat : catSel.value;
      if (catSel.value === '__new' && !newcat) { err.textContent = 'Укажите новую категорию'; err.hidden = false; return; }
      const product_id = form._id;
      const products = DB.products();
      const data = {
        title: form.querySelector('[name=title]').value.trim(),
        category: cat,
        price: Number(form.querySelector('[name=price]').value),
        oldPrice: Number(form.querySelector('[name=oldPrice]').value) || null,
        stock: Number(form.querySelector('[name=stock]').value),
        description: form.querySelector('[name=description]').value.trim(),
        image: form.querySelector('[name=image]').value.trim() || 'https://picsum.photos/seed/default/600',
        badge: form.querySelector('[name=badge]').value || null,
        rating: Number(form.querySelector('[name=rating]').value) || 4.5,
        reviewsCount: 0,
      };
      if (product_id) {
        const idx = products.findIndex(x => x.id === product_id);
        products[idx] = { ...products[idx], ...data };
      } else {
        data.id = DB.nextId(products, 1000);
        products.push(data);
        if (products.length > 0 && data.id <= products[0].id) data.id = DB.nextId(products, products[products.length-1].id || 1000);
      }
      DB.saveProducts(products);
      modal.close();
      toast('Товар сохранён');
      render();
      return;
    }
  }

  // ---------------- Шаги оформления ----------------
  function gotoStep(form, step) {
    if (step < 1 || step > 4) return;
    form.querySelectorAll('.cstep').forEach(b => b.classList.toggle('cstep--on', Number(b.dataset.step) <= step));
    form.querySelectorAll('.cstep-panel').forEach(p => p.hidden = Number(p.dataset.panel) !== step);

    // на шаге подтверждения — заполняем сводку
    if (step === 4) {
      const deliveryRadio = form.querySelector('[name=delivery]:checked');
      const payRadio = form.querySelector('[name=pay]:checked');
      const address = form.querySelector('[name=address]').value;
      const info = form.querySelector('.confirm-info');
      // обновляем строки доставки/оплаты
    }
  }

  function validateStep(form, step) {
    // просто по полям текущей панели
    const panel = form.querySelector(`[data-panel="${step}"]`);
    if (!panel) return true;
    let ok = true;
    panel.querySelectorAll('input[required], [required]').forEach(el => {
      const val = el.value.trim();
      const bad = !val || (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val));
      el.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) toast('Заполните обязательные поля');
    return ok;
  }

  function submitOrder() {
    const user = Store.currentUser();
    if (!user || Store.cartCount() === 0) { toast('Корзина пуста'); return; }
    const items = Store.cartItems().map(({ product: p, qty }) => ({
      productId: p.id, quantity: qty, price: p.price,
    }));
    // уменьшаем остатки
    const products = DB.products();
    items.forEach(it => {
      const p = products.find(x => x.id === it.productId);
      if (p) p.stock = Math.max(0, p.stock - it.quantity);
    });
    DB.saveProducts(products);

    const orders = DB.orders();
    const order = {
      id: DB.nextId(orders, 10000),
      clientId: user.id,
      date: new Date().toISOString().slice(0, 10),
      status: 'confirmed',
      items,
      total: Store.cartTotal(),
      address: user.address,
    };
    orders.push(order);
    DB.saveOrders(orders);

    const orderId = order.id;
    Store.clearCart();
    render();
    toast(`Заказ №${orderId} оформлен`);
    // покажем подтверждение
    setTimeout(() => location.hash = '#/profile/orders', 500);
  }

  // ---------------- События глобально ----------------
  function globalEvents() {
    document.addEventListener('click', (e) => {
      // закрытие выпадающих меню и модалки при клике наружу
      if (e.target.closest('[data-ddmenu], [data-ddbutton], .modal')) return;
      document.querySelectorAll('[data-ddmenu]').forEach(m => m.classList.remove('is-open'));

      // закрытие корзины-дропдауна
      const hc = document.querySelector('[data-headercart]');
      if (hc && !e.target.closest('[data-cartbtn], [data-headercart]')) {
        toggleHeaderCart(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { toggleHeaderCart(false); modal.close(); }
    });

    // звезды рейтинга в отзыве
    document.addEventListener('click', (e) => {
      const star = e.target.closest('[data-star]');
      if (star) {
        const wrap = star.closest('.stars-input');
        const v = Number(star.dataset.star);
        wrap.dataset.val = v;
        wrap.querySelectorAll('[data-star]').forEach(b => b.classList.toggle('is-on', Number(b.dataset.star) <= v));
      }
    });

    // шапка/подвал обновляются при любом изменении store
    window.addEventListener('store:change', () => {
      renderShell();
      toggleHeaderCart(true);
      if (!location.hash.startsWith('#/checkout')) {}
    });

    // делегирование всех событий приложения на document (шапка + контент)
    document.addEventListener('click', onDocClick);
    document.addEventListener('submit', onDocSubmit);
    document.addEventListener('change', onDocChange);
    document.addEventListener('input', onDocInput);
  }

  function init() {
    DB.init().then(() => {
      renderShell();
      render();
      globalEvents();
      window.addEventListener('hashchange', () => { renderShell(); render(); });
    }).catch(e => {
      document.getElementById('app').innerHTML =
        '<p class="error">Не удалось загрузить данные. Откройте сайт через локальный сервер (python -m http.server) или средства VS Code Live Server.</p>';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();