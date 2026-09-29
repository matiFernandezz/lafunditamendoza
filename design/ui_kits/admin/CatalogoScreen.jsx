function NameEditor({ value, onSave }) {
  const [t, setT] = React.useState(value);
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => setT(value), [value]);
  const dirty = t.trim() && t.trim() !== value;
  const save = () => { if (!dirty) return; onSave(t.trim()); setOk(true); setTimeout(() => setOk(false), 1200); };
  return (
    <div style={{ display:'flex', gap:8 }}>
      <Input value={t} onChange={setT} onEnter={save} state={ok ? 'ok' : dirty ? 'dirty' : null} ariaLabel="Nombre del producto" style={{ flex:1 }} />
      {dirty && <Btn onClick={save}>Guardar</Btn>}
      {ok && !dirty && <span style={{ display:'flex', alignItems:'center', gap:6, color:'var(--admin-ok)', ...admS.body, fontWeight:600 }}><Icon name="Check" size={18} />Guardado</span>}
    </div>
  );
}

function GalleryEditor({ dk, images, onChange }) {
  const [sel, setSel] = React.useState(null);
  const [drag, setDrag] = React.useState(null);
  const [over, setOver] = React.useState(false);
  const input = React.useRef(null);
  const addFiles = (files) => { const urls = Array.from(files || []).filter((f) => /image\/(jpeg|png|webp)/.test(f.type)).map((f) => URL.createObjectURL(f)); if (urls.length) onChange([...images, ...urls]); };
  const move = (from, to) => { if (to < 0 || to >= images.length) return; const a = [...images]; const [x] = a.splice(from, 1); a.splice(to, 0, x); onChange(a); setSel(to); };
  const remove = (i) => { onChange(images.filter((_, k) => k !== i)); setSel(null); };
  const tile = dk ? 112 : 96;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div onDragOver={(e) => { e.preventDefault(); if (drag === null) setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); if (drag === null) addFiles(e.dataTransfer.files); }}
        style={{ display:'flex', gap:8, overflowX:dk ? 'visible' : 'auto', flexWrap:dk ? 'wrap' : 'nowrap', padding:4, margin:-4, borderRadius:8, outline:over ? '2px dashed var(--admin-ink)' : 'none' }}>
        {images.map((src, i) => (
          <button key={src + i} type="button" draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
            onClick={() => setSel(sel === i ? null : i)} aria-label={`Foto ${i + 1}${i === 0 ? ', principal' : ''}`} aria-pressed={sel === i}
            style={{ position:'relative', width:tile, height:tile, flexShrink:0, padding:0, border:0, borderRadius:4, overflow:'hidden', cursor:'grab', outline:sel === i ? '3px solid var(--admin-ink)' : 'none', outlineOffset:2, opacity:drag === i ? .4 : 1, background:'var(--admin-border)' }}>
            <img src={src} alt="" draggable={false} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            <span style={{ position:'absolute', left:6, top:6, minWidth:22, height:22, padding:'0 6px', borderRadius:11, background:i === 0 ? 'var(--admin-ink)' : 'rgb(255 255 255 / .9)', color:i === 0 ? '#fff' : '#000', ...admS.mono, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{i === 0 ? 'Principal' : i + 1}</span>
          </button>
        ))}
        <button type="button" onClick={() => input.current && input.current.click()}
          style={{ width:dk ? 220 : tile, height:tile, flexShrink:0, border:'2px dashed var(--admin-border-strong)', borderRadius:4, background:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', color:'var(--admin-text)', padding:8 }}>
          <Icon name="ImagePlus" size={24} />
          <span style={{ fontFamily:'var(--font-body)', fontSize:13, fontWeight:600, lineHeight:1.25 }}>{dk ? 'Arrastrá fotos o hacé clic' : 'Agregar fotos'}</span>
          {dk && <span style={{ ...admS.muted, fontSize:12 }}>JPG, PNG o WEBP · varias a la vez</span>}
        </button>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {sel !== null && sel < images.length ? (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <Btn kind="secondary" icon="ArrowLeft" disabled={sel === 0} onClick={() => move(sel, sel - 1)}>Antes</Btn>
          <Btn kind="secondary" icon="ArrowRight" disabled={sel === images.length - 1} onClick={() => move(sel, sel + 1)}>Después</Btn>
          <Btn kind="dangerOutline" icon="Trash2" onClick={() => remove(sel)}>Quitar</Btn>
        </div>
      ) : (
        <p style={{ margin:0, ...admS.muted }}>{images.length ? `La primera es la foto principal en la web. ${dk ? 'Arrastrá para reordenar o hacé' : 'Tocá'} una foto para moverla o quitarla.` : 'Sin fotos: en la web se ve el recuadro vacío.'}</p>
      )}
    </div>
  );
}

function BulkPrice({ product, onApply }) {
  const { fmt } = window.ADM;
  const [step, setStep] = React.useState('idle');
  const [t, setT] = React.useState('');
  const [msg, setMsg] = React.useState(null);
  const n = product.variants.length;
  const target = n === 1 ? 'la variante' : `las ${n} variantes`;
  const price = Number(t);
  if (step === 'idle') return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <Btn kind="secondary" icon="Tag" full onClick={() => { setMsg(null); setStep('edit'); }}>Cambiar precio a todos los modelos</Btn>
      {msg && <p style={{ margin:0, color:'var(--admin-ok)', ...admS.body, fontSize:14, fontWeight:600 }}>{msg}</p>}
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, padding:16, borderRadius:'var(--admin-radius)', background:'var(--admin-bg)', border:'1px solid var(--admin-border)' }}>
      {step === 'edit' ? <>
        <Field label={`Nuevo precio para ${target}`}><Input value={t} onChange={setT} digits prefix="$" mono autoFocus placeholder="0" onEnter={() => price > 0 && setStep('confirm')} /></Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}><Btn kind="secondary" onClick={() => { setStep('idle'); setT(''); }}>Cancelar</Btn><Btn disabled={!(price > 0)} onClick={() => setStep('confirm')}>Continuar</Btn></div>
      </> : <>
        <p style={{ margin:0, ...admS.body }}>Esto cambia el precio de {target} de <strong>{product.name}</strong> a <strong style={admS.mono}>{fmt(price)}</strong>. ¿Confirmás?</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}><Btn kind="secondary" onClick={() => setStep('edit')}>Volver</Btn><Btn onClick={() => { onApply(price); setMsg(`Precio actualizado a ${fmt(price)} en ${n === 1 ? '1 variante' : n + ' variantes'}.`); setStep('idle'); setT(''); }}>Sí, cambiar</Btn></div>
      </>}
    </div>
  );
}

