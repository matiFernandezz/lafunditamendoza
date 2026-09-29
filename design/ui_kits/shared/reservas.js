// Reservas web compartidas entre la tienda y el panel (localStorage). Alias, CBU y WhatsApp = DATOS DE PRUEBA.
(function(){
  const KEY = 'lf-web-orders-v1', EVT = 'lf-web-orders', H = 3600e3;
  const CONFIG = { alias:'lafundita.mza', cbu:'0000003100012345678901', titular:'La Fundita', banco:'Mercado Pago', whatsapp:'5492610000000', holdHours:24, test:true };
  const fmt = (x) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(x || 0);
  const tot = (items) => items.reduce((s, i) => s + i.qty * i.price, 0);
  function seed() {
    const t = Date.now(), iso = (x) => new Date(x).toISOString();
    const O = (id, h, status, name, phone, items, extra) => ({ id, createdAt:iso(t - h * H), status, customer:{ name, phone }, items, total:tot(items), ...(extra || {}) });
    return [
      O('LF-1041', 2, 'pendiente', 'Sofía Martínez', '261 555 1234', [{ name:'Cherry Case', model:'iPhone 15', color:'transparente', qty:1, price:18500 }]),
      O('LF-1040', 21.5, 'pendiente', 'Julián Pérez', '261 444 9087', [{ name:'Wave Case', model:'iPhone 16 Pro', color:'negro', qty:1, price:19900 }, { name:'Cable USB-C a USB-C', model:null, color:'blanco', qty:1, price:8500 }]),
      O('LF-1039', 30, 'pendiente', 'Camila Ruiz', '261 333 2211', [{ name:'MagCase', model:'iPhone 16 Pro', color:'azul', qty:1, price:15000 }]),
      O('LF-1038', 26, 'pagada', 'Martina Gómez', '261 222 7788', [{ name:'Smoky Case', model:'iPhone 15 Pro', color:'tornasolado', qty:1, price:19900 }], { paidAt:iso(t - 25 * H) }),
      O('LF-1037', 50, 'cancelada', 'Tomás Díaz', '261 111 4455', [{ name:'Star Case', model:'iPhone 16 Pro Max', color:'rosa', qty:1, price:19900 }], { cancelledAt:iso(t - 26 * H), cancelReason:'No mandó el comprobante' }),
    ];
  }
  function read() { try { const v = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(v)) return v; } catch (e) {} return null; }
  function all() { let v = read(); if (!v) { v = seed(); localStorage.setItem(KEY, JSON.stringify(v)); } return v; }
  function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); window.dispatchEvent(new CustomEvent(EVT)); }
  function get(id) { return all().find((o) => o.id === id) || null; }
  function create({ customer, items }) {
    const list = all();
    const max = list.reduce((m, o) => Math.max(m, Number(o.id.replace('LF-', '')) || 0), 1036);
    const o = { id:'LF-' + (max + 1), createdAt:new Date().toISOString(), status:'pendiente', customer, items, total:tot(items) };
    save([o, ...list]); return o;
  }
  const expiresAt = (o) => new Date(o.createdAt).getTime() + CONFIG.holdHours * H;
  const left = (o, now) => expiresAt(o) - (now || Date.now());
  const reservedFor = (name) => all().filter((o) => o.status !== 'cancelada').reduce((s, o) => s + o.items.filter((i) => i.name === name).reduce((a, i) => a + i.qty, 0), 0);
  const leftText = (ms) => { if (ms <= 0) return '0 min'; const h = Math.floor(ms / H), m = Math.floor((ms % H) / 60000); return h ? `${h} h ${m} min` : `${m} min`; };
  function waLink(o) {
    const lines = o.items.map((i) => `• ${i.name}${i.model ? ' · ' + i.model : ''}${i.color ? ' · ' + i.color : ''} ×${i.qty}`);
    const msg = `¡Hola La Fundita! Te mando el comprobante de mi reserva ${o.id} por ${fmt(o.total)}.\n${lines.join('\n')}\nA nombre de: ${o.customer.name}`;
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  }
  const customerLink = (o) => 'https://wa.me/549' + (o.customer.phone || '').replace(/\D/g, '');
  function subscribe(fn) {
    const a = () => fn(all()); const b = (e) => { if (e.key === KEY) a(); };
    window.addEventListener(EVT, a); window.addEventListener('storage', b);
    return () => { window.removeEventListener(EVT, a); window.removeEventListener('storage', b); };
  }
  window.LF_RES = { CONFIG, all, save, get, create, expiresAt, left, leftText, reservedFor, waLink, customerLink, subscribe, fmt };
})();
