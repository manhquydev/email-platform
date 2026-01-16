var content=function(){"use strict";var Ie=Object.defineProperty;var Le=(I,C,L)=>C in I?Ie(I,C,{enumerable:!0,configurable:!0,writable:!0,value:L}):I[C]=L;var _=(I,C,L)=>Le(I,typeof C!="symbol"?C+"":C,L);function I(t){return t}const C=['input[type="email"]','input[name*="email" i]','input[id*="email" i]','input[placeholder*="email" i]','input[autocomplete="email"]','input[aria-label*="email" i]','input[aria-labelledby*="email" i]','input[name="user_email"]','input[name="identifier"]','input[name*="login" i]','input[id*="login" i]','input[data-testid*="email" i]','input[data-qa*="email" i]','input[type="text"][id*="user" i]','input[type="text"][name*="user" i]'],L=["email","e-mail","mail address","electronic mail","username","user name","địa chỉ email","tên đăng nhập"];function J(t=document){const e=[],r=new Set;for(const s of C)t.querySelectorAll(s).forEach(a=>{r.has(a)||Q(a)&&(r.add(a),e.push(ee(a)))});return t===document&&document.querySelectorAll("input").forEach(n=>{r.has(n)||Q(n)&&ge(n)&&(r.add(n),e.push(ee(n)))}),e}function Q(t){var r;if(!me(t)||t.disabled||t.readOnly)return!1;const e=(r=t.getAttribute("type"))==null?void 0:r.toLowerCase();return!(e&&["hidden","search","submit","password","checkbox","radio","file"].includes(e))}function ee(t){return{element:t,id:t.id||t.name||`ephemera-${Math.random().toString(36).substring(2,9)}`,rect:t.getBoundingClientRect()}}function ge(t){var a,c;const e=t.labels;if(e&&e.length>0){for(let m=0;m<e.length;m++)if(M(e[m].textContent))return!0}if(M(t.getAttribute("aria-label"))||M(t.getAttribute("aria-description")))return!0;const r=t.getAttribute("aria-labelledby");if(r){const m=document.getElementById(r);if(m&&M(m.textContent))return!0}if(M(t.getAttribute("placeholder")))return!0;const s=(a=t.previousSibling)==null?void 0:a.textContent;if(M(s??null))return!0;const n=(c=t.parentElement)==null?void 0:c.textContent;return!!(n&&n.length<50&&M(n))}function M(t){if(!t)return!1;const e=t.toLowerCase().replace(/[^a-z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g," ");return L.some(r=>{const s=new RegExp(`\\b${r}\\b`,"i");return e.includes(r)||s.test(e)})}function me(t){const e=getComputedStyle(t);if(e.display==="none"||e.visibility==="hidden"||parseFloat(e.opacity)===0)return!1;const r=t.getBoundingClientRect();return!(r.width===0||r.height===0)}function de(t){const e=new MutationObserver(r=>{let s=[];for(const n of r)n.type==="childList"&&n.addedNodes.forEach(a=>{a.nodeType===Node.ELEMENT_NODE&&s.push(a)});if(s.length>0){const n=[];s.forEach(a=>{const c=J(a);n.push(...c)}),n.length>0&&t(n)}});return e.observe(document.body,{childList:!0,subtree:!0}),()=>e.disconnect()}const te={WEB_URL:"https://app.manhquy.click"};var ue=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function pe(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var re={exports:{}};(function(t,e){(function(r,s){s(t)})(typeof globalThis<"u"?globalThis:typeof self<"u"?self:ue,function(r){if(!(globalThis.chrome&&globalThis.chrome.runtime&&globalThis.chrome.runtime.id))throw new Error("This script should only be loaded in a browser extension.");if(globalThis.browser&&globalThis.browser.runtime&&globalThis.browser.runtime.id)r.exports=globalThis.browser;else{const s="The message port closed before a response was received.",n=a=>{const c={alarms:{clear:{minArgs:0,maxArgs:1},clearAll:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getAll:{minArgs:0,maxArgs:0}},bookmarks:{create:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},getChildren:{minArgs:1,maxArgs:1},getRecent:{minArgs:1,maxArgs:1},getSubTree:{minArgs:1,maxArgs:1},getTree:{minArgs:0,maxArgs:0},move:{minArgs:2,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeTree:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}},browserAction:{disable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},enable:{minArgs:0,maxArgs:1,fallbackToNoCallback:!0},getBadgeBackgroundColor:{minArgs:1,maxArgs:1},getBadgeText:{minArgs:1,maxArgs:1},getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},openPopup:{minArgs:0,maxArgs:0},setBadgeBackgroundColor:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setBadgeText:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},browsingData:{remove:{minArgs:2,maxArgs:2},removeCache:{minArgs:1,maxArgs:1},removeCookies:{minArgs:1,maxArgs:1},removeDownloads:{minArgs:1,maxArgs:1},removeFormData:{minArgs:1,maxArgs:1},removeHistory:{minArgs:1,maxArgs:1},removeLocalStorage:{minArgs:1,maxArgs:1},removePasswords:{minArgs:1,maxArgs:1},removePluginData:{minArgs:1,maxArgs:1},settings:{minArgs:0,maxArgs:0}},commands:{getAll:{minArgs:0,maxArgs:0}},contextMenus:{remove:{minArgs:1,maxArgs:1},removeAll:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},cookies:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:1,maxArgs:1},getAllCookieStores:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},devtools:{inspectedWindow:{eval:{minArgs:1,maxArgs:2,singleCallbackArg:!1}},panels:{create:{minArgs:3,maxArgs:3,singleCallbackArg:!0},elements:{createSidebarPane:{minArgs:1,maxArgs:1}}}},downloads:{cancel:{minArgs:1,maxArgs:1},download:{minArgs:1,maxArgs:1},erase:{minArgs:1,maxArgs:1},getFileIcon:{minArgs:1,maxArgs:2},open:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},pause:{minArgs:1,maxArgs:1},removeFile:{minArgs:1,maxArgs:1},resume:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},extension:{isAllowedFileSchemeAccess:{minArgs:0,maxArgs:0},isAllowedIncognitoAccess:{minArgs:0,maxArgs:0}},history:{addUrl:{minArgs:1,maxArgs:1},deleteAll:{minArgs:0,maxArgs:0},deleteRange:{minArgs:1,maxArgs:1},deleteUrl:{minArgs:1,maxArgs:1},getVisits:{minArgs:1,maxArgs:1},search:{minArgs:1,maxArgs:1}},i18n:{detectLanguage:{minArgs:1,maxArgs:1},getAcceptLanguages:{minArgs:0,maxArgs:0}},identity:{launchWebAuthFlow:{minArgs:1,maxArgs:1}},idle:{queryState:{minArgs:1,maxArgs:1}},management:{get:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},getSelf:{minArgs:0,maxArgs:0},setEnabled:{minArgs:2,maxArgs:2},uninstallSelf:{minArgs:0,maxArgs:1}},notifications:{clear:{minArgs:1,maxArgs:1},create:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:0},getPermissionLevel:{minArgs:0,maxArgs:0},update:{minArgs:2,maxArgs:2}},pageAction:{getPopup:{minArgs:1,maxArgs:1},getTitle:{minArgs:1,maxArgs:1},hide:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setIcon:{minArgs:1,maxArgs:1},setPopup:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},setTitle:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0},show:{minArgs:1,maxArgs:1,fallbackToNoCallback:!0}},permissions:{contains:{minArgs:1,maxArgs:1},getAll:{minArgs:0,maxArgs:0},remove:{minArgs:1,maxArgs:1},request:{minArgs:1,maxArgs:1}},runtime:{getBackgroundPage:{minArgs:0,maxArgs:0},getPlatformInfo:{minArgs:0,maxArgs:0},openOptionsPage:{minArgs:0,maxArgs:0},requestUpdateCheck:{minArgs:0,maxArgs:0},sendMessage:{minArgs:1,maxArgs:3},sendNativeMessage:{minArgs:2,maxArgs:2},setUninstallURL:{minArgs:1,maxArgs:1}},sessions:{getDevices:{minArgs:0,maxArgs:1},getRecentlyClosed:{minArgs:0,maxArgs:1},restore:{minArgs:0,maxArgs:1}},storage:{local:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}},managed:{get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1}},sync:{clear:{minArgs:0,maxArgs:0},get:{minArgs:0,maxArgs:1},getBytesInUse:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}}},tabs:{captureVisibleTab:{minArgs:0,maxArgs:2},create:{minArgs:1,maxArgs:1},detectLanguage:{minArgs:0,maxArgs:1},discard:{minArgs:0,maxArgs:1},duplicate:{minArgs:1,maxArgs:1},executeScript:{minArgs:1,maxArgs:2},get:{minArgs:1,maxArgs:1},getCurrent:{minArgs:0,maxArgs:0},getZoom:{minArgs:0,maxArgs:1},getZoomSettings:{minArgs:0,maxArgs:1},goBack:{minArgs:0,maxArgs:1},goForward:{minArgs:0,maxArgs:1},highlight:{minArgs:1,maxArgs:1},insertCSS:{minArgs:1,maxArgs:2},move:{minArgs:2,maxArgs:2},query:{minArgs:1,maxArgs:1},reload:{minArgs:0,maxArgs:2},remove:{minArgs:1,maxArgs:1},removeCSS:{minArgs:1,maxArgs:2},sendMessage:{minArgs:2,maxArgs:3},setZoom:{minArgs:1,maxArgs:2},setZoomSettings:{minArgs:1,maxArgs:2},update:{minArgs:1,maxArgs:2}},topSites:{get:{minArgs:0,maxArgs:0}},webNavigation:{getAllFrames:{minArgs:1,maxArgs:1},getFrame:{minArgs:1,maxArgs:1}},webRequest:{handlerBehaviorChanged:{minArgs:0,maxArgs:0}},windows:{create:{minArgs:0,maxArgs:1},get:{minArgs:1,maxArgs:2},getAll:{minArgs:0,maxArgs:1},getCurrent:{minArgs:0,maxArgs:1},getLastFocused:{minArgs:0,maxArgs:1},remove:{minArgs:1,maxArgs:1},update:{minArgs:2,maxArgs:2}}};if(Object.keys(c).length===0)throw new Error("api-metadata.json has not been included in browser-polyfill");class m extends WeakMap{constructor(o,g=void 0){super(g),this.createItem=o}get(o){return this.has(o)||this.set(o,this.createItem(o)),super.get(o)}}const N=i=>i&&typeof i=="object"&&typeof i.then=="function",S=(i,o)=>(...g)=>{a.runtime.lastError?i.reject(new Error(a.runtime.lastError.message)):o.singleCallbackArg||g.length<=1&&o.singleCallbackArg!==!1?i.resolve(g[0]):i.resolve(g)},h=i=>i==1?"argument":"arguments",f=(i,o)=>function(d,...p){if(p.length<o.minArgs)throw new Error(`Expected at least ${o.minArgs} ${h(o.minArgs)} for ${i}(), got ${p.length}`);if(p.length>o.maxArgs)throw new Error(`Expected at most ${o.maxArgs} ${h(o.maxArgs)} for ${i}(), got ${p.length}`);return new Promise((A,b)=>{if(o.fallbackToNoCallback)try{d[i](...p,S({resolve:A,reject:b},o))}catch(l){console.warn(`${i} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `,l),d[i](...p),o.fallbackToNoCallback=!1,o.noCallback=!0,A()}else o.noCallback?(d[i](...p),A()):d[i](...p,S({resolve:A,reject:b},o))})},v=(i,o,g)=>new Proxy(o,{apply(d,p,A){return g.call(p,i,...A)}});let x=Function.call.bind(Object.prototype.hasOwnProperty);const E=(i,o={},g={})=>{let d=Object.create(null),p={has(b,l){return l in i||l in d},get(b,l,w){if(l in d)return d[l];if(!(l in i))return;let u=i[l];if(typeof u=="function")if(typeof o[l]=="function")u=v(i,i[l],o[l]);else if(x(g,l)){let P=f(l,g[l]);u=v(i,i[l],P)}else u=u.bind(i);else if(typeof u=="object"&&u!==null&&(x(o,l)||x(g,l)))u=E(u,o[l],g[l]);else if(x(g,"*"))u=E(u,o[l],g["*"]);else return Object.defineProperty(d,l,{configurable:!0,enumerable:!0,get(){return i[l]},set(P){i[l]=P}}),u;return d[l]=u,u},set(b,l,w,u){return l in d?d[l]=w:i[l]=w,!0},defineProperty(b,l,w){return Reflect.defineProperty(d,l,w)},deleteProperty(b,l){return Reflect.deleteProperty(d,l)}},A=Object.create(i);return new Proxy(A,p)},F=i=>({addListener(o,g,...d){o.addListener(i.get(g),...d)},hasListener(o,g){return o.hasListener(i.get(g))},removeListener(o,g){o.removeListener(i.get(g))}}),G=new m(i=>typeof i!="function"?i:function(g){const d=E(g,{},{getContent:{minArgs:0,maxArgs:0}});i(d)}),le=new m(i=>typeof i!="function"?i:function(g,d,p){let A=!1,b,l=new Promise(O=>{b=function(k){A=!0,O(k)}}),w;try{w=i(g,d,b)}catch(O){w=Promise.reject(O)}const u=w!==!0&&N(w);if(w!==!0&&!u&&!A)return!1;const P=O=>{O.then(k=>{p(k)},k=>{let Z;k&&(k instanceof Error||typeof k.message=="string")?Z=k.message:Z="An unexpected error occurred",p({__mozWebExtensionPolyfillReject__:!0,message:Z})}).catch(k=>{console.error("Failed to send onMessage rejected reply",k)})};return P(u?w:l),!0}),Ne=({reject:i,resolve:o},g)=>{a.runtime.lastError?a.runtime.lastError.message===s?o():i(new Error(a.runtime.lastError.message)):g&&g.__mozWebExtensionPolyfillReject__?i(new Error(g.message)):o(g)},ce=(i,o,g,...d)=>{if(d.length<o.minArgs)throw new Error(`Expected at least ${o.minArgs} ${h(o.minArgs)} for ${i}(), got ${d.length}`);if(d.length>o.maxArgs)throw new Error(`Expected at most ${o.maxArgs} ${h(o.maxArgs)} for ${i}(), got ${d.length}`);return new Promise((p,A)=>{const b=Ne.bind(null,{resolve:p,reject:A});d.push(b),g.sendMessage(...d)})},_e={devtools:{network:{onRequestFinished:F(G)}},runtime:{onMessage:F(le),onMessageExternal:F(le),sendMessage:ce.bind(null,"sendMessage",{minArgs:1,maxArgs:3})},tabs:{sendMessage:ce.bind(null,"sendMessage",{minArgs:2,maxArgs:3})}},X={clear:{minArgs:1,maxArgs:1},get:{minArgs:1,maxArgs:1},set:{minArgs:1,maxArgs:1}};return c.privacy={network:{"*":X},services:{"*":X},websites:{"*":X}},E(a,_e,c)};r.exports=n(chrome)}})})(re);var he=re.exports;const T=pe(he),B=24,se=new WeakSet;let R="light";T.storage.local.get("settings").then(t=>{const e=t.settings,r=(e==null?void 0:e.theme)||"system";z(r)}),T.storage.onChanged.addListener((t,e)=>{if(e==="local"&&t.settings){const r=t.settings.newValue;r&&z(r.theme)}});const W=window.matchMedia("(prefers-color-scheme: dark)"),ne=()=>{T.storage.local.get("settings").then(t=>{const e=t.settings;(e==null?void 0:e.theme)==="system"&&z("system")})};W.addEventListener?W.addEventListener("change",ne):W.addListener(ne);function z(t){if(t==="system"?R=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":R=t,y){const e=y.shadowRoot;if(e){const r=e.querySelector(".wrapper");r&&(R==="dark"?r.classList.add("dark"):r.classList.remove("dark"))}}}function ie(t){(window.requestIdleCallback||(r=>setTimeout(r,1)))(()=>{t.forEach(r=>{if(se.has(r.element))return;se.add(r.element);const s=Ae(r.element);fe(s,r.element),s.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),oe(r.element,s)})})})}T.runtime.onMessage.addListener(t=>{if(t.type==="INBOXES_UPDATED"&&y&&K){const e=document.querySelector(".ephemera-icon-container");e&&oe(K,e)}});function Ae(t){const e=document.createElement("div");e.className="ephemera-icon-container",e.style.cssText=`
    position: absolute;
    z-index: 2147483647;
    cursor: pointer;
    width: ${B}px;
    height: ${B}px;
    display: none; /* Hidden until positioned */
  `;const r=e.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=`
    :host {
      all: initial;
    }
    .icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0ea5e9;
      border-radius: 6px;
      opacity: 0.9;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
    }
    .icon:hover {
      opacity: 1;
      transform: scale(1.05);
      background: #0284c7;
      box-shadow: 0 4px 6px rgba(14, 165, 233, 0.4);
    }
    .icon svg {
      width: 14px;
      height: 14px;
      stroke: white;
      fill: none;
    }
  `;const n=document.createElement("div");return n.className="icon",n.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>`,r.appendChild(s),r.appendChild(n),document.body.appendChild(e),e}function fe(t,e){const r=()=>{if(!document.body.contains(e)){t.remove();return}const a=e.getBoundingClientRect(),c=window.getComputedStyle(e);if(a.width===0||a.height===0||c.display==="none"||c.visibility==="hidden"){t.style.display="none";return}else t.style.display="block";const m=window.scrollX,N=window.scrollY,S=parseFloat(c.paddingRight)||0,h=parseFloat(c.borderRightWidth)||0;t.style.top=`${a.top+N+(a.height-B)/2}px`,t.style.left=`${a.right+m-B-S-h-4}px`};r(),window.addEventListener("scroll",r,{passive:!0}),window.addEventListener("resize",r,{passive:!0}),new ResizeObserver(r).observe(e),new IntersectionObserver(r).observe(e)}let y=null,K=null;function oe(t,e){y&&(y.remove(),y=null),K=t,T.runtime.sendMessage({type:"TRACK_EVENT",event:"settings_updated",metadata:{setting:"content_script_dropdown_open"}}),T.storage.local.get(["inboxes","auth"]).then(r=>{const s=r.auth;let n;if(!s||!s.isAuthenticated)n=we();else{const a=r.inboxes||[];n=ye(a,t)}document.body.appendChild(n),y=n,xe(n,e),be(n,e)})}function xe(t,e){const r=e.getBoundingClientRect(),s=260,n=window.scrollX,a=window.scrollY;let c=r.right+n-s,m=r.bottom+a+8;c<10&&(c=10),c+s>window.innerWidth+n-10&&(c=window.innerWidth+n-s-10),t.style.top=`${m}px`,t.style.left=`${c}px`}function be(t,e){const r=s=>{const n=s.target;!t.contains(n)&&!e.contains(n)&&(t.remove(),y=null,K=null,document.removeEventListener("mousedown",r))};setTimeout(()=>document.addEventListener("mousedown",r),0)}function we(){var n;const t=document.createElement("div");t.className="ephemera-dropdown-root",t.style.cssText=`
    position: absolute;
    z-index: 2147483647;
    width: 260px;
    pointer-events: auto;
  `;const e=t.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=`
    :host {
      all: initial;
    }
    .wrapper {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 24px;
      text-align: center;
      animation: ephemera-slide-up 0.2s ease-out;
      transition: all 0.3s ease;
    }
    .wrapper.dark {
      background: #0f172a;
      border-color: #1e293b;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
    }
    @keyframes ephemera-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .title { font-weight: 700; color: #0f172a; margin-bottom: 8px; font-size: 16px; transition: color 0.3s; }
    .wrapper.dark .title { color: #f1f5f9; }
    .desc { color: #64748b; font-size: 14px; margin-bottom: 20px; line-height: 1.5; transition: color 0.3s; }
    .wrapper.dark .desc { color: #94a3b8; }
    .btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: #0ea5e9;
      color: white;
      border-radius: 10px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.2);
    }
    .btn:hover {
      background: #0284c7;
      transform: translateY(-1px);
      box-shadow: 0 6px 8px -1px rgba(14, 165, 233, 0.3);
    }
  `;const s=document.createElement("div");return s.className=`wrapper ${R==="dark"?"dark":""}`,s.innerHTML=`
    <div class="title">Sign in Required</div>
    <div class="desc">Please sign in to your Ephemera account to use temporary emails.</div>
    <button class="btn">Sign In / Sign Up</button>
  `,(n=s.querySelector(".btn"))==null||n.addEventListener("click",()=>{window.open(`${te.WEB_URL}/login`,"_blank")}),e.appendChild(r),e.appendChild(s),t}function ye(t,e){const r=document.createElement("div");r.className="ephemera-dropdown-root",r.style.cssText=`
    position: absolute;
    z-index: 2147483647;
    width: 260px;
  `;const s=r.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=`
    :host {
      all: initial;
    }
    .wrapper {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: ephemera-slide-up 0.2s ease-out;
      overflow: hidden;
      max-height: 380px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
    }
    .wrapper.dark {
      background: #0f172a;
      border-color: #1e293b;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
    }
    @keyframes ephemera-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .list { padding: 8px; overflow-y: auto; }
    .item {
      padding: 10px 14px;
      color: #334155;
      font-size: 14px;
      cursor: pointer;
      border-radius: 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wrapper.dark .item { color: #cbd5e1; }
    .item:hover {
      background: #f1f5f9;
      color: #0ea5e9;
    }
    .wrapper.dark .item:hover {
      background: #1e293b;
      color: #38bdf8;
    }
    .item-icon { flex-shrink: 0; color: #94a3b8; }
    .item:hover .item-icon { color: #0ea5e9; }
    .wrapper.dark .item:hover .item-icon { color: #38bdf8; }
    .create {
      margin-top: 6px;
      color: #0ea5e9;
      font-weight: 600;
      background: #f0f9ff;
      border: 1.5px dashed #bae6fd;
    }
    .wrapper.dark .create {
      background: #0c4a6e;
      border-color: #075985;
      color: #38bdf8;
    }
    .create:hover {
      background: #e0f2fe;
      border-style: solid;
    }
    .wrapper.dark .create:hover {
      background: #075985;
    }
    .header {
      padding: 12px 14px 6px;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      transition: color 0.3s;
    }
    .wrapper.dark .header { color: #64748b; }
    .no-data { padding: 24px; text-align: center; color: #94a3b8; font-size: 14px; }
    .footer {
      margin-top: auto;
      padding: 8px;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      transition: all 0.3s ease;
    }
    .wrapper.dark .footer {
      border-top-color: #1e293b;
      background: #1e293b;
    }
    .link-item { color: #64748b; font-weight: 500; }
    .wrapper.dark .link-item { color: #94a3b8; }
  `;const a=document.createElement("div");a.className=`wrapper ${R==="dark"?"dark":""}`;const c=document.createElement("div");if(c.className="list",t.length>0){const h=document.createElement("div");h.className="header",h.textContent="Active Inboxes",c.appendChild(h),t.slice(0,8).forEach(f=>{const v=f.address||`${f.localPart}@${typeof f.domain=="string"?f.domain:f.domain.name}`,x=document.createElement("div");x.className="item",x.innerHTML=`
        <svg class="item-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H17.5C20 5 22 7 22 9.5Z"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        <span>${v}</span>
      `,x.addEventListener("click",()=>ae(e,v)),c.appendChild(x)})}else{const h=document.createElement("div");h.className="no-data",h.textContent="No active inboxes",c.appendChild(h)}const m=document.createElement("div");m.className="item create",m.innerHTML=`
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    <span>Generate New Email</span>
  `,m.addEventListener("click",h=>{h.stopPropagation();const f=m.querySelector("span");f&&(f.textContent="Generating..."),m.style.opacity="0.7",m.style.pointerEvents="none",T.runtime.sendMessage({type:"CREATE_INBOX"}).then(v=>{var x;if(v&&v.success&&v.inbox){const E=v.inbox,F=typeof E.domain=="string"?E.domain:((x=E.domain)==null?void 0:x.name)||"domain",G=E.address||`${E.localPart}@${F}`;ae(e,G)}else f&&(f.textContent="Error: Check login"),m.style.color="#ef4444",m.style.background="#fef2f2",m.style.pointerEvents="auto",m.style.opacity="1"})}),c.appendChild(m);const N=document.createElement("div");N.className="footer";const S=document.createElement("div");return S.className="item link-item",S.innerHTML=`
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
    <span>Open Dashboard</span>
  `,S.addEventListener("click",()=>{window.open(`${te.WEB_URL}/dashboard`,"_blank")}),N.appendChild(S),a.appendChild(c),a.appendChild(N),s.appendChild(n),s.appendChild(a),r}function ae(t,e){y&&(y.remove(),y=null),t.value=e,t.focus(),t.dispatchEvent(new Event("input",{bubbles:!0})),t.dispatchEvent(new Event("change",{bubbles:!0})),t.dispatchEvent(new KeyboardEvent("keydown",{bubbles:!0})),t.dispatchEvent(new KeyboardEvent("keyup",{bubbles:!0}))}const ve={matches:["<all_urls>"],runAt:"document_end",main(){console.log("Ephemera: Content script loaded");const t=J();t.length>0&&(console.log(`Ephemera: Found ${t.length} email fields`),ie(t)),de(e=>{e.length>0&&(console.log(`Ephemera: Found ${e.length} new email fields`),ie(e))})}},j=T;function q(t,...e){}const Ee={debug:(...t)=>q(console.debug,...t),log:(...t)=>q(console.log,...t),warn:(...t)=>q(console.warn,...t),error:(...t)=>q(console.error,...t)},U=class U extends Event{constructor(e,r){super(U.EVENT_NAME,{}),this.newUrl=e,this.oldUrl=r}};_(U,"EVENT_NAME",V("wxt:locationchange"));let H=U;function V(t){var e;return`${(e=j==null?void 0:j.runtime)==null?void 0:e.id}:content:${t}`}function ke(t){let e,r;return{run(){e==null&&(r=new URL(location.href),e=t.setInterval(()=>{let s=new URL(location.href);s.href!==r.href&&(window.dispatchEvent(new H(s,r)),r=s)},1e3))}}}const $=class ${constructor(e,r){_(this,"isTopFrame",window.self===window.top);_(this,"abortController");_(this,"locationWatcher",ke(this));_(this,"receivedMessageIds",new Set);this.contentScriptName=e,this.options=r,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(e){return this.abortController.abort(e)}get isInvalid(){return j.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(e){return this.signal.addEventListener("abort",e),()=>this.signal.removeEventListener("abort",e)}block(){return new Promise(()=>{})}setInterval(e,r){const s=setInterval(()=>{this.isValid&&e()},r);return this.onInvalidated(()=>clearInterval(s)),s}setTimeout(e,r){const s=setTimeout(()=>{this.isValid&&e()},r);return this.onInvalidated(()=>clearTimeout(s)),s}requestAnimationFrame(e){const r=requestAnimationFrame((...s)=>{this.isValid&&e(...s)});return this.onInvalidated(()=>cancelAnimationFrame(r)),r}requestIdleCallback(e,r){const s=requestIdleCallback((...n)=>{this.signal.aborted||e(...n)},r);return this.onInvalidated(()=>cancelIdleCallback(s)),s}addEventListener(e,r,s,n){var a;r==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),(a=e.addEventListener)==null||a.call(e,r.startsWith("wxt:")?V(r):r,s,{...n,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),Ee.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:$.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(e){var a,c,m;const r=((a=e.data)==null?void 0:a.type)===$.SCRIPT_STARTED_MESSAGE_TYPE,s=((c=e.data)==null?void 0:c.contentScriptName)===this.contentScriptName,n=!this.receivedMessageIds.has((m=e.data)==null?void 0:m.messageId);return r&&s&&n}listenForNewerScripts(e){let r=!0;const s=n=>{if(this.verifyScriptStartedEvent(n)){this.receivedMessageIds.add(n.data.messageId);const a=r;if(r=!1,a&&(e!=null&&e.ignoreFirstEvent))return;this.notifyInvalidated()}};addEventListener("message",s),this.onInvalidated(()=>removeEventListener("message",s))}};_($,"SCRIPT_STARTED_MESSAGE_TYPE",V("wxt:content-script-started"));let Y=$;const Ce=Symbol("null");let Se=0;class Te extends Map{constructor(){super(),this._objectHashes=new WeakMap,this._symbolHashes=new Map,this._publicKeys=new Map;const[e]=arguments;if(e!=null){if(typeof e[Symbol.iterator]!="function")throw new TypeError(typeof e+" is not iterable (cannot read property Symbol(Symbol.iterator))");for(const[r,s]of e)this.set(r,s)}}_getPublicKeys(e,r=!1){if(!Array.isArray(e))throw new TypeError("The keys parameter must be an array");const s=this._getPrivateKey(e,r);let n;return s&&this._publicKeys.has(s)?n=this._publicKeys.get(s):r&&(n=[...e],this._publicKeys.set(s,n)),{privateKey:s,publicKey:n}}_getPrivateKey(e,r=!1){const s=[];for(let n of e){n===null&&(n=Ce);const a=typeof n=="object"||typeof n=="function"?"_objectHashes":typeof n=="symbol"?"_symbolHashes":!1;if(!a)s.push(n);else if(this[a].has(n))s.push(this[a].get(n));else if(r){const c=`@@mkm-ref-${Se++}@@`;this[a].set(n,c),s.push(c)}else return!1}return JSON.stringify(s)}set(e,r){const{publicKey:s}=this._getPublicKeys(e,!0);return super.set(s,r)}get(e){const{publicKey:r}=this._getPublicKeys(e);return super.get(r)}has(e){const{publicKey:r}=this._getPublicKeys(e);return super.has(r)}delete(e){const{publicKey:r,privateKey:s}=this._getPublicKeys(e);return!!(r&&super.delete(r)&&this._publicKeys.delete(s))}clear(){super.clear(),this._symbolHashes.clear(),this._publicKeys.clear()}get[Symbol.toStringTag](){return"ManyKeysMap"}get size(){return super.size}}new Te;function Pe(){}function D(t,...e){}const Me={debug:(...t)=>D(console.debug,...t),log:(...t)=>D(console.log,...t),warn:(...t)=>D(console.warn,...t),error:(...t)=>D(console.error,...t)};return(async()=>{try{const{main:t,...e}=ve,r=new Y("content",e);return await t(r)}catch(t){throw Me.error('The content script "content" crashed on startup!',t),t}})()}();
content;
