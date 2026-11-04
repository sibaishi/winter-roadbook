(() => {
 const root=document.documentElement,key='suelr-theme';
 let mode='day';
 try {const cookie=document.cookie.split('; ').find(x=>x.startsWith('suelr_theme='))?.split('=')[1];const stored=localStorage.getItem(key)||localStorage.getItem('winter-expedition-theme');if(['day','night'].includes(cookie))mode=cookie;else if(['day','night'].includes(stored))mode=stored;}catch{}
 function apply(value){mode=value==='night'?'night':'day';root.dataset.theme=mode;root.style.colorScheme=mode==='night'?'dark':'light';document.querySelectorAll('[data-theme-toggle]').forEach(b=>{const label=mode==='day'?'夜间模式':'日间模式';b.textContent=label;b.setAttribute('aria-label','切换到'+label);b.setAttribute('aria-pressed',String(mode==='night'));});}
 function save(){try{localStorage.setItem(key,mode);localStorage.setItem('winter-expedition-theme',mode);if(location.hostname==='suelr.com'||location.hostname.endsWith('.suelr.com'))document.cookie='suelr_theme='+mode+'; Domain=suelr.com; Path=/; Max-Age=31536000; SameSite=Lax; Secure';}catch{}}
 apply(mode);document.addEventListener('DOMContentLoaded',()=>{apply(mode);document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{apply(mode==='day'?'night':'day');save();}));});
 addEventListener('storage',e=>{if(e.key===key)apply(e.newValue);});addEventListener('pageshow',()=>{try{const c=document.cookie.split('; ').find(x=>x.startsWith('suelr_theme='))?.split('=')[1];if(['day','night'].includes(c))apply(c);}catch{}});
})();
