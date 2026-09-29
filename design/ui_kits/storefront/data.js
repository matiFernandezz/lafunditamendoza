// Datos de muestra. Categorías y modelos = seed real del repo; precios/stock = ejemplo.
window.LF_DATA = (function(){
  const P = 'photos/';
  const lines = [
    {label:'11',models:['iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max']},
    {label:'12',models:['iPhone 12','iPhone 12 Pro','iPhone 12 Pro Max']},
    {label:'13',models:['iPhone 13','iPhone 13 Pro','iPhone 13 Pro Max']},
    {label:'14',models:['iPhone 14','iPhone 14 Pro','iPhone 14 Pro Max']},
    {label:'15',models:['iPhone 15','iPhone 15 Pro','iPhone 15 Pro Max']},
    {label:'16',models:['iPhone 16','iPhone 16 Pro','iPhone 16 Pro Max']},
    {label:'17',models:['iPhone 17','iPhone 17 Air','iPhone 17 Pro','iPhone 17 Pro Max']},
    {label:'18',models:['iPhone 18','iPhone 18 Air','iPhone 18 Pro','iPhone 18 Pro Max']},
  ].map(l=>({label:l.label,models:l.models.map(n=>({name:n}))}));
  const allModels = lines.flatMap(l=>l.models.map(m=>m.name));
  const categories = [
    {slug:'de-diseno',name:'De diseño',parent:'Fundas',image:P+'star-cases.jpg'},
    {slug:'transparentes',name:'Transparentes',parent:'Fundas',image:P+'cherry-cases.jpg'},
    {slug:'de-silicona',name:'De silicona',parent:'Fundas',image:P+'magsafe-colores-mesa.jpg'},
    {slug:'accesorios',name:'Accesorios',image:null,subs:['straps','protector-cargador','lentes-camara']},
    {slug:'cargadores',name:'Cargadores y cables',image:null,universal:true},
    {slug:'straps',name:'Straps',parent:'Accesorios',sub:'accesorios',image:null,universal:true},
    {slug:'protector-cargador',name:'Protector de cargador',parent:'Accesorios',sub:'accesorios',image:null,universal:true},
    {slug:'lentes-camara',name:'Lentes de cámara',parent:'Accesorios',sub:'accesorios',image:null},
  ];
  const mk=(id,name,cat,imgs,price,models,colors,stock,desc)=>({id,name,cat,images:imgs.map(i=>P+i),price,models,colors,stock,desc});
  const pro=['iPhone 13 Pro','iPhone 14 Pro','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 16 Pro','iPhone 16 Pro Max'];
  const products = [
    mk('cherry','Cherry Case','transparentes',['cherry-cases.jpg','coleccion-flatlay-a.jpg','coleccion-flatlay-b.jpg'],18500,pro,['transparente'],2,'Transparente con cerezas estampadas y bordes plateados.'),
    mk('wave','Wave Case','de-diseno',['wave-cases-mesa.jpg','coleccion-flatlay-a.jpg'],19900,pro,['rosa','negro','azul','gris'],8,'Relieve ondulado con marco metalizado.'),
    mk('star','Star Case','de-diseno',['star-cases.jpg'],19900,['iPhone 15 Pro','iPhone 16 Pro Max'],['rosa'],1,null),
    mk('magcase','MagCase','de-silicona',['magsafe-colores-mesa.jpg','coleccion-flatlay-b.jpg'],15000,allModels.slice(6),['azul','blanco','naranja'],12,'Compatible con MagSafe. Tacto mate.'),
    mk('smoky','Smoky Case','de-diseno',['marble-cases.jpg'],19900,pro,['gris','verde'],5,null),
    mk('cargador-20w','Cargador 20 W','cargadores',[],12000,[],['blanco'],10,'Cabezal USB-C de carga rápida. Sirve para todos los iPhone.'),
    mk('cable-c-lightning','Cable USB-C a Lightning','cargadores',[],8500,[],['blanco'],10,'Para iPhone 11 a 14.'),
    mk('cable-c-c','Cable USB-C a USB-C','cargadores',[],8500,[],['blanco'],10,'Para iPhone 15 en adelante.'),
    mk('cargador-completo','Cargador completo','cargadores',[],18000,[],['blanco'],6,'Cabezal 20 W + cable a elección.'),
    mk('strap-corto','Strap corto','straps',[],9000,[],['negro','rosa','blanco'],8,null),
    mk('strap-cruzado','Strap cruzado','straps',[],11000,[],['negro','beige'],5,null),
    mk('protector-cable','Protector de cargador','protector-cargador',[],3500,[],['multicolor'],15,'Protege la punta del cable para que no se corte.'),
    mk('lentes','Protector de lentes de cámara','lentes-camara',[],7000,allModels,['transparente','negro','plateado'],9,'Elegí tu modelo: cada iPhone tiene su módulo de cámara.'),
    mk('estelar','Estelar Case','de-diseno',['coleccion-flatlay-b.jpg'],21000,pro,['multicolor'],4,null),
  ];
  return {lines,allModels,categories,products,
    fmt:(n)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(n),
    nav:[{key:'fundas',label:'Fundas'},{key:'accesorios',label:'Accesorios'},{key:'cargadores',label:'Cargadores y cables'},{key:'nosotros',label:'Nosotros'}]};
})();
