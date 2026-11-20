const STATUS_MAP = {
  confirmed: 'Подтверждён',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

function checkoutGuard() {
  if (!Store.isAuthed()) {
    toast('Для оформления заказа необходимо войти');
    setTimeout(() => location.hash = '/login?redirect=' + encodeURIComponent('/checkout'), 400);
    return false;
  }
  if (Store.cartCount() === 0) {
    toast('Корзина пуста');
    setTimeout(() => location.hash = '/catalog', 400);
    return false;
  }
  return true;
}

const Pages = {
  // ---------------- Главная ----------------
  home() {
    const products = DB.products();
    const cats = DB.categories();
    const popular = [...products].sort((a, b) => b.reviewsCount - a.reviewsCount).slice(0, 4);
    const newProd = [...products].filter(p => p.badge === 'Новинка').slice(0, 4);
    const hot = products.filter(p => p.badge === 'Хит');
    const hero = hot[0] || products[0];
    return `
    <section class="hero">
      <div class="hero__inner">
        <p class="hero__kicker">Снаряжение для путешествий</p>
        <h1>Экипировка+ —<br>всё для похода</h1>
        <p class="hero__text">Палатки, рюкзаки, спальники, горелки и треккинговая одежда с доставкой по всей России.</p>
        <div class="hero__actions">
          <a class="btn btn--primary btn--lg" href="#/catalog">Перейти в каталог</a>
          <a class="btn btn--ghost btn--lg" href="#/product/${hero.id}">${esc(hero.title)}</a>
        </div>
      </div>
      <div class="hero__art" aria-hidden="true"><span>🏔️</span></div>
    </section>

    <section class="cats">
      <div class="section-head"><h2>Категории</h2></div>
      <div class="cats__grid">
        ${cats.map(c => `
          <a class="cat-tile" href="#/catalog?cat=${encodeURIComponent(c)}">
            <span class="cat-tile__icon">${Icons.box}</span>
            <span>${esc(c)}</span>
          </a>`).join('')}
      </div>
    </section>

    ${hot.length ? `
    <section class="banner">
      <div class="banner__inner">
        <div>
          <h2>Скидка до −20% на хиты сезона</h2>
          <p>Секаторы, теплицы и удобрения со скидкой. Успейте до конца месяца.</p>
        </div>
        <a class="btn btn--light" href="#/catalog">Смотреть акции</a>
      </div>
    </section>` : ''}

    <section>
      <div class="section-head">
        <h2>Популярные товары</h2>
        <a class="link" href="#/catalog">Все товары →</a>
      </div>
      <div class="grid">${popular.map(productCard).join('')}</div>
    </section>

    ${newProd.length ? `
    <section>
      <div class="section-head">
        <h2>Новинки</h2>
        <a class="link" href="#/catalog">Смотреть новинки →</a>
      </div>
      <div class="grid">${newProd.map(productCard).join('')}</div>
    </section>` : ''}

    <section class="features">
      <div class="feature"><span class="feature__i">🚚</span><div><b>Быстрая доставка</b><p>По всей России от 2 дней</p></div></div>
      <div class="feature"><span class="feature__i">🛡️</span><div><b>Гарантия качества</b><p>Проверенное снаряжение</p></div></div>
      <div class="feature"><span class="feature__i">💬</span><div><b>Поддержка туриста</b><p>Консультации по подбору</p></div></div>
      <div class="feature"><span class="feature__i">↩️</span><div><b>Возврат 30 дней</b><p>Если товар не подошёл</p></div></div>
    </section>`;
  },

  // ---------------- Каталог ----------------
  catalog(params) {
    const q = new URLSearchParams(params);
    const cat = q.get('cat') || '';
    const search = q.get('search') || '';
    const sort = q.get('sort') || 'popular';
    const minP = q.get('min') || '';
    const maxP = q.get('max') || '';
    const inStock = q.get('stock') === '1';
    const minRating = Number(q.get('rating') || 0);
    const page = Math.max(1, Number(q.get('page') || 1));
    const per = 6;

    let list = DB.products();
    const cats = DB.categories();

    if (cat) list = list.filter(p => p.category === cat);
    if (search) list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
    if (minP) list = list.filter(p => p.price >= Number(minP));
    if (maxP) list = list.filter(p => p.price <= Number(maxP));
    if (inStock) list = list.filter(p => p.stock > 0);
    if (minRating) list = list.filter(p => p.rating >= minRating);

    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'new') list = list; 
    else list.sort((a, b) => b.reviewsCount - a.reviewsCount);

    const pages = Math.max(1, Math.ceil(list.length / per));
    const cur = Math.min(page, pages);
    const view = list.slice((cur - 1) * per, cur * per);

    const setQ = (o) => {
      const p = new URLSearchParams(q);
      Object.entries(o).forEach(([k, v]) => v === '' || v === null ? p.delete(k) : p.set(k, v));
      return '#/catalog?' + p.toString();
    };

    const crumbs = `<nav class="crumbs"><a href="#/">Главная</a>›<span>${cat ? esc(cat) : 'Каталог'}</span></nav>`;

    return `
    ${crumbs}
    <div class="catalog-head">
      <h1>${cat ? esc(cat) : 'Каталог товаров'}</h1>
      <div class="tools">
        <label class="field search-inline">
          ${Icons.search}
          <input data-search value="${esc(search)}" placeholder="Поиск товара…" />
        </label>
        <select data-sort>
          <option value="popular" ${sort === 'popular' ? 'selected' : ''}>По популярности</option>
          <option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Сначала дешевле</option>
          <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Сначала дороже</option>
          <option value="rating" ${sort === 'rating' ? 'selected' : ''}>По рейтингу</option>
        </select>
      </div>
    </div>

    <div class="catalog-layout">
      <aside class="filters">
        <div class="filters__head">
          <h3>Фильтры</h3>
          <button class="link" data-reset>Сбросить</button>
        </div>
        <div class="f-fgroup">
          <h4>Категория</h4>
          <label class="check"><input type="checkbox" data-cat="" ${!cat ? 'checked' : ''} /> Все</label>
          ${cats.map(c => `<label class="check"><input type="checkbox" data-cat="${esc(c)}" ${cat === c ? 'checked' : ''} /> ${esc(c)}</label>`).join('')}
        </div>
        <div class="f-fgroup">
          <h4>Цена, ₽</h4>
          <div class="f-range">
            <input type="number" data-min placeholder="от" value="${esc(minP)}" />
            <input type="number" data-max placeholder="до" value="${esc(maxP)}" />
          </div>
        </div>
        <div class="f-fgroup">
          <h4>Дополнительно</h4>
          <label class="check"><input type="checkbox" data-stock ${inStock ? 'checked' : ''} /> Только в наличии</label>
          <label class="check"><input type="checkbox" data-rating value="4" ${minRating >= 4 ? 'checked' : ''} /> Рейтинг 4+</label>
        </div>
      </aside>

      <div class="catalog-main">
        ${view.length ? `
        <div class="grid grid--catalog">${view.map(productCard).join('')}</div>
        <nav class="pagination">
          ${Array.from({ length: pages }, (_, i) =>
            `<a class="page ${i + 1 === cur ? 'page--on' : ''}" href="${setQ({ page: i + 1 })}">${i + 1}</a>`).join('')}
        </nav>` : `
        <div class="empty">
          <span class="empty__icon">🏔️</span>
          <p>По вашему запросу ничего не найдено</p>
          <a class="btn btn--primary" href="#/catalog">Сбросить фильтры</a>
        </div>`}
      </div>
    </div>`;
  },

  // ---------------- Товар ----------------
  product(id) {
    const p = DB.productById(id);
    if (!p) {
      const recs = DB.products().slice(0, 4);
      return `
      <div class="notfound">
        <h1>Товар не найден</h1>
        <p>К сожалению, такого товара больше нет или ссылка неверна.</p>
        <div class="grid">${recs.map(productCard).join('')}</div>
      </div>`;
    }
    const related = DB.products().filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
    const fav = Store.inFav(p.id) ? 'is-fav' : '';
    const inCart = Store.getCart()[p.id] || 0;
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<a href="#/catalog">Каталог</a>›<a href="#/catalog?cat=${encodeURIComponent(p.category)}">${esc(p.category)}</a>›<span>${esc(p.title)}</span></nav>
    <div class="product">
      <div class="product__gallery">
        <img class="product__main" src="${esc(p.image)}" alt="${esc(p.title)}" />
      </div>
      <div class="product__info">
        ${p.badge ? `<span class="card__badge product__badge">${esc(p.badge)}</span>` : ''}
        <h1>${esc(p.title)}</h1>
        <div class="product__rating">
          ${ratingStars(p.rating)}<span>${esc(p.rating)}</span>·<span>${esc(p.reviewsCount)} отзыва(ов)</span>
        </div>
        <div class="product__price">
          <span class="price__now">${DB.formatPrice(p.price)}</span>
          ${p.oldPrice ? `<s class="price__old">${DB.formatPrice(p.oldPrice)}</s>` : ''}
          ${p.oldPrice ? `<span class="product__discount">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ''}
        </div>
        <p class="product__desc">${esc(p.description)}</p>
        <div class="product__specs">
          ${Object.entries(p.specs || {}).map(([k, v]) =>
            `<div class="spec"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}
        </div>
        <div class="product__stock ${p.stock <= 5 ? 't-danger' : ''}">
          ${p.stock > 0 ? `В наличии: ${p.stock} шт.` : 'Нет в наличии'}
        </div>
        <div class="product__qty">
          <span>Количество:</span>
          <div class="qty">
            <button class="qty__btn" data-qty="-1" ${p.stock <= 0 ? 'disabled' : ''}>${Icons.minus}</button>
            <input class="qty__val" data-qty-val type="number" value="${Math.max(1, inCart) || 1}" min="1" max="${p.stock || 1}" />
            <button class="qty__btn" data-qty="1" ${p.stock <= 0 ? 'disabled' : ''}>${Icons.plus}</button>
          </div>
        </div>
        <div class="product__actions">
          <button class="btn btn--primary btn--lg" data-action="add" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${Icons.cart} В корзину</button>
          <button class="btn btn--ghost btn--lg" data-action="buy" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Купить сейчас</button>
          <button class="btn btn--icon btn--lg ${fav}" data-action="favpage" data-id="${p.id}" aria-label="В избранное">${Icons.heart}</button>
        </div>
        <div class="product__note">💡 Доставка, оплата и условия возврата указаны внизу страницы.</div>
      </div>
    </div>

    <section class="product__section">
      <div class="section-head"><h2>Отзывы покупателей</h2></div>
      <div class="reviews">
        ${p.reviews && p.reviews.length ? p.reviews.map(r => `
          <div class="review">
            <div class="review__head"><b>${esc(r.name)}</b>${ratingStars(r.rating)}<span class="muted">${fmtDate(r.date)}</span></div>
            <p>${esc(r.text)}</p>
          </div>`).join('') : '<p class="muted">Отзывов пока нет. Станьте первым!</p>'}
        <form class="review-form" data-revform>
          <h3>Оставить отзыв</h3>
          <div class="stars-input" data-stars>
            ${[1,2,3,4,5].map(i => `<button type="button" data-star="${i}" aria-label="${i}">${Icons.star}</button>`).join('')}
          </div>
          <textarea data-revtext rows="3" placeholder="Текст отзыва…" required></textarea>
          <button class="btn btn--primary" type="submit">Отправить</button>
        </form>
      </div>
    </section>

    ${related.length ? `
    <section>
      <div class="section-head"><h2>Похожие товары</h2></div>
      <div class="grid">${related.map(productCard).join('')}</div>
    </section>` : ''}`;
  },

  // ---------------- Корзина ----------------
  cart() {
    const items = Store.cartItems();
    if (!items.length) {
      return `
      <div class="empty empty--big">
        <span class="empty__icon">🛒</span>
        <h1>Корзина пуста</h1>
        <p>Добавьте товары из каталога</p>
        <a class="btn btn--primary" href="#/catalog">Перейти в каталог</a>
      </div>`;
    }
    const subtotal = Store.cartTotal();
    const delivery = subtotal >= 3000 ? 0 : 350;
    const total = subtotal + delivery;
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<span>Корзина</span></nav>
    <h1>Корзина (${Store.cartCount()})</h1>
    <div class="cart-layout">
      <div class="cart-items">
        ${items.map(({ product: p, qty }) => `
          <div class="cart-item" data-cartid="${p.id}">
            <a href="#/product/${p.id}"><img src="${esc(p.image)}" alt="${esc(p.title)}" /></a>
            <div class="cart-item__info">
              <a class="cart-item__title" href="#/product/${p.id}">${esc(p.title)}</a>
              <span class="muted">${DB.formatPrice(p.price)} / шт</span>
              <div class="qty">
                <button class="qty__btn" data-cartqty="-1" data-id="${p.id}">${Icons.minus}</button>
                <input class="qty__val" data-cartval data-id="${p.id}" type="number" min="1" max="${p.stock}" value="${qty}" />
                <button class="qty__btn" data-cartqty="1" data-id="${p.id}">${Icons.plus}</button>
              </div>
            </div>
            <div class="cart-item__right">
              <b>${DB.formatPrice(p.price * qty)}</b>
              <button class="btn--icon-danger" data-cartdel data-id="${p.id}" aria-label="Удалить">${Icons.trash}</button>
            </div>
          </div>`).join('')}
      </div>
      <aside class="cart-summary">
        <h3>Ваш заказ</h3>
        <div class="sum-row"><span>Товары (${Store.cartCount()})</span><b>${DB.formatPrice(subtotal)}</b></div>
        <div class="sum-row"><span>Доставка</span><b>${delivery === 0 ? 'Бесплатно' : DB.formatPrice(delivery)}</b></div>
        <div class="sum-row sum-row--total"><span>Итого</span><b>${DB.formatPrice(total)}</b></div>
        ${delivery > 0 ? `<p class="muted small">До бесплатной доставки ещё ${DB.formatPrice(3000 - subtotal)}</p>` : ''}
        <a class="btn btn--primary btn--lg btn--block" href="#/checkout">Оформить заказ</a>
        <a class="btn btn--ghost btn--block" href="#/catalog">Продолжить покупки</a>
      </aside>
    </div>
    <section class="product__section">
      <div class="section-head"><h2>С этим покупают</h2></div>
      <div class="grid">${DB.products().slice(0, 4).map(productCard).join('')}</div>
    </section>`;
  },

  // ---------------- Оформление ----------------
  checkout() {
    if (!checkoutGuard()) return '';
    const user = Store.currentUser();
    const items = Store.cartItems();
    const subtotal = Store.cartTotal();
    let html = `
    <nav class="crumbs"><a href="#/">Главная</a>›<a href="#/cart">Корзина</a>›<span>Оформление</span></nav>
    <h1>Оформление заказа</h1>`;
    if (items.length === 0) return html + '<p class="muted">Корзина пуста</p>';
    html += `
    <form class="checkout" data-checkout novalidate>
      <div class="checkout__steps" data-steps>
        <button type="button" class="cstep cstep--on" data-step="1"><span>1</span> Контакты</button>
        <button type="button" class="cstep" data-step="2"><span>2</span> Доставка</button>
        <button type="button" class="cstep" data-step="3"><span>3</span> Оплата</button>
        <button type="button" class="cstep" data-step="4"><span>4</span> Подтверждение</button>
      </div>

      <div class="cstep-panel" data-panel="1">
        <h2>Контактные данные</h2>
        <div class="f2">
          <label class="field"><span>ФИО</span><input name="name" value="${esc(user.name)}" required /></label>
          <label class="field"><span>Телефон</span><input name="phone" type="tel" value="${esc(user.phone)}" required /></label>
        </div>
        <label class="field"><span>Email</span><input name="email" type="email" value="${esc(user.email)}" required /></label>
        <div class="checkout__nav"><button type="button" class="btn btn--primary" data-next>Далее →</button></div>
      </div>

      <div class="cstep-panel" data-panel="2" hidden>
        <h2>Способ и адрес доставки</h2>
        <div class="radio-row">
          <label class="radio"><input type="radio" name="delivery" value="courier" checked /><span>Курьер</span></label>
          <label class="radio"><input type="radio" name="delivery" value="pickup" /><span>Пункт выдачи</span></label>
          <label class="radio"><input type="radio" name="delivery" value="self" /><span>Самовывоз</span></label>
        </div>
        <label class="field"><span>Адрес</span><input name="address" value="${esc(user.address)}" /></label>
        <div class="checkout__nav">
          <button type="button" class="btn btn--ghost" data-prev>← Назад</button>
          <button type="button" class="btn btn--primary" data-next>Далее →</button>
        </div>
      </div>

      <div class="cstep-panel" data-panel="3" hidden>
        <h2>Способ оплаты</h2>
        <div class="radio-row radio-row--col">
          <label class="radio"><input type="radio" name="pay" value="card" checked /><span>💳 Банковская карта</span></label>
          <label class="radio"><input type="radio" name="pay" value="sbp" /><span>📱 СБП</span></label>
          <label class="radio"><input type="radio" name="pay" value="cod" /><span>💰 При получении</span></label>
        </div>
        <div class="checkout__nav">
          <button type="button" class="btn btn--ghost" data-prev>← Назад</button>
          <button type="button" class="btn btn--primary" data-next>Далее →</button>
        </div>
      </div>

      <div class="cstep-panel" data-panel="4" hidden>
        <h2>Проверьте заказ</h2>
        <div class="confirm-list">
          ${items.map(({ product: p, qty }) => `
            <div class="confirm-row"><span>${esc(p.title)} × ${qty}</span><b>${DB.formatPrice(p.price * qty)}</b></div>`).join('')}
        </div>
        <div class="sum-row sum-row--total"><span>Итого</span><b>${DB.formatPrice(subtotal)}</b></div>
        <div class="checkout__nav">
          <button type="button" class="btn btn--ghost" data-prev>← Назад</button>
          <button type="submit" class="btn btn--primary">Подтвердить заказ</button>
        </div>
      </div>
    </form>`;
    return html;
  },

  // ---------------- Авторизация / Регистрация ----------------
  auth(mode) {
    const isLogin = mode !== 'register';
    const redirect = new URLSearchParams(location.hash.split('?')[1] || '').get('redirect') || '/';
    return `
    <div class="auth">
      <div class="auth__card">
        <h1>${isLogin ? 'Вход в аккаунт' : 'Регистрация'}</h1>
        <form data-authnovalidate novalidate class="auth__form">
          ${isLogin ? '' : `
          <label class="field"><span>ФИО</span><input name="name" required /></label>`}
          <label class="field"><span>Email</span><input name="email" type="email" required /></label>
          <label class="field"><span>Пароль</span><input name="password" type="password" required /></label>
          ${isLogin ? '' : `
          <label class="field"><span>Телефон</span><input name="phone" type="tel" /></label>
          <label class="field"><span>Адрес</span><input name="address" /></label>`}
          <p class="form-error" data-aerr hidden></p>
          <button class="btn btn--primary btn--block btn--lg" type="submit">${isLogin ? 'Войти' : 'Создать аккаунт'}</button>
        </form>
        <p class="auth__swap">
          ${isLogin
            ? `Нет аккаунта? <a href="#/register">Зарегистрироваться</a>`
            : `Уже есть аккаунт? <a href="#/login">Войти</a>`}
        </p>
        ${isLogin ? `<p class="muted small">Тестовый вход: ivan@example.com / 12345</p>` : ''}
      </div>
    </div>`;
  },

  // ---------------- Личный кабинет ----------------
  profile() {
    if (!Store.isAuthed()) return window.location.hash = '/login', '';
    const user = Store.currentUser();
    const myOrders = DB.orders().filter(o => o.clientId === user.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const favs = DB.products().filter(p => Store.favList().includes(p.id));
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<span>Личный кабинет</span></nav>
    <div class="profile-layout">
      <aside class="profile-menu">
        <div class="profile-avatar">${esc((user.name || '?')[0].toUpperCase())}</div>
        <b>${esc(user.name)}</b>
        <p class="muted small">${esc(user.email)}</p>
        <nav>
          <a class="pm-link pm-link--on" href="#/profile">Профиль</a>
          <a class="pm-link" href="#/profile/orders">Мои заказы</a>
          <a class="pm-link" href="#/profile/favorites">Избранное (${favs.length})</a>
        </nav>
        <button class="btn btn--ghost btn--block" data-logout>Выйти</button>
      </aside>

      <div class="profile-content">
        <h1>Личный кабинет</h1>
        <form class="pf" data-profile novalidate>
          <div class="f2">
            <label class="field"><span>ФИО</span><input name="name" value="${esc(user.name)}" required /></label>
            <label class="field"><span>Телефон</span><input name="phone" type="tel" value="${esc(user.phone)}" /></label>
          </div>
          <label class="field"><span>Email</span><input name="email" type="email" value="${esc(user.email)}" required /></label>
          <label class="field"><span>Адрес</span><input name="address" value="${esc(user.address)}" /></label>
          <button class="btn btn--primary" type="submit">Сохранить</button>
        </form>
        ${Store.isAdmin() ? `<a class="btn btn--accent" href="#/admin/products">Открыть админ-панель</a>` : ''}
      </div>
    </div>`;
  },

  orders() {
    if (!Store.isAuthed()) return '';
    const user = Store.currentUser();
    const list = DB.orders().filter(o => o.clientId === user.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<a href="#/profile">Кабинет</a>›<span>Мои заказы</span></nav>
    <h1>Мои заказы</h1>
    ${list.length ? `
    <div class="orders">
      ${list.map(o => `
        <article class="order">
          <div class="order__head">
            <b>Заказ №${o.id}</b>
            <span class="chip chip--${esc(o.status)}">${esc(STATUS_MAP[o.status] || o.status)}</span>
            <span class="muted">${fmtDate(o.date)}</span>
          </div>
          <ul class="order__items">
            ${o.items.map(i => {
              const p = DB.productById(i.productId);
              return `<li>${p ? esc(p.title) : '#' + i.productId} × ${i.quantity} — ${DB.formatPrice(i.price * i.quantity)}</li>`;
            }).join('')}
          </ul>
          <div class="order__foot"><span class="muted">Доставка: ${esc(o.address || '—')}</span><b>${DB.formatPrice(o.total)}</b></div>
        </article>`).join('')}
    </div>` : '<p class="muted">Заказов пока нет.</p>'}`;
  },

  favorites() {
    if (!Store.isAuthed()) return '';
    const favs = DB.products().filter(p => Store.favList().includes(p.id));
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<a href="#/profile">Кабинет</a>›<span>Избранное</span></nav>
    <h1>Избранное (${favs.length})</h1>
    ${favs.length ? `<div class="grid">${favs.map(productCard).join('')}</div>`
      : `<div class="empty"><span class="empty__icon">♥</span><p>В избранном пока пусто</p><a class="btn btn--primary" href="#/catalog">В каталог</a></div>`}`;
  },

  // ---------------- Админ: товары ----------------
  adminProducts() {
    if (!Store.isAdmin()) return Pages.forbidden();
    const products = DB.products();
    const cats = DB.categories();
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<a href="#/admin/products">Админ</a>›<span>Товары</span></nav>
    <div class="admin-head">
      <h1>Управление товарами</h1>
      <button class="btn btn--primary" data-addprod>${Icons.plus} Добавить товар</button>
    </div>
    <div class="tools">
      <input class="field search-inline" data-prodsearch placeholder="Поиск…" />
      <select data-prodcat><option value="">Все категории</option>${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Товар</th><th>Категория</th><th>Цена</th><th>Остаток</th><th></th></tr></thead>
        <tbody data-prodrows>
          ${products.map(p => `
            <tr data-prodid="${p.id}">
              <td><div class="t-prod"><img src="${esc(p.image)}" alt=""/><span>${esc(p.title)}</span></div></td>
              <td>${esc(p.category)}</td>
              <td>${DB.formatPrice(p.price)}</td>
              <td class="${p.stock <= 5 ? 't-danger' : ''}">${p.stock}</td>
              <td class="t-actions">
                <button class="btn--icon" data-editprod data-id="${p.id}" aria-label="Изменить">${Icons.edit}</button>
                <button class="btn--icon-danger" data-delprod data-id="${p.id}" aria-label="Удалить">${Icons.trash}</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  },

  productForm(id) {
    const p = id ? DB.productById(id) : null;
    const cats = DB.categories();
    return `
    <h2>${p ? 'Редактирование товара' : 'Новый товар'}</h2>
    <form class="pf" data-prodform novalidate>
      <label class="field"><span>Название *</span><input name="title" value="${esc(p?.title || '')}" required /></label>
      <div class="f2">
        <label class="field"><span>Категория *</span>
          <select name="category" required>
            ${cats.map(c => `<option ${p?.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            <option value="__new">— Новая категория —</option>
          </select>
        </label>
        <label class="field"><span>Новая категория</span><input name="newcat" placeholder="если выбрали «Новая»" /></label>
      </div>
      <div class="f3">
        <label class="field"><span>Цена, ₽ *</span><input name="price" type="number" min="0" step="0.01" value="${esc(p?.price ?? '')}" required /></label>
        <label class="field"><span>Старая цена</span><input name="oldPrice" type="number" min="0" value="${esc(p?.oldPrice ?? '')}" /></label>
        <label class="field"><span>Остаток *</span><input name="stock" type="number" min="0" value="${esc(p?.stock ?? '')}" required /></label>
      </div>
      <label class="field"><span>Описание</span><textarea name="description" rows="3">${esc(p?.description || '')}</textarea></label>
      <label class="field"><span>Изображение (URL)</span><input name="image" value="${esc(p?.image || '')}" /></label>
      <div class="f2">
        <label class="field"><span>Бейдж</span>
          <select name="badge"><option value="">—</option><option ${p?.badge === 'Хит' ? 'selected' : ''}>Хит</option><option ${p?.badge === 'Новинка' ? 'selected' : ''}>Новинка</option></select>
        </label>
        <label class="field"><span>Рейтинг</span><input name="rating" type="number" step="0.1" min="0" max="5" value="${esc(p?.rating ?? 4.5)}" /></label>
      </div>
      <p class="form-error" data-pf-err hidden></p>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" data-close>Отмена</button>
        <button type="submit" class="btn btn--primary">Сохранить</button>
      </div>
    </form>`;
  },

  // ---------------- Админ: заказы ----------------
  adminOrders() {
    if (!Store.isAdmin()) return Pages.forbidden();
    const orders = DB.orders().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const clients = DB.clients();
    return `
    <nav class="crumbs"><a href="#/">Главная</a>›<a href="#/admin/orders">Админ</a>›<span>Заказы</span></nav>
    <h1>Управление заказами</h1>
    <div class="tools">
      <select data-ordstat><option value="">Все статусы</option>
        ${Object.entries(STATUS_MAP).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
    </div>
    <div class="orders">
      ${orders.map(o => {
        const c = clients.find(x => x.id === o.clientId);
        return `
        <article class="order order--admin" data-oid="${o.id}">
          <div class="order__head">
            <b>Заказ №${o.id}</b>
            <span class="muted">${fmtDate(o.date)} · ${c ? esc(c.name) : '#' + o.clientId}</span>
            <select class="order__status" data-ostatus data-id="${o.id}">
              ${Object.entries(STATUS_MAP).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <ul class="order__items">
            ${o.items.map(i => {
              const p = DB.productById(i.productId);
              return `<li>${p ? esc(p.title) : '#' + i.productId} × ${i.quantity} — ${DB.formatPrice(i.price * i.quantity)}</li>`;
            }).join('')}
          </ul>
          <div class="order__foot">
            <span class="muted">${c ? 'Клиент: ' + esc(c.email) + ' · ' : ''}Доставка: ${esc(o.address || '—')}</span>
            <b>${DB.formatPrice(o.total)}</b>
          </div>
        </article>`;
      }).join('') || '<p class="muted">Заказов нет</p>'}
    </div>`;
  },

  forbidden() {
    return `<div class="empty"><span class="empty__icon">🔒</span><h1>Доступ запрещён</h1><p>У вас нет прав для просмотра этой страницы.</p><a class="btn btn--primary" href="#/">На главную</a></div>`;
  },

  notFound() {
    const recs = DB.products().slice(0, 4);
    return `
    <div class="notfound">
      <h1 class="nf-404">404</h1>
      <h2>Страница не найдена</h2>
      <p>Возможно, она была удалена или адрес указан неверно.</p>
      <a class="btn btn--primary btn--lg" href="#/">Вернуться на главную</a>
      ${recs.length ? `<div class="nf-grid"><h3>Популярные товары</h3><div class="grid">${recs.map(productCard).join('')}</div></div>` : ''}
    </div>`;
  },
};