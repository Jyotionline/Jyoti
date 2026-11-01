import { firebaseConfig, firebaseReady } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n||0));
const demoProducts = [
 {id:"sample-1",name:"Everyday Essential Pack",category:"Essentials",price:249,mrp:399,stock:20,imageURL:"",images:[],caption:"A little upgrade to your everyday.",description:"A sample listing for layout preview. Replace with your real product from the Admin Panel.",active:true},
 {id:"sample-2",name:"Home Comfort Set",category:"Home",price:349,mrp:499,stock:12,imageURL:"",images:[],caption:"Made for your happy place.",description:"A sample listing for layout preview. Replace with your real product from the Admin Panel.",active:true},
 {id:"sample-3",name:"Daily Favourite",category:"Lifestyle",price:199,mrp:299,stock:8,imageURL:"",images:[],caption:"Your next little favourite.",description:"A sample listing for layout preview. Replace with your real product from the Admin Panel.",active:true},
 {id:"sample-4",name:"Joyful Starter Bundle",category:"Bundles",price:499,mrp:699,stock:6,imageURL:"",images:[],caption:"More joy in one bundle.",description:"A sample listing for layout preview. Replace with your real product from the Admin Panel.",active:true}
];
let app, auth, db, currentUser=null, products=demoProducts;
if(firebaseReady){app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,u=>{currentUser=u;});}
const getCart=()=>{try{return JSON.parse(localStorage.getItem("jyotiCart")||"[]")}catch{return[]}};
const saveCart=c=>{localStorage.setItem("jyotiCart",JSON.stringify(c));updateCartCount()};
function updateCartCount(){document.querySelectorAll("#cart-count").forEach(el=>el.textContent=getCart().reduce((s,i)=>s+i.qty,0))}
function discount(p){return p.mrp>p.price?Math.round((p.mrp-p.price)/p.mrp*100):0}
function img(p){return p.imageURL?`<img src="${esc(p.imageURL)}" alt="${esc(p.name)}" loading="lazy">`:`<div class="product-placeholder"><span>J</span><small>JYOTI</small></div>`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function loadProducts(){if(!firebaseReady)return;try{const snap=await getDocs(collection(db,"products"));const live=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.active!==false);if(live.length)products=live;}catch(e){console.warn("Product load:",e.message)}}
function productCard(p){return `<article class="product-card"><a class="product-image" href="product.html?id=${encodeURIComponent(p.id)}">${img(p)}${discount(p)?`<span class="discount">${discount(p)}% OFF</span>`:""}</a><div class="product-info"><span class="category">${esc(p.category||"Jyoti picks")}</span><a class="product-title" href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a><p class="caption">${esc(p.caption||"A lovely everyday pick.")}</p><div class="price-row"><strong>${money(p.price)}</strong>${p.mrp>p.price?`<del>${money(p.mrp)}</del>`:""}</div><button class="button add-button" data-add="${esc(p.id)}" ${Number(p.stock)<=0?"disabled":""}>${Number(p.stock)<=0?"Out of stock":"＋ Add to cart"}</button></div></article>`}
function renderHome(){const grid=$("product-grid");if(grid)grid.innerHTML=products.map(productCard).join("");}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p){alert("Product not found. Please refresh.");return}if(Number(p.stock)<=0){alert("This item is out of stock.");return}const cart=getCart(),old=cart.find(x=>x.id===id);if(old)old.qty++;else cart.push({id:p.id,name:p.name,price:Number(p.price),mrp:Number(p.mrp),qty:1,imageURL:p.imageURL||""});saveCart(cart);alert("Added to cart!")}
function renderCart(){const root=$("cart-content");if(!root)return;const cart=getCart();if(!cart.length){root.innerHTML='<div class="panel empty-state"><div class="empty-icon">🛍️</div><h2>Your cart is waiting</h2><p class="muted">Add something lovely to get started.</p><a class="button" href="index.html">Explore products</a></div>';return}const total=cart.reduce((s,i)=>s+i.price*i.qty,0);root.innerHTML=`<div class="cart-layout"><div class="cart-items">${cart.map(i=>`<div class="cart-item"><div class="mini-product">${i.imageURL?`<img src="${esc(i.imageURL)}" alt="">`:"J"}</div><div class="cart-item-info"><b>${esc(i.name)}</b><span>${money(i.price)} each</span><div class="quantity"><button data-qty="${esc(i.id)}" data-delta="-1">−</button><span>${i.qty}</span><button data-qty="${esc(i.id)}" data-delta="1">＋</button><button class="remove" data-remove="${esc(i.id)}">Remove</button></div></div><b>${money(i.price*i.qty)}</b></div>`).join("")}</div><aside class="panel summary"><h2>Order summary</h2><div class="summary-line"><span>Subtotal</span><b>${money(total)}</b></div><div class="summary-line"><span>Delivery</span><span>Shown at checkout</span></div><div class="summary-line total"><span>Total</span><b>${money(total)}</b></div>${total<199?`<p class="error">Add ${money(199-total)} more to reach the ₹199 minimum.</p>`:""}<a class="button full-button ${total<199?"disabled":""}" ${total<199?'aria-disabled="true"':`href="checkout.html"`}>Proceed to checkout</a></aside></div>`}
function renderDetail(){const root=$("product-detail");if(!root)return;const id=new URLSearchParams(location.search).get("id");const p=products.find(x=>x.id===id)||products[0];if(!p){root.innerHTML="<p>Product not found.</p>";return}const imgs=[p.imageURL,...(p.images||[])].filter(Boolean);root.innerHTML=`<div class="detail-gallery"><div class="detail-main-image">${imgs[0]?`<img src="${esc(imgs[0])}" alt="${esc(p.name)}">`:img(p)}</div><div class="detail-thumbs">${(imgs.length?imgs.slice(0,4):["","",""]).map((u,i)=>`<button class="thumb" data-image="${esc(u)}">${u?`<img src="${esc(u)}" alt="Product image ${i+1}">`:`<span>J</span>`}</button>`).join("")}</div></div><div class="detail-copy"><span class="eyebrow">${esc(p.category||"JYOTI STORE")}</span><h1>${esc(p.name)}</h1><p class="detail-caption">${esc(p.caption||"A lovely everyday pick.")}</p><div class="detail-price"><strong>${money(p.price)}</strong>${p.mrp>p.price?`<del>${money(p.mrp)}</del><span class="discount-inline">${discount(p)}% OFF</span>`:""}</div><p class="stock ${Number(p.stock)>0?"in-stock":"out-stock"}">${Number(p.stock)>0?"✓ In stock":"Out of stock"}</p><p>${esc(p.description||"Product details will be updated soon.")}</p><div class="detail-actions"><button class="button" data-add="${esc(p.id)}" ${Number(p.stock)<=0?"disabled":""}>Add to cart</button><button class="button secondary" id="buy-now" ${Number(p.stock)<=0?"disabled":""}>Buy now</button></div><div class="product-perks"><p>🔒 Secure payment through Razorpay</p><p>📦 Order updates in Your Orders</p></div></div>`;root.querySelectorAll("[data-image]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.image){root.querySelector(".detail-main-image").innerHTML=`<img src="${esc(b.dataset.image)}" alt="${esc(p.name)}">`}}));$("buy-now")?.addEventListener("click",()=>{addToCart(p.id);location.href="cart.html"});loadReviews(p.id)}
async function loadReviews(id){const root=$("review-list");if(!root||!firebaseReady)return;try{const snap=await getDocs(query(collection(db,"reviews"),where("productId","==",id),where("approved","==",true)));root.innerHTML=snap.empty?'<p class="muted">No reviews yet.</p>':snap.docs.map(d=>{const r=d.data();return `<article class="review"><b>${"★".repeat(Number(r.rating||5))}${"☆".repeat(5-Number(r.rating||5))}</b><p>${esc(r.text)}</p><small>Verified purchase</small></article>`}).join("")}catch(e){console.warn(e)}}
function renderOrders(){const root=$("orders-content");if(root&&firebaseReady&&currentUser)root.innerHTML="<p>Loading your orders… (secure customer-scoped query will be enabled after account setup)</p>"}

const ADMIN_UID = "VQxC0zV54zU1InPLWeM2PgSeeq43";

async function initAdmin(){
  const login = $("admin-login");
  const dash = $("admin-dashboard");

  if (!login || !dash) return;

  if (!firebaseReady) {
    $("admin-message").textContent = "Firebase connection is not ready.";
    return;
  }

  onAuthStateChanged(auth, async user => {
    currentUser = user;

    if (!user) {
      login.classList.remove("hidden");
      dash.classList.add("hidden");
      return;
    }

    if (user.uid !== ADMIN_UID) {
      await signOut(auth);
      login.classList.remove("hidden");
      dash.classList.add("hidden");
      $("admin-message").textContent = "এই অ্যাকাউন্টের Admin permission নেই।";
      return;
    }

    login.classList.add("hidden");
    dash.classList.remove("hidden");

    try {
      await loadAdminProducts();
      await loadAdminBanners();
      await loadAdminOrders();
      await loadAdminReviews();
      await loadSettings();
    } catch (e) {
      $("admin-message").textContent = "Data loading error: " + e.message;
    }
  });
}

async function loadAdminProducts(){const root=$("admin-product-list");if(!root)return;const snap=await getDocs(collection(db,"products"));const ps=snap.docs.map(d=>({id:d.id,...d.data()}));root.innerHTML=ps.length?`<div class="table-wrap"><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Visible</th><th>Actions</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.name)}</td><td>${money(p.price)}</td><td>${p.stock??0}</td><td>${p.active===false?"No":"Yes"}</td><td><button class="small-button" data-edit-product="${p.id}">Edit</button> <button class="small-button danger" data-delete-product="${p.id}">Delete</button></td></tr>`).join("")}</tbody></table></div>`:"<p>No products yet. Add your first product above.</p>";root.querySelectorAll("[data-edit-product]").forEach(b=>b.onclick=()=>editProduct(ps.find(p=>p.id===b.dataset.editProduct)));root.querySelectorAll("[data-delete-product]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this product?")){await deleteDoc(doc(db,"products",b.dataset.deleteProduct));await loadAdminProducts()}})}
function editProduct(p){$("product-id").value=p.id;$("product-name").value=p.name||"";$("product-category").value=p.category||"";$("product-price").value=p.price??"";$("product-mrp").value=p.mrp??"";$("product-stock").value=p.stock??0;$("product-image").value=p.imageURL||"";$("product-images").value=(p.images||[]).join("\n");$("product-caption").value=p.caption||"";$("product-description").value=p.description||"";$("product-active").checked=p.active!==false;window.scrollTo({top:0,behavior:"smooth"})}
async function loadAdminBanners(){const root=$("admin-banner-list");if(!root)return;const snap=await getDocs(collection(db,"banners"));root.innerHTML=snap.empty?"<p>No banners yet.</p>":snap.docs.map(d=>`<div class="admin-list-row"><span>${esc(d.data().title||"Banner")} — ${esc(d.data().imageURL||"")}</span><button class="small-button danger" data-delete-banner="${d.id}">Delete</button></div>`).join("");root.querySelectorAll("[data-delete-banner]").forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,"banners",b.dataset.deleteBanner));await loadAdminBanners()})}
async function loadAdminOrders(){const root=$("admin-order-list");if(!root)return;const snap=await getDocs(collection(db,"orders"));root.innerHTML=snap.empty?"<p>No orders yet.</p>":`<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Update</th></tr></thead><tbody>${snap.docs.map(d=>{const o=d.data();return `<tr><td>${d.id.slice(0,8)}</td><td>${esc(o.address?.name||"Customer")}<br>${esc(o.address?.phone||"")}</td><td>${money(o.total)}</td><td>${esc(o.paymentStatus||"pending")}</td><td>${esc(o.status||"new")}</td><td><select data-order-status="${d.id}"><option>new</option><option>processing</option><option>shipped</option><option>delivered</option><option>cancelled</option></select></td></tr>`}).join("")}</tbody></table></div>`;root.querySelectorAll("[data-order-status]").forEach(s=>s.onchange=async()=>{await updateDoc(doc(db,"orders",s.dataset.orderStatus),{status:s.value,updatedAt:serverTimestamp()})})}
async function loadAdminReviews(){const root=$("admin-review-list");if(!root)return;const snap=await getDocs(collection(db,"reviews"));root.innerHTML=snap.empty?"<p>No reviews yet.</p>":snap.docs.map(d=>`<div class="admin-list-row"><span>${esc(d.data().text||"")} · ${d.data().rating||5}★</span><button class="small-button" data-approve-review="${d.id}">${d.data().approved?"Approved":"Approve"}</button><button class="small-button danger" data-delete-review="${d.id}">Delete</button></div>`).join("");root.querySelectorAll("[data-approve-review]").forEach(b=>b.onclick=async()=>{await updateDoc(doc(db,"reviews",b.dataset.approveReview),{approved:true});await loadAdminReviews()});root.querySelectorAll("[data-delete-review]").forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,"reviews",b.dataset.deleteReview));await loadAdminReviews()})}
async function loadSettings(){if(!$("setting-store-name"))return;const snap=await getDoc(doc(db,"settings","store"));if(snap.exists()){const s=snap.data();$("setting-store-name").value=s.storeName||"Jyoti Store";$("setting-email").value=s.email||"";$("setting-phone").value=s.phone||"";$("setting-about").value=s.about||"";$("setting-contact").value=s.contact||""}else $("setting-store-name").value="Jyoti Store"}

function wireAdmin(){ 
  
      $("admin-login-form")?.addEventListener("submit", async e => {
  e.preventDefault();

  const message = $("admin-message");

  try {
    message.textContent = "Signing in...";

    const email = $("admin-email").value.trim();
    const password = $("admin-password").value;

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    message.textContent =
      "Firebase login successful. Checking admin permission...";

    if (result.user.uid !== ADMIN_UID) {
      await signOut(auth);
      message.textContent =
        "এই অ্যাকাউন্টের Admin permission নেই।";
      return;
    }

    message.textContent = "Login successful. Opening dashboard...";

    $("admin-login").classList.add("hidden");
    $("admin-dashboard").classList.remove("hidden");

  } catch (error) {
    message.textContent = "Login failed: " + error.message;
    console.error("Admin login error:", error);
  }
});
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login Error:", err);
      const msg = $("admin-message");
      if (msg) msg.textContent = "লগইন ব্যর্থ হয়েছে: " + err.message;
      else alert("লগইন ব্যর্থ হয়েছে: " + err.message);
    }
  });
 
  $("admin-logout")?.addEventListener("click", () => signOut(auth));

  document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));
    document.querySelectorAll(".admin-pane").forEach(p=>p.classList.toggle("hidden",p.id!==`pane-${b.dataset.tab}`))
  }));

  $("product-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const id=$("product-id").value;
    const p={
      name:$("product-name").value.trim(),
      category:$("product-category").value.trim(),
      price:Number($("product-price").value),
      mrp:Number($("product-mrp").value),
      stock:Number($("product-stock").value),
      imageURL:$("product-image").value.trim(),
      images:$("product-images").value.split("\n").map(s=>s.trim()).filter(Boolean),
      caption:$("product-caption").value.trim(),
      description:$("product-description").value.trim(),
      active:$("product-active").checked,
      updatedAt:serverTimestamp()
    };
    try {
      if(id) await updateDoc(doc(db,"products",id),p);
      else await addDoc(collection(db,"products"),{...p,createdAt:serverTimestamp()});
      $("product-form").reset();
      $("product-id").value="";
      await loadAdminProducts();
    } catch(err) {
      alert("Could not save product: "+err.message);
    }
  });

  $("product-reset")?.addEventListener("click",()=>$("product-form").reset());

  $("banner-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try {
      await addDoc(collection(db,"banners"),{
        title:$("banner-title").value.trim(),
        imageURL:$("banner-image").value.trim(),
        subtitle:$("banner-subtitle").value.trim(),
        active:true,
        createdAt:serverTimestamp()
      });
      e.target.reset();
      await loadAdminBanners();
    } catch(err) {
      alert(err.message);
    }
  });

  $("settings-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try {
      await setDoc(doc(db,"settings","store"),{
        storeName:$("setting-store-name").value.trim(),
        email:$("setting-email").value.trim(),
        phone:$("setting-phone").value.trim(),
        about:$("setting-about").value,
        contact:$("setting-contact").value,
        updatedAt:serverTimestamp()
      },{merge:true});
      $("settings-message").textContent="Settings saved.";
    } catch(err) {
      $("settings-message").textContent=err.message;
    }
  });
}

function wireCart(){document.addEventListener("click",e=>{const a=e.target.closest("[data-add]");if(a)addToCart(a.dataset.add);const q=e.target.closest("[data-qty]");if(q){const cart=getCart(),it=cart.find(i=>i.id===q.dataset.qty);if(it){it.qty+=Number(q.dataset.delta);if(it.qty<=0)cart.splice(cart.indexOf(it),1);saveCart(cart);renderCart()}}const r=e.target.closest("[data-remove]");if(r){saveCart(getCart().filter(i=>i.id!==r.dataset.remove));renderCart()}})}
function wireCheckout(){const f=$("checkout-form");if(!f)return;f.addEventListener("submit",e=>{e.preventDefault();const total=getCart().reduce((s,i)=>s+i.price*i.qty,0);if(total<199){$("checkout-message").textContent="Minimum cart value is ₹199.";return}if(!firebaseReady){$("checkout-message").textContent="Firebase is not connected yet. Payment is disabled until secure backend setup is complete.";return}$("checkout-message").textContent="Secure payment backend is not deployed yet. Do not take or confirm payment until Razorpay server verification is configured."})}
function wireAccount(){const send=$("send-otp"),verify=$("verify-otp");let confirmation=null;send?.addEventListener("click",async()=>{try{if(!firebaseReady)throw new Error("Firebase config is not set yet.");if(!window.recaptchaVerifier)window.recaptchaVerifier=new RecaptchaVerifier(auth,"recaptcha-container",{});confirmation=await signInWithPhoneNumber(auth,$("login-phone").value,window.recaptchaVerifier);$("auth-message").textContent="OTP sent. Check your phone."}catch(e){$("auth-message").textContent=e.message}});verify?.addEventListener("click",async()=>{try{if(!confirmation)throw new Error("First tap Send OTP.");await confirmation.confirm($("login-otp").value);$("auth-message").textContent="Phone verified successfully."}catch(e){$("auth-message").textContent=e.message}});$("account-form")?.addEventListener("submit",e=>{e.preventDefault();$("account-message").textContent=currentUser?"Address saving will be enabled after the customer profile rules are applied.":"Please verify your phone number first."})}
function wireReview(){ $("review-form")?.addEventListener("submit",e=>{e.preventDefault();alert("Verified-purchase review submission will be enabled by the secure backend.")})}
function wireHero(){const dots=[...document.querySelectorAll(".dot")];if(!dots.length)return;let idx=0;const colors=[["#fff0e6","#ffe0c8"],["#f0eaff","#dcd2ff"],["#e5f8ee","#c8efdc"]];const hero=$("hero");function set(i){idx=i;hero.style.setProperty("--hero-bg",colors[i][0]);hero.style.setProperty("--hero-art",colors[i][1]);dots.forEach((d,j)=>d.classList.toggle("active",j===i))}dots.forEach((d,i)=>d.onclick=()=>set(i));setInterval(()=>set((idx+1)%dots.length),5000)}

async function main(){
  updateCartCount();
  wireCart();
  wireCheckout();
  wireAccount();
  wireReview();
  wireAdmin();
  if(firebaseReady) await loadProducts();
  renderHome();
  renderDetail();
  renderCart();
  wireHero();
  if($("year")) $("year").textContent = new Date().getFullYear();
  initAdmin();
  if($("orders-content")) renderOrders();
  if(!firebaseReady){
    const n = $("firebase-notice");
    if(n) n.textContent = "Preview mode: sample products are shown. Connect your new Firebase project to make the store live.";
  }
}

main();
