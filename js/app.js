const STORAGE_KEY = 'kasir_demo_v1';

const money = (n) => {
  const num = Number(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
};

const fmtDate = (d) => {
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const now = () => new Date();

const state = {
  products: [
    { id: 'kopi-hitam', name: 'Kopi Hitam', price: 15000 },
    { id: 'latte', name: 'Latte', price: 22000 },
    { id: 'capuccino', name: 'Capuccino', price: 24000 },
    { id: 'teh-hangat', name: 'Teh Hangat', price: 12000 },
    { id: 'croissant', name: 'Croissant', price: 18000 },
  ],
  cart: [], // {productId, qty, price}
  history: [], // {id, items, paymentMethod, totals, createdAt}
};

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.history)) state.history = parsed.history;
    if (parsed && Array.isArray(parsed.cart)) state.cart = parsed.cart;
  } catch {
    // ignore
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    cart: state.cart,
    history: state.history,
  }));
}

function todayKey(d = now()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getTodayHistory() {
  const tk = todayKey();
  return state.history.filter((t) => {
    const dd = new Date(t.createdAt);
    return todayKey(dd) === tk;
  });
}

function cartTotals() {
  const subtotal = state.cart.reduce((acc, it) => acc + it.qty * it.price, 0);
  const discount = 0;
  const taxRate = 0; // opsional
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal - discount + tax;
  const cashReceived = Number(document.getElementById('cashInput')?.value ?? 0);
  const paymentMethod = document.getElementById('paymentMethod')?.value ?? 'cash';
  const change = paymentMethod === 'cash' ? cashReceived - total : 0;
  return { subtotal, discount, tax, total, cashReceived, change };
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function renderProducts() {
  const sel = document.getElementById('productSelect');
  sel.innerHTML = '';
  for (const p of state.products) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${money(p.price)})`;
    sel.appendChild(opt);
  }
}

function renderCart() {
  const body = document.getElementById('cartBody');
  body.innerHTML = '';

  if (state.cart.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.style.color = 'var(--muted)';
    td.textContent = 'Keranjang masih kosong. Tambahkan produk di atas.';
    tr.appendChild(td);
    body.appendChild(tr);
  } else {
    for (const it of state.cart) {
      const p = state.products.find((x) => x.id === it.productId);
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      tdName.textContent = p ? p.name : it.productId;

      const tdPrice = document.createElement('td');
      tdPrice.textContent = money(it.price);

      const tdQty = document.createElement('td');
      tdQty.innerHTML = `
        <span class="qty">
          <button class="btn" data-act="dec" data-id="${it.productId}" type="button">-</button>
          <strong>${it.qty}</strong>
          <button class="btn" data-act="inc" data-id="${it.productId}" type="button">+</button>
        </span>
      `;

      const tdSub = document.createElement('td');
      tdSub.textContent = money(it.qty * it.price);

      const tdAksi = document.createElement('td');
      tdAksi.style.textAlign = 'right';
      tdAksi.innerHTML = `
        <div class="actions">
          <button class="btn btn-danger" data-act="remove" data-id="${it.productId}" type="button">Hapus</button>
        </div>
      `;

      tr.appendChild(tdName);
      tr.appendChild(tdPrice);
      tr.appendChild(tdQty);
      tr.appendChild(tdSub);
      tr.appendChild(tdAksi);
      body.appendChild(tr);
    }
  }

  renderTotalsAndHistory();
}

function renderTotalsAndHistory() {
  const t = cartTotals();
  document.getElementById('totalSubtotal').textContent = money(t.subtotal);
  document.getElementById('totalDiscount').textContent = money(t.discount);
  document.getElementById('totalTax').textContent = money(t.tax);
  document.getElementById('totalPayable').textContent = money(t.total);
  document.getElementById('totalChange').textContent = money(t.change);

  // KPIs (hari ini)
  const history = getTodayHistory();
  const todaySum = history.reduce((acc, h) => acc + h.totals.total, 0);
  const txCount = history.length;
  const itemsSum = history.reduce((acc, h) => {
    return acc + h.items.reduce((a, it) => a + it.qty, 0);
  }, 0);

  document.getElementById('kpiToday').textContent = money(todaySum);
  document.getElementById('kpiTx').textContent = String(txCount);
  document.getElementById('kpiItems').textContent = String(itemsSum);
  document.getElementById('kpiTodayTrend').textContent = `Tanggal ${fmtDate(new Date())}`;

  // History list
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  if (history.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = 'var(--muted)';
    empty.style.fontSize = '13px';
    empty.textContent = 'Belum ada transaksi hari ini.';
    list.appendChild(empty);
    return;
  }

  for (const h of [...history].reverse()) {
    const wrap = document.createElement('div');
    wrap.style.border = '1px solid var(--border)';
    wrap.style.borderRadius = '12px';
    wrap.style.padding = '10px 10px';
    wrap.style.background = 'rgba(255,255,255,0.02)';

    const time = new Date(h.createdAt);
    const itemsText = h.items
      .map((it) => {
        const p = state.products.find((x) => x.id === it.productId);
        return `${it.qty}× ${p ? p.name : it.productId}`;
      })
      .join(', ');

    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px;">
        <div>
          <div style="font-weight:700;">${money(h.totals.total)}</div>
          <div style="color: var(--muted); font-size:12px; margin-top:4px;">${itemsText}</div>
        </div>
        <div style="text-align:right; color: var(--muted); font-size:12px;">
          <div>${time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>${h.paymentMethod.toUpperCase()}</div>
        </div>
      </div>
    `;

    list.appendChild(wrap);
  }
}

