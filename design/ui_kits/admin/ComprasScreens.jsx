function SupplierPicker({ suppliers, value, onChange, onCreate }) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [contact, setContact] = React.useState('');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Field label="Proveedor" htmlFor="c-sup">
        <NativeSelect id="c-sup" value={creating ? '__new' : value} onChange={(v) => { if (v === '__new') { setCreating(true); onChange(''); } else { setCreating(false); onChange(v); } }}>
          <option value="">Elegí un proveedor</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value="__new">+ Nuevo proveedor</option>
        </NativeSelect>
      </Field>
      {creating && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, padding:16, borderRadius:'var(--admin-radius)', background:'var(--admin-bg)', border:'1px solid var(--admin-border)' }}>
          <Field label="Nombre" htmlFor="c-sn"><Input id="c-sn" value={name} onChange={setName} autoFocus /></Field>
          <Field label="Datos de contacto (opcional)" htmlFor="c-sc"><Input id="c-sc" value={contact} onChange={setContact} placeholder="Teléfono, mail, dirección…" /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <Btn kind="secondary" onClick={() => setCreating(false)}>Cancelar</Btn>
            <Btn disabled={!name.trim()} onClick={() => { const s = onCreate(name.trim(), contact.trim()); onChange(s.id); setCreating(false); setName(''); setContact(''); }}>Guardar proveedor</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function ComprasScreen({ dk, products, suppliers, onCreateSupplier, onPurchase }) {
  const { fmt, label, matches } = window.ADM;
  const [sup, setSup] = React.useState('');
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [notice, setNotice] = React.useState(null);
  const results = q.trim() ? products.flatMap((p) => p.variants.filter((v) => matches(p, v, q)).map((v) => ({ p, v }))).slice(0, 8) : [];
  const add = (p, v) => { setItems((it) => it.some((i) => i.vid === v.id) ? it.map((i) => i.vid === v.id ? { ...i, qty:i.qty + 1 } : i) : [...it, { vid:v.id, pid:p.id, name:p.name, model:v.model, color:v.color, stock:v.stock, qty:1, cost:'' }]); setQ(''); };
  const set = (vid, patch) => setItems((it) => it.map((i) => i.vid === vid ? { ...i, ...patch } : i));
  const units = items.reduce((s, i) => s + i.qty, 0);
  const cost = items.reduce((s, i) => s + i.qty * (Number(i.cost) || 0), 0);
  const ready = sup && items.length && items.every((i) => Number(i.cost) > 0 && i.qty > 0);
  const submit = () => {
    onPurchase(items); const s = suppliers.find((x) => x.id === sup);
    setNotice(`Compra registrada · ${s ? s.name : ''} · se ${units === 1 ? 'sumó 1 unidad' : `sumaron ${units} unidades`} al stock.`);
    setItems([]); setSup('');
  };
  const summary = (
    <Card pad={dk ? 20 : 16}>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <Row label="Productos" value={items.length} />
        <Row label="Unidades que entran" value={units} />
        <div style={{ borderTop:'1px solid var(--admin-border)', margin:'2px 0' }}></div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}><span style={admS.cap}>Costo total</span><span style={{ ...admS.mono, fontSize:28, fontWeight:700, color:'var(--admin-text)' }}>{fmt(cost)}</span></div>
        <Btn size="lg" full icon="PackageCheck" disabled={!ready} onClick={submit} style={{ marginTop:6 }}>Registrar compra</Btn>
        {!ready && <p style={{ margin:0, ...admS.muted, textAlign:'center' }}>{!sup ? 'Elegí un proveedor.' : !items.length ? 'Agregá al menos un producto.' : 'Completá el costo de cada producto.'}</p>}
      </div>
    </Card>
  );
  const form = (
    <div style={{ display:'flex', flexDirection:'column', gap:20, minWidth:0 }}>
      <SupplierPicker suppliers={suppliers} value={sup} onChange={setSup} onCreate={onCreateSupplier} />
      <div style={{ display:'flex', flexDirection:'column', gap:8, position:'relative' }}>
        <label style={{ ...admS.label, marginBottom:0 }}>Productos que entran</label>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar producto o modelo para agregar" />
        {q.trim() && (
          <Card pad={0}>
            {results.length === 0 ? <p style={{ margin:0, padding:16, ...admS.muted }}>Sin resultados. Si es un producto nuevo, crealo en “Nuevo”.</p> : results.map(({ p, v }, k) => (
              <button key={v.id} type="button" onClick={() => add(p, v)} style={{ width:'100%', minHeight:56, display:'flex', alignItems:'center', gap:12, padding:'8px 12px 8px 16px', border:0, borderTop:k ? '1px solid var(--admin-border)' : 0, background:'#fff', textAlign:'left', cursor:'pointer' }}>
                <span style={{ flex:1, minWidth:0 }}><span style={{ display:'block', ...admS.body, fontWeight:600 }}>{p.name}</span><span style={{ display:'block', ...admS.muted }}>{label(v)} · stock {v.stock}</span></span>
                <span style={{ width:40, height:40, borderRadius:9999, background:'var(--admin-ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="Plus" size={20} stroke={2.2} /></span>
              </button>
            ))}
          </Card>
        )}
      </div>
      {items.length === 0 ? <Empty>Buscá y agregá los productos de esta compra.</Empty> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.map((i) => (
            <Card key={i.vid}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, ...admS.body, fontWeight:600 }}>{i.name}</p>
                  <p style={{ margin:'2px 0 0', ...admS.muted }}>{label(i)} · hoy hay {i.stock} → quedan {i.stock + i.qty}</p>
                </div>
                <IconBtn icon="Trash2" kind="danger" label="Quitar de la compra" onClick={() => setItems((it) => it.filter((x) => x.vid !== i.vid))} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:dk ? 'auto minmax(0,180px) 1fr' : 'auto 1fr', gap:12, alignItems:'end', marginTop:12 }}>
                <Field label="Cantidad"><Stepper value={i.qty} min={1} onChange={(qty) => set(i.vid, { qty })} /></Field>
                <Field label="Costo unitario"><Input value={i.cost} onChange={(cost) => set(i.vid, { cost })} digits mono align="right" prefix="$" placeholder="0" state={i.cost === '' ? null : 'dirty'} /></Field>
                <div style={{ gridColumn:dk ? undefined : '1 / -1', textAlign:'right', ...admS.mono, fontSize:15, fontWeight:600, color:'var(--admin-text)' }}>{Number(i.cost) > 0 ? `Subtotal ${fmt(i.qty * Number(i.cost))}` : ''}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div style={{ maxWidth:dk ? 1040 : undefined, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      <PageTitle sub="Mercadería que entra de un proveedor. Se suma al stock.">Cargar compra</PageTitle>
      {notice && <Notice kind="ok" onClose={() => setNotice(null)}>{notice}</Notice>}
      {dk ? <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 340px', gap:24, alignItems:'start' }}>{form}<aside style={{ position:'sticky', top:88 }}>{summary}</aside></div> : <>{form}{summary}</>}
    </div>
  );
}

function NuevoProductoScreen({ dk, categories, onCreate }) {
  const { LINES, fmt, shortModel } = window.ADM;
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [cat, setCat] = React.useState('');
  const [universal, setUniversal] = React.useState(false);
  const [models, setModels] = React.useState([]);
  const [colors, setColors] = React.useState([]);
  const [ct, setCt] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [over, setOver] = React.useState({});
  const [gone, setGone] = React.useState([]);
  const toggle = (m) => setModels((ms) => ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]);
  const toggleLine = (l) => setModels((ms) => l[1].every((m) => ms.includes(m)) ? ms.filter((m) => !l[1].includes(m)) : [...new Set([...ms, ...l[1]])]);
  const addColor = () => { const c = ct.trim().toLowerCase(); if (c && !colors.includes(c)) setColors([...colors, c]); setCt(''); };
  const ordered = universal ? [null] : LINES.flatMap((l) => l[1]).filter((m) => models.includes(m));
  const rows = ordered.flatMap((m) => (colors.length ? colors : [null]).map((c) => ({ key:(m || '-') + '|' + (c || '-'), model:m, color:c }))).filter((r) => !gone.includes(r.key))
    .map((r) => ({ ...r, stock:(over[r.key] && over[r.key].stock !== undefined) ? over[r.key].stock : stock, price:(over[r.key] && over[r.key].price !== undefined) ? over[r.key].price : price }));
  const setO = (k, patch) => setOver((o) => ({ ...o, [k]:{ ...o[k], ...patch } }));
  const ready = name.trim() && cat && rows.length && rows.every((r) => Number(r.price) > 0);
  const create = () => onCreate({ id:'p' + Date.now(), name:name.trim(), description:desc.trim(), category:cat, images:[],
    variants:rows.map((r, k) => ({ id:'v' + Date.now() + k, model:r.model, color:r.color, stock:Number(r.stock) || 0, price:Number(r.price) })) });
  const datos = (
    <Card pad={dk ? 24 : 16}>
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionTitle>Datos</SectionTitle>
        <Field label="Nombre" htmlFor="np-name"><Input id="np-name" value={name} onChange={setName} placeholder="Ej.: Cherry Case" /></Field>
        <Field label="Descripción" htmlFor="np-desc" hint="Se muestra en la ficha del producto en la web."><TextArea id="np-desc" value={desc} onChange={setDesc} placeholder="Material, detalle, compatibilidad…" /></Field>
        <Field label="Categoría" htmlFor="np-cat"><NativeSelect id="np-cat" value={cat} onChange={setCat}><option value="">Elegí una categoría</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</NativeSelect></Field>
        <p style={{ margin:0, ...admS.muted }}>Las fotos se suben después, desde Catálogo.</p>
      </div>
    </Card>
  );
  const variantes = (
    <Card pad={dk ? 24 : 16}>
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
        <SectionTitle>Variantes</SectionTitle>
        <div>
          <p style={admS.label}>¿Para qué modelos?</p>
          <Seg value={universal ? 'u' : 'm'} onChange={(v) => setUniversal(v === 'u')} options={[{ value:'m', label:'Por modelo' }, { value:'u', label:'Sirve para todos' }]} />
        </div>
        {!universal && (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {LINES.map((l) => { const all = l[1].every((m) => models.includes(m)); return (
              <div key={l[0]} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop:'1px solid var(--admin-border)' }}>
                <button type="button" onClick={() => toggleLine(l)} aria-pressed={all} title="Toda la línea" style={{ width:48, height:44, flexShrink:0, border:0, borderRadius:'var(--admin-radius)', background:all ? 'var(--admin-ink)' : 'transparent', color:all ? '#fff' : 'var(--admin-text)', fontFamily:'var(--font-display)', fontWeight:600, fontSize:22, letterSpacing:'-.02em', cursor:'pointer' }}>{l[0]}</button>
                <div style={{ display:'flex', gap:6, overflowX:'auto', flexWrap:dk ? 'wrap' : 'nowrap', scrollbarWidth:'none' }}>{l[1].map((m) => <Chip key={m} active={models.includes(m)} onClick={() => toggle(m)}>{shortModel(m).replace(l[0], '').trim() || 'Base'}</Chip>)}</div>
              </div>
            ); })}
          </div>
        )}
        <Field label="Colores" hint="Si no cargás colores, queda como color único.">
          <div style={{ display:'flex', gap:8 }}><Input value={ct} onChange={setCt} onEnter={addColor} placeholder="Ej.: rosa" style={{ flex:1 }} /><Btn kind="secondary" icon="Plus" onClick={addColor} disabled={!ct.trim()}>Sumar</Btn></div>
          {colors.length > 0 && <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>{colors.map((c) => (
            <span key={c} style={{ display:'inline-flex', alignItems:'center', gap:2, height:40, padding:'0 2px 0 14px', borderRadius:9999, border:'1px solid var(--admin-border-strong)', ...admS.body, fontWeight:500, textTransform:'capitalize' }}>{c}<IconBtn icon="X" size={36} label={`Quitar ${c}`} onClick={() => setColors(colors.filter((x) => x !== c))} /></span>
          ))}</div>}
        </Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Field label="Precio de venta"><Input value={price} onChange={setPrice} digits mono align="right" prefix="$" placeholder="0" /></Field>
          <Field label="Stock inicial"><Input value={stock} onChange={setStock} digits mono align="right" suffix="u." /></Field>
        </div>
        {rows.length > 0 && (
          <div>
            <p style={{ ...admS.label, marginBottom:4 }}>Se van a crear {rows.length} {rows.length === 1 ? 'variante' : 'variantes'}</p>
            <p style={{ ...admS.muted, margin:'0 0 4px' }}>Podés ajustar stock o precio de cada una.</p>
            {rows.map((r, k) => (
              <div key={r.key} style={{ display:'grid', gridTemplateColumns:dk ? 'minmax(0,1fr) 96px 128px 44px' : 'minmax(0,1fr) 44px', gap:8, alignItems:'center', padding:'10px 0', borderTop:'1px solid var(--admin-border)' }}>
                <span style={{ ...admS.body, fontWeight:600 }}>{[r.model || 'Todos los modelos', r.color].filter(Boolean).join(' · ')}</span>
                {!dk && <IconBtn icon="X" label="Quitar variante" onClick={() => setGone([...gone, r.key])} />}
                <div style={{ gridColumn:dk ? undefined : '1 / -1', display:dk ? 'contents' : 'grid', gridTemplateColumns:'1fr 1.3fr', gap:8 }}>
                  <Input value={r.stock} onChange={(v) => setO(r.key, { stock:v })} digits mono align="right" suffix="u." ariaLabel="Stock" />
                  <Input value={r.price} onChange={(v) => setO(r.key, { price:v })} digits mono align="right" prefix="$" ariaLabel="Precio" />
                </div>
                {dk && <IconBtn icon="X" label="Quitar variante" onClick={() => setGone([...gone, r.key])} />}
              </div>
            ))}
          </div>
        )}
        <Btn size="lg" full icon="PackagePlus" disabled={!ready} onClick={create}>Crear producto{rows.length ? ` con ${rows.length} ${rows.length === 1 ? 'variante' : 'variantes'}` : ''}</Btn>
        {!ready && <p style={{ margin:'-8px 0 0', ...admS.muted, textAlign:'center' }}>{!name.trim() ? 'Falta el nombre.' : !cat ? 'Falta la categoría.' : !rows.length ? 'Elegí al menos un modelo.' : 'Falta el precio.'}</p>}
      </div>
    </Card>
  );
  return (
    <div style={{ maxWidth:dk ? 1100 : undefined, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      <PageTitle>Nuevo producto</PageTitle>
      {dk ? <div style={{ display:'grid', gridTemplateColumns:'minmax(0,4fr) minmax(0,6fr)', gap:24, alignItems:'start' }}><div style={{ position:'sticky', top:88 }}>{datos}</div>{variantes}</div> : <>{datos}{variantes}</>}
    </div>
  );
}

Object.assign(window, { ComprasScreen, NuevoProductoScreen });
