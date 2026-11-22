function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const Icons = {
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path d="M6 6h15l-1.5 8h-12z"/><path d="M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M9 6 7 3"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21S3 14 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14 12 21 12 21z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6-5.4-2.9L6.6 19.7l1.1-6-4.5-4.3 6.1-.8z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
};

function ratingStars(r) {
  const full = Math.round(r || 0);
  let s = '<span class="stars">';
  for (let i = 1; i <= 5; i++) s += `<span class="star${i <= full ? ' star--on' : ''}">${Icons.star}</span>`;
  return s + '</span>';
}

function productCard(p) {
  const price = DB.formatPrice(p.price);
  const old = p.oldPrice ? `<s class="price__old">${DB.formatPrice(p.oldPrice)}</s>` : '';
  const badge = p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : '';
  const fav = Store.inFav(p.id) ? 'is-fav' : '';
  return `
  <article class="card" data-id="${p.id}">
    <a class="card__img" href="#/product/${p.id}">
      <img src="${esc(p.image)}" alt="${esc(p.title)}" />
      ${badge}
    </a>
    <button class="card__fav ${fav}" data-action="fav" data-id="${p.id}" aria-label="В избранное">
      ${Icons.heart}
    </button>
    <div class="card__body">
      <a class="card__title" href="#/product/${p.id}">${esc(p.title)}</a>
      <div class="card__meta">${ratingStars(p.rating)}<span>${esc(p.reviewsCount)}</span></div>
      <div class="card__price">${old}<span class="price__now">${price}</span></div>
      <div class="card__actions">
        <span class="card__stock ${p.stock <= 5 ? 'card__stock--low' : ''}">${p.stock > 0 ? 'В наличии: ' + p.stock : 'Нет в наличии'}</span>
        <button class="btn btn--primary" data-action="add" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
          В корзину
        </button>
      </div>
    </div>
  </article>`;
}

const toast = (() => {
  let t;
  return function (msg) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.hidden = false; el.classList.add('toast--show');
    clearTimeout(t);
    t = setTimeout(() => { el.classList.remove('toast--show'); setTimeout(() => el.hidden = true, 300); }, 2200);
  };
})();

const modal = (() => {
  const root = () => document.getElementById('modal');
  return {
    open(html) {
      document.getElementById('modal-body').innerHTML = html;
      root().hidden = false;
    },
    close() { root().hidden = true; },
    isOpen() { return !root().hidden; },
  };
})();

function fmtDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('ru-RU');
}