function addToCart(productId, qty) {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return;
  const q = Math.max(1, Math.floor(qty));

  const existing = state.cart.find((x) => x.productId === productId);
  if (existing) existing.qty += q;
  else state.cart.push({ productId, qty: q, price: p.price });
}

function changeQty(productId, delta) {
  const it = state.cart.find((x) => x.productId === productId);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) state.cart = state.cart.filter((x) => x.productId !== productId);
}

function removeItem(productId) {
  state.cart = state.cart.filter((x) => x.productId !== productId);
}

function clearCart() {
  state.cart = [];
  save();
  renderCart();
}

function pay() {
  if (state.cart.length === 0) {
    toast('Keranjang masih kosong.');
    return;
  }

  const t = cartTotals();
  if (t.total <= 0) {
    toast('Total pembayaran tidak valid.');
    return;
  }

  const paymentMethod = document.getElementById('paymentMethod').value;
  if (paymentMethod === 'cash' && t.change < 0) {
    toast('Uang diterima kurang.');
    return;
  }

  const tx = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    items: state.cart.map((x) => ({ ...x })),
    paymentMethod,
    totals: { subtotal: t.subtotal, discount: t.discount, tax: t.tax, total: t.total },
    createdAt: new Date().toISOString(),
  };

  state.history.push(tx);
  state.cart = [];
  save();
  renderCart();
  toast(`Transaksi berhasil: ${money(tx.totals.total)}`);
}

function startClock() {
  const el = document.getElementById('clock');
  const tick = () => {
    const d = new Date();
    el.textContent = d.toLocaleString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' });
  };
  tick();
  setInterval(tick, 1000);
}

function bind() {
  document.getElementById('btnAdd').addEventListener('click', () => {
    const productId = document.getElementById('productSelect').value;
    const qty = Number(document.getElementById('qtyInput').value || 1);
    addToCart(productId, qty);
    save();
    renderCart();
  });

  document.getElementById('cartBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const productId = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (!productId || !act) return;

    if (act === 'inc') changeQty(productId, +1);
    if (act === 'dec') changeQty(productId, -1);
    if (act === 'remove') removeItem(productId);
    save();
    renderCart();
  });

  document.getElementById('btnClearCart').addEventListener('click', clearCart);

  document.getElementById('paymentMethod').addEventListener('change', () => {
    // update change preview
    renderCart();
  });
  document.getElementById('cashInput').addEventListener('input', renderCart);

  document.getElementById('btnPay').addEventListener('click', pay);
  document.getElementById('btnPay2').addEventListener('click', pay);
}

function init() {
  load();
  renderProducts();
  startClock();

  document.getElementById('cashInput').value = 0;

  bind();
  renderCart();
}

init();

