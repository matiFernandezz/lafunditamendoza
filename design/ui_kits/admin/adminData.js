// Datos de muestra del panel. Modelos = seed real; productos, stock, ventas = ejemplo.
(function(){
  const A = '../../assets/photos/';
  const LINES = [
    ['11',['iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max']],
    ['12',['iPhone 12','iPhone 12 Pro','iPhone 12 Pro Max']],
    ['13',['iPhone 13','iPhone 13 Pro','iPhone 13 Pro Max']],
    ['14',['iPhone 14','iPhone 14 Pro','iPhone 14 Pro Max']],
    ['15',['iPhone 15','iPhone 15 Pro','iPhone 15 Pro Max']],
    ['16',['iPhone 16','iPhone 16 Pro','iPhone 16 Pro Max']],
    ['17',['iPhone 17','iPhone 17 Air','iPhone 17 Pro','iPhone 17 Pro Max']],
    ['18',['iPhone 18','iPhone 18 Air','iPhone 18 Pro','iPhone 18 Pro Max']],
  ];
  const MODELS = LINES.flatMap(l => l[1]);
  const CATEGORIES = ['Transparentes','De diseño','De silicona','Cargadores y cables','Straps','Protector de cargador','Lentes de cámara'];
  let n = 0;
  const V = (model, color, stock, price) => ({ id:'v' + (++n), model, color, stock, price });
  const each = (models, colors, stocks, price) => { let k = 0; return models.flatMap(m => colors.map(c => V(m, c, stocks[k++ % stocks.length], price))); };
  const products = [
    { id:'p1', name:'Cherry Case', category:'Transparentes', description:'Transparente con cerezas estampadas y bordes plateados.', images:[A+'cherry-cases.jpg', A+'coleccion-flatlay-a.jpg', A+'coleccion-flatlay-b.jpg'],
      variants: each(['iPhone 13 Pro','iPhone 14 Pro','iPhone 15','iPhone 15 Pro','iPhone 16 Pro','iPhone 16 Pro Max','iPhone 17 Pro'], ['transparente'], [4,2,6,0,5,3,7], 18500) },
    { id:'p2', name:'Wave Case', category:'De diseño', description:'Relieve ondulado con marco metalizado.', images:[A+'wave-cases-mesa.jpg', A+'coleccion-flatlay-a.jpg'],
      variants: each(['iPhone 15 Pro','iPhone 16 Pro'], ['negro','rosa','azul','blanco'], [3,1,0,4,2,5,2,0], 19900) },
    { id:'p3', name:'Star Case', category:'De diseño', description:'', images:[A+'star-cases.jpg'],
      variants: each(['iPhone 15 Pro','iPhone 16 Pro Max'], ['rosa'], [1,2], 19900) },
    { id:'p4', name:'MagCase', category:'De silicona', description:'Compatible con MagSafe. Tacto mate.', images:[A+'magsafe-colores-mesa.jpg', A+'coleccion-flatlay-b.jpg'],
      variants: each(['iPhone 16','iPhone 16 Pro','iPhone 17 Pro'], ['azul','blanco','naranja'], [6,3,2,4,0,1,5,2,3], 15000) },
    { id:'p5', name:'Smoky Case', category:'De diseño', description:'', images:[A+'marble-cases.jpg'],
      variants: each(['iPhone 15 Pro','iPhone 16 Pro'], ['tornasolado'], [3,2], 19900) },
    { id:'p6', name:'Cargador 20 W', category:'Cargadores y cables', description:'Cabezal USB-C de carga rápida.', images:[], variants:[V(null,'blanco',10,12000)] },
    { id:'p7', name:'Cable USB-C a USB-C', category:'Cargadores y cables', description:'Para iPhone 15 en adelante.', images:[], variants:[V(null,'blanco',14,8500)] },
    { id:'p8', name:'Cable USB-C a Lightning', category:'Cargadores y cables', description:'Para iPhone 11 a 14.', images:[], variants:[V(null,'blanco',0,8500)] },
    { id:'p9', name:'Strap corto', category:'Straps', description:'', images:[], variants: each([null], ['negro','rosa','blanco'], [5,2,1], 9000) },
    { id:'p10', name:'Protector de lentes de cámara', category:'Lentes de cámara', description:'', images:[],
      variants: each(['iPhone 15 Pro','iPhone 16 Pro','iPhone 17 Pro'], ['plateado','negro'], [3,2,4,0,2,3], 7000) },
  ];
  const find = (pid, model, color) => { const p = products.find(x => x.id === pid); const v = p.variants.find(x => x.model === model && x.color === color); return { p, v }; };
  const at = (daysAgo, h, m) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); };
  let sn = 0;
  const S = (date, method, pct, lines, status, reason) => {
    const items = lines.map(([pid, model, color, qty]) => { const { p, v } = find(pid, model, color); return { pid, vid:v.id, name:p.name, model, color, qty, price:v.price }; });
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const discount = Math.round(subtotal * pct / 100);
    return { id:'s' + (++sn), date, method, discountPct:pct, subtotal, discount, total:subtotal - discount, items, status: status || 'ok', voidReason: reason || null, voidedAt: status ? date : null };
  };
  const sales = [
    S(at(0,13,10),'efectivo',0,[['p1','iPhone 17 Pro','transparente',1]]),
    S(at(0,12,30),'transferencia',15,[['p5','iPhone 16 Pro','tornasolado',1],['p6',null,'blanco',1]]),
    S(at(0,11,52),'efectivo',0,[['p3','iPhone 15 Pro','rosa',1]],'anulada','Se cargó dos veces'),
    S(at(0,11,5),'efectivo',0,[['p4','iPhone 16 Pro','azul',1]]),
    S(at(0,10,40),'transferencia',10,[['p2','iPhone 16 Pro','negro',2],['p7',null,'blanco',1]]),
    S(at(0,10,12),'efectivo',0,[['p1','iPhone 15','transparente',1]]),
    S(at(1,18,20),'transferencia',0,[['p4','iPhone 17 Pro','blanco',1],['p9',null,'rosa',1]]),
    S(at(1,16,45),'efectivo',20,[['p2','iPhone 15 Pro','rosa',3]]),
    S(at(2,12,5),'efectivo',0,[['p10','iPhone 16 Pro','plateado',1]]),
    S(at(4,17,30),'transferencia',0,[['p1','iPhone 16 Pro Max','transparente',1],['p6',null,'blanco',1]]),
    S(at(9,11,0),'efectivo',10,[['p5','iPhone 15 Pro','tornasolado',2]]),
    S(at(15,19,10),'transferencia',0,[['p4','iPhone 16','naranja',1]]),
  ];
  const suppliers = [{ id:'sp1', name:'Importadora Cuyo' }, { id:'sp2', name:'Distribuidora Once' }, { id:'sp3', name:'Casemanía BA' }];

  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fmt = (x) => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }).format(x || 0);
  const shortModel = (m) => m ? m.replace('iPhone ', '') : '';
  const label = (v) => [v.model, v.color && norm(v.color) !== 'unico' ? v.color : null].filter(Boolean).join(' · ') || 'Único';
  const matches = (p, v, q) => { const toks = norm(q).split(/\s+/).filter(Boolean); if (!toks.length) return true; const hay = norm([p.name, p.category, v.model, v.color].join(' ')); return toks.every(t => hay.includes(t)); };
  const lineOf = (model) => { const l = LINES.find(x => x[1].includes(model)); return l ? l[0] : null; };

  window.ADM_DATA = { products, sales, suppliers, categories: CATEGORIES };
  window.ADM = { LINES, MODELS, fmt, label, matches, norm, shortModel, lineOf };
})();