function VariantRow({ dk, v, onSave, first }) {
  const { label } = window.ADM;
  const [stock, setStock] = React.useState(String(v.stock));
  const [price, setPrice] = React.useState(String(v.price));
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => { setStock(String(v.stock)); setPrice(String(v.price)); }, [v.stock, v.price]);
  const valid = stock !== '' && price !== '' && Number(price) > 0;
  const dirty = valid && (Number(stock) !== v.stock || Number(price) !== v.price);
  const save = () => { if (!dirty) return; onSave({ stock:Number(stock), price:Number(price) }); setOk(true); setTimeout(() => setOk(false), 1200); };
  const st = (a, b) => ok ? 'ok' : Number(a) !== b && a !== '' ? 'dirty' : null;
  const out = Number(stock) === 0;
  return (
    <div style={{ display:'grid', gridTemplateColumns:dk ? 'minmax(0,1fr) 108px 140px 104px' : '1fr 1.25fr', gap:8, alignItems:'center', padding:'12px 0', borderTop:first ? 0 : '1px solid var(--admin-border)' }}>
      <div style={{ gridColumn:dk ? undefined : '1 / -1', display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <span style={{ ...admS.body, fontWeight:600 }}>{label(v)}</span>
        {out && <Badge kind="danger">Sin stock</Badge>}
      </div>
      <Input value={stock} onChange={setStock} digits mono align="right" suffix="u." state={st(stock, v.stock)} onEnter={save} ariaLabel={`Stock ${label(v)}`} />
      <Input value={price} onChange={setPrice} digits mono align="right" prefix="$" state={st(price, v.price)} onEnter={save} ariaLabel={`Precio ${label(v)}`} />
      {dk ? <div>{dirty ? <Btn full onClick={save}>Guardar</Btn> : ok ? <span style={{ display:'flex', alignItems:'center', gap:6, color:'var(--admin-ok)', ...admS.body, fontWeight:600 }}><Icon name="Check" size={18} />Listo</span> : null}</div>
        : (dirty || ok) && <div style={{ gridColumn:'1 / -1' }}>{dirty ? <Btn full onClick={save}>Guardar cambios</Btn> : <span style={{ display:'flex', alignItems:'center', gap:6, color:'var(--admin-ok)', ...admS.body, fontWeight:600 }}><Icon name="Check" size={18} />Guardado</span>}</div>}
    </div>
  );
}

function AddVariantDialog({ dk, product, onClose, onAdd }) {
  const { LINES, label } = window.ADM;
  const [model, setModel] = React.useState('');
  const [color, setColor] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [price, setPrice] = React.useState(product ? String(product.variants[0] ? product.variants[0].price : '') : '');
  const [err, setErr] = React.useState(null);
  if (!product) return null;
  const submit = () => {
    const m = model === '__none' ? null : model; const c = color.trim().toLowerCase() || null;
    if (product.variants.some((v) => v.model === m && (v.color || null) === c)) { setErr('Ya existe esa variante.'); return; }
    onAdd({ model:m, color:c, stock:Number(stock) || 0, price:Number(price) });
  };
  return (
    <Sheet open dk={dk} onClose={onClose} title="Agregar variante">
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <p style={{ margin:0, ...admS.muted, fontSize:14 }}>{product.name}</p>
        <Field label="Modelo de iPhone" htmlFor="nv-model">
          <NativeSelect id="nv-model" value={model} onChange={(v) => { setModel(v); setErr(null); }}>
            <option value="">Elegí un modelo</option>
            <option value="__none">Sin modelo (sirve para todos)</option>
            {LINES.map((l) => <optgroup key={l[0]} label={'iPhone ' + l[0]}>{l[1].map((m) => <option key={m} value={m}>{m}</option>)}</optgroup>)}
          </NativeSelect>
        </Field>
        <Field label="Color" htmlFor="nv-color" hint="Opcional. Vacío = color único."><Input id="nv-color" value={color} onChange={(v) => { setColor(v); setErr(null); }} placeholder="Ej.: rosa" /></Field>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Field label="Stock"><Input value={stock} onChange={setStock} digits mono align="right" suffix="u." /></Field>
          <Field label="Precio"><Input value={price} onChange={setPrice} digits mono align="right" prefix="$" /></Field>
        </div>
        {err && <Notice kind="danger">{err}</Notice>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}><Btn kind="secondary" onClick={onClose}>Cancelar</Btn><Btn disabled={!model || !(Number(price) > 0)} onClick={submit}>Agregar</Btn></div>
      </div>
    </Sheet>
  );
}

function ProductEditor({ dk, p, variants, open, onToggle, update, onAddVariant }) {
  const { fmt } = window.ADM;
  const units = p.variants.reduce((s, v) => s + v.stock, 0);
  const outs = p.variants.filter((v) => v.stock === 0).length;
  const prices = [...new Set(p.variants.map((v) => v.price))];
  const sect = (t, c) => <section style={{ display:'flex', flexDirection:'column', gap:10 }}><h3 style={{ margin:0, ...admS.cap }}>{t}</h3>{c}</section>;
  const left = <>
    {sect('Nombre', <NameEditor value={p.name} onSave={(name) => update((x) => ({ ...x, name }))} />)}
    {sect(`Fotos en la web (${p.images.length})`, <GalleryEditor dk={dk} images={p.images} onChange={(images) => update((x) => ({ ...x, images }))} />)}
    {sect('Precio', <BulkPrice product={p} onApply={(price) => update((x) => ({ ...x, variants:x.variants.map((v) => ({ ...v, price })) }))} />)}
  </>;
  const right = sect(`Variantes (${variants.length}${variants.length !== p.variants.length ? ' de ' + p.variants.length : ''})`, <>
    {dk && <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 108px 140px 104px', gap:8, ...admS.muted, fontSize:12 }}><span>Modelo · color</span><span style={{ textAlign:'right' }}>Stock</span><span style={{ textAlign:'right' }}>Precio</span><span></span></div>}
    <div>{variants.map((v, k) => <VariantRow key={v.id} dk={dk} v={v} first={k === 0} onSave={(patch) => update((x) => ({ ...x, variants:x.variants.map((y) => y.id === v.id ? { ...y, ...patch } : y) }))} />)}</div>
    <Btn kind="secondary" icon="Plus" full onClick={onAddVariant}>Agregar variante</Btn>
  </>);
  return (
    <Card pad={0}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 12px 12px 16px', border:0, background:'transparent', textAlign:'left', cursor:'pointer', minHeight:72 }}>
        <Thumb src={p.images[0]} size={52} />
        <span style={{ flex:1, minWidth:0 }}>
          <span style={{ display:'block', ...admS.body, fontSize:16, fontWeight:600 }}>{p.name}</span>
          <span style={{ display:'flex', flexWrap:'wrap', gap:6, ...admS.muted, marginTop:2 }}>
            <span>{p.variants.length} {p.variants.length === 1 ? 'variante' : 'variantes'} · {units} u.</span>
            {outs > 0 && <span style={{ color:'var(--admin-danger)', fontWeight:600 }}>· {outs} sin stock</span>}
            {dk && <span>· {p.category} · {prices.length === 1 ? fmt(prices[0]) : 'varios precios'}</span>}
          </span>
        </span>
        <span style={{ color:'var(--admin-muted)', transform:open ? 'rotate(180deg)' : 'none', transition:'transform var(--dur-fast)' }}><Icon name="ChevronDown" size={22} /></span>
      </button>
      {open && (
        <div style={{ borderTop:'1px solid var(--admin-border)', padding:dk ? 24 : 16, display:'grid', gridTemplateColumns:dk ? 'minmax(0,5fr) minmax(0,6fr)' : '1fr', gap:dk ? 32 : 24, alignItems:'start' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:24, minWidth:0 }}>{left}</div>
          <div style={{ minWidth:0 }}>{right}</div>
        </div>
      )}
    </Card>
  );
}

function CatalogoScreen({ dk, products, setProducts, focusId, notice, clearNotice }) {
  const { MODELS, matches } = window.ADM;
  const [q, setQ] = React.useState('');
  const [model, setModel] = React.useState('');
  const [stockF, setStockF] = React.useState('all');
  const [openId, setOpenId] = React.useState(focusId || (products[0] && products[0].id));
  const [adding, setAdding] = React.useState(null);
  const update = (pid) => (fn) => setProducts((ps) => ps.map((p) => p.id === pid ? fn(p) : p));
  const vOk = (v) => (!model || (model === '__none' ? !v.model : v.model === model)) && (stockF === 'all' || (stockF === 'in' ? v.stock > 0 : v.stock === 0));
  const list = products.map((p) => ({ p, variants:p.variants.filter((v) => vOk(v) && matches(p, v, q)) })).filter((r) => r.variants.length || (!q && !model && stockF === 'all'));
  const totalV = list.reduce((s, r) => s + r.variants.length, 0);
  return (
    <div style={{ maxWidth:dk ? 1100 : undefined, margin:'0 auto', display:'flex', flexDirection:'column', gap:16 }}>
      <PageTitle sub={`${list.length} productos · ${totalV} variantes`}>Catálogo y stock</PageTitle>
      {notice && <Notice kind="ok" onClose={clearNotice}>{notice}</Notice>}
      <div style={{ display:'grid', gridTemplateColumns:dk ? 'minmax(0,2fr) minmax(0,1fr) minmax(0,1.4fr)' : '1fr', gap:8 }}>
        <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre, modelo, color o categoría" />
        <NativeSelect ariaLabel="Modelo de iPhone" value={model} onChange={setModel}>
          <option value="">Todos los modelos</option>
          <option value="__none">Sin modelo (universales)</option>
          {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </NativeSelect>
        <Seg ariaLabel="Stock" value={stockF} onChange={setStockF} options={[{ value:'all', label:'Todos' }, { value:'in', label:'Con stock' }, { value:'out', label:'Sin stock' }]} />
      </div>
      {list.length === 0 ? <Empty>No hay productos con esos filtros.</Empty> : list.map(({ p, variants }) => (
        <ProductEditor key={p.id} dk={dk} p={p} variants={variants} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} update={update(p.id)} onAddVariant={() => setAdding(p)} />
      ))}
      <AddVariantDialog key={adding ? adding.id : 'x'} dk={dk} product={adding} onClose={() => setAdding(null)}
        onAdd={(v) => { update(adding.id)((x) => ({ ...x, variants:[...x.variants, { id:'v' + Date.now(), ...v }] })); setAdding(null); }} />
    </div>
  );
}

Object.assign(window, { CatalogoScreen });
