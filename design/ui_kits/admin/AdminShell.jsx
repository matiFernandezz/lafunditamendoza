const ADM_TABS = [
  { key:'ventas', label:'Ventas', icon:'ShoppingCart' },
  { key:'web', label:'Web', long:'Ventas web', icon:'Globe' },
  { key:'historial', label:'Historial', icon:'ReceiptText' },
  { key:'compras', label:'Compras', icon:'Truck' },
  { key:'nuevo', label:'Nuevo', long:'Nuevo producto', icon:'PackagePlus' },
  { key:'catalogo', label:'Catálogo', icon:'Package' },
];

const admDot = (n, dk) => n ? <span style={{ minWidth:18, height:18, padding:'0 5px', borderRadius:9, background:'var(--admin-danger)', color:'#fff', fontFamily:'var(--font-body)', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', justifyContent:'center', ...(dk ? {} : { position:'absolute', top:-6, right:-10 }) }}>{n}</span> : null;
function AdminShell({ dk, tab, onTab, onLogout, badges, children }) {
  const { Logo } = window.LaFunditaDesignSystem_371b6e;
  const logo = '../../assets/logo-black.jpg';
  if (dk) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--admin-bg)' }}>
        <header style={{ position:'sticky', top:0, zIndex:30, background:'var(--admin-ink)', height:'var(--header-h-admin)', display:'flex', alignItems:'center', gap:40, padding:'0 32px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <Logo crop size={50} src={logo} />
            <span style={{ ...admS.cap, color:'rgb(255 255 255 / .6)' }}>Panel</span>
          </div>
          <nav aria-label="Panel" style={{ display:'flex', gap:4, flex:1 }}>
            {ADM_TABS.map((t) => { const on = t.key === tab; return (
              <button key={t.key} type="button" aria-current={on ? 'page' : undefined} onClick={() => onTab(t.key)}
                style={{ height:40, padding:'0 16px', borderRadius:'var(--admin-radius)', border:0, background:on ? '#fff' : 'transparent', color:on ? '#000' : 'rgb(255 255 255 / .78)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                <Icon name={t.icon} size={18} />{t.long || t.label}{admDot(badges && badges[t.key], true)}
              </button>
            ); })}
          </nav>
          <button type="button" onClick={onLogout} style={{ height:40, padding:'0 12px', borderRadius:'var(--admin-radius)', border:0, background:'transparent', color:'rgb(255 255 255 / .78)', display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-body)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
            <Icon name="LogOut" size={18} />Salir
          </button>
        </header>
        <main style={{ maxWidth:1240, margin:'0 auto', padding:'32px 32px 72px', boxSizing:'border-box' }}>{children}</main>
      </div>
    );
  }
  return (
    <div style={{ minHeight:'100vh', background:'var(--admin-bg)', paddingBottom:'calc(var(--admin-nav-h) + 24px)' }}>
      <header style={{ position:'sticky', top:0, zIndex:30, background:'var(--admin-ink)', height:'var(--admin-topbar-h)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px 0 16px' }}>
        <Logo crop size={42} src={logo} />
        <button type="button" onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión" style={{ width:44, height:44, border:0, background:'transparent', color:'rgb(255 255 255 / .78)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}><Icon name="LogOut" size={20} /></button>
      </header>
      <main style={{ padding:'20px 16px 8px' }}>{children}</main>
      <nav aria-label="Panel" style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'min(100%, 430px)', zIndex:40, background:'#fff', borderTop:'1px solid var(--admin-border)', display:'grid', gridTemplateColumns:'repeat(6, 1fr)', height:'var(--admin-nav-h)', paddingBottom:'env(safe-area-inset-bottom)' }}>
        {ADM_TABS.map((t) => { const on = t.key === tab; return (
          <button key={t.key} type="button" aria-current={on ? 'page' : undefined} onClick={() => onTab(t.key)}
            style={{ position:'relative', border:0, background:'transparent', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:on ? 'var(--admin-ink)' : 'var(--admin-muted)', fontFamily:'var(--font-body)', fontSize:12, fontWeight:on ? 700 : 500, cursor:'pointer', padding:0 }}>
            {on && <span style={{ position:'absolute', top:0, left:'22%', right:'22%', height:3, background:'var(--admin-ink)', borderRadius:'0 0 2px 2px' }}></span>}
            <span style={{ position:'relative' }}><Icon name={t.icon} size={22} stroke={on ? 2.1 : 1.75} />{admDot(badges && badges[t.key], false)}</span>{t.label}
          </button>
        ); })}
      </nav>
    </div>
  );
}

function LoginScreen({ dk, onLogin }) {
  const { Logo } = window.LaFunditaDesignSystem_371b6e;
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const submit = (e) => {
    e && e.preventDefault();
    if (!email.includes('@') || pass.length < 4) { setError('Email o contraseña incorrectos.'); return; }
    setBusy(true); setTimeout(() => onLogin(), 500);
  };
  return (
    <div style={{ minHeight:'100vh', background:dk ? 'var(--admin-bg)' : '#fff', display:'flex', alignItems:dk ? 'center' : 'stretch', justifyContent:'center', padding:dk ? 24 : 0, boxSizing:'border-box' }}>
      <div style={{ width:'100%', maxWidth:dk ? 440 : undefined, background:'#fff', border:dk ? '1px solid var(--admin-border)' : 0, borderRadius:dk ? 8 : 0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div style={{ background:'var(--admin-ink)', padding:dk ? '28px 32px' : '48px 20px 32px', display:'flex', flexDirection:'column', gap:12 }}>
          <Logo crop size={dk ? 96 : 112} src="../../assets/logo-black.jpg" />
          <span style={{ ...admS.cap, color:'rgb(255 255 255 / .6)' }}>Panel de administración</span>
        </div>
        <form onSubmit={submit} style={{ padding:dk ? 32 : '28px 20px', display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <h1 style={{ margin:0, fontFamily:'var(--font-display)', fontWeight:600, fontSize:'var(--admin-title)', letterSpacing:'-.02em', color:'var(--admin-text)' }}>Acceso al panel</h1>
            <p style={{ ...admS.muted, margin:'4px 0 0', fontSize:14 }}>Ingresá con tu cuenta de administrador.</p>
          </div>
          <Field label="Email" htmlFor="adm-email"><Input id="adm-email" type="email" value={email} onChange={(v) => { setEmail(v); setError(null); }} placeholder="admin@lafundita.com" inputMode="email" /></Field>
          <Field label="Contraseña" htmlFor="adm-pass">
            <div style={{ position:'relative' }}>
              <Input id="adm-pass" type={show ? 'text' : 'password'} value={pass} onChange={(v) => { setPass(v); setError(null); }} placeholder="••••••••" onEnter={submit} />
              <span style={{ position:'absolute', right:2, top:2 }}><IconBtn icon={show ? 'EyeOff' : 'Eye'} label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)} /></span>
            </div>
          </Field>
          {error && <Notice kind="danger">{error}</Notice>}
          <Btn type="submit" size="lg" full disabled={busy || !email.trim() || !pass}>{busy ? 'Entrando…' : 'Entrar'}</Btn>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { AdminShell, LoginScreen, ADM_TABS });
