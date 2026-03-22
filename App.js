import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  ShoppingBag, 
  Plus, 
  LogOut, 
  Trash2, 
  Clock, 
  Leaf, 
  Zap, 
  Lock, 
  ChevronRight, 
  ArrowRight, 
  X, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  ShoppingBasket,
  LayoutDashboard,
  ClipboardList,
  MessageCircle,
  Mail,
  Truck,
  Box,
  ChevronDown,
  ShieldCheck,
  Copy,
  Search,
  ClipboardCheck,
  PartyPopper,
  Star,
  Image as ImageIcon,
  Upload
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'avilmilk-web-rashad-pro';

const App = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('home'); 
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null); 
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Lookup state
  const [lookupInput, setLookupInput] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Admin Auth States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [adminTab, setAdminTab] = useState('products'); 
  const [checkoutData, setCheckoutData] = useState({ name: '', phone: '', address: '' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', image: '', desc: '' });
  const [isAdding, setIsAdding] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');

    const unsubProducts = onSnapshot(productsRef, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const unsubOrders = onSnapshot(ordersRef, (snap) => {
      const oList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllOrders(oList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => console.error(err));

    return () => { unsubProducts(); unsubOrders(); };
  }, [user]);

  // Handle Celebration Logic
  useEffect(() => {
    if (trackedOrder?.status === 'Delivery' && !showCelebration) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 8000);
      return () => clearTimeout(timer);
    }
    if (trackedOrder?.status !== 'Delivery') {
      setShowCelebration(false);
    }
  }, [trackedOrder]);

  // Sync tracked order with latest data
  useEffect(() => {
    if (trackedOrder) {
      const updated = allOrders.find(o => o.id === trackedOrder.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(trackedOrder)) {
        setTrackedOrder(updated);
      }
    }
  }, [allOrders, trackedOrder]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminUser === "rashadxdk" && adminPass === "emel._raha") {
      setIsAdmin(true);
      setView('admin');
      setShowAdminModal(false);
      setAuthError('');
    } else {
      setAuthError('Invalid Admin Credentials');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('home');
  };

  // Image Upload Handler (Converts to Base64 for Firestore)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (Firestore limit is 1MB per document, keep images small)
    if (file.size > 800000) {
      alert("Image is too large. Please upload an image smaller than 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProduct({ ...newProduct, image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleCheckout = async (e) => {
    if (e) e.preventDefault();
    if (!user || cart.length === 0) return;
    
    setOrderStatus('sending');
    const orderDetails = {
      customer: checkoutData,
      items: cart,
      total: cart.reduce((s, i) => s + i.price, 0),
      timestamp: serverTimestamp(),
      status: 'Ordered',
      placedDate: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })
    };

    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), orderDetails);
      setLastPlacedOrder({ id: docRef.id, ...orderDetails });
      setOrderStatus('success');
      setCart([]);
      setCheckoutData({ name: '', phone: '', address: '' });
    } catch (err) {
      setOrderStatus('success'); 
    }
  };

  const handleLookup = (e) => {
    if (e) e.preventDefault();
    setLookupError('');
    const cleanInput = lookupInput.trim().replace('#', '').toUpperCase();
    if (!cleanInput) {
      setLookupError('Please enter an ID');
      return;
    }
    const found = allOrders.find(o => 
      o.id.toUpperCase() === cleanInput || 
      o.id.slice(-8).toUpperCase() === cleanInput
    );
    if (found) {
      setTrackedOrder(found);
    } else {
      setLookupError('Order ID not found.');
      setTrackedOrder(null);
    }
  };

  const copyToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', id), {
        status: newStatus
      });
    } catch (err) { console.error(err); }
  };

  const deleteItem = async (col, id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    } catch (err) { console.error(err); }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.image) {
      alert("Please upload an image first!");
      return;
    }
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
        ...newProduct,
        price: parseFloat(newProduct.price),
        createdAt: new Date().toISOString()
      });
      setNewProduct({ name: '', price: '', image: '', desc: '' });
    } catch (err) { console.error(err); }
    setIsAdding(false);
  };

  const displayProducts = products.length > 0 ? products : [{
    id: 'sample',
    name: "Original Malabar Avilmilk",
    price: 150,
    image: "https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&q=80&w=800",
    desc: "Experience the authentic creamy taste of Kerala. Prepared in 60 seconds."
  }];
  
  const cartTotal = cart.reduce((s, i) => s + i.price, 0);

  const ConfettiPopper = () => (
    <div className="fixed inset-0 pointer-events-none z-[300] overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div 
          key={i} 
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#fbbf24', '#f59e0b', '#22c55e', '#ef4444', '#3b82f6'][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 3}s`,
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 20 + 10}px`,
          }}
        />
      ))}
    </div>
  );

  const OrderTimeline = ({ status, placedDate }) => {
    const stages = ['Ordered', 'Packed', 'Shipped', 'Delivery'];
    const currentIdx = stages.indexOf(status);
    return (
      <div className="flex flex-col space-y-0 relative pl-10 py-2">
        <div className="absolute left-[15px] top-4 bottom-4 w-[2.5px] bg-stone-100 rounded-full"></div>
        <div className="absolute left-[15px] top-4 w-[2.5px] bg-green-500 transition-all duration-1000 ease-in-out rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]" 
          style={{ height: `${(currentIdx / 3) * 100}%`, maxHeight: 'calc(100% - 32px)' }}></div>
        {stages.map((stage, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={stage} className="relative pb-10 last:pb-0">
              <div className={`absolute -left-[32px] top-1 w-[13px] h-[13px] rounded-full z-10 transition-all duration-500 border-[2px] 
                ${isCompleted ? 'bg-green-500 border-green-500 scale-110 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-white border-stone-200'}`}>
                {isCurrent && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25"></div>}
              </div>
              <div className="flex flex-col items-start translate-y-[-2px]">
                <span className={`text-[15px] font-black tracking-tight ${isCompleted ? 'text-stone-900' : 'text-stone-300'}`}>{stage}</span>
                {stage === 'Ordered' && <p className="text-[11px] text-stone-400 font-bold uppercase mt-0.5">{placedDate}</p>}
                {isCompleted && stage !== 'Ordered' && <p className="text-[10px] text-green-600 font-black uppercase tracking-widest mt-0.5">Updated: {stage}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-stone-900 font-sans selection:bg-amber-100">
      <style>{`
        .card { width: 100%; max-width: 400px; background: #FFFFFF; box-shadow: 0px 12px 26px rgba(0, 0, 0, 0.05); border-radius: 15px; overflow: hidden; margin: 0 auto; border: 1px solid #f0f0f5; }
        .cart-title { width: 100%; height: 45px; position: relative; display: flex; align-items: center; padding-left: 20px; border-bottom: 1px solid #efeff3; font-weight: 700; font-size: 11px; color: #63656b; text-transform: uppercase; letter-spacing: 1px; }
        .input_field { width: 100%; height: 45px; padding: 0 15px; border-radius: 12px; outline: none; border: 1px solid #e5e7eb; font-size: 14px; transition: all 0.2s; color: #1c1c1c; font-weight: 500; }
        .input_field:focus { border-color: #d97706; box-shadow: 0 0 0 4px #fef3c7; }
        .primary-btn { width: 100%; height: 50px; background: #d97706; color: white; border-radius: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; transition: 0.3s; box-shadow: 0 4px 10px rgba(217, 119, 6, 0.2); border: none; cursor: pointer; font-size: 13px; }
        .primary-btn:hover { background: #b45309; transform: translateY(-2px); }

        .confetti-piece { position: absolute; top: -20px; opacity: 0; animation: fall 3s linear infinite; }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .celebration-card { animation: pop-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes pop-up {
          from { transform: scale(0.8) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .upload-area { border: 2px dashed #e5e7eb; transition: 0.2s; position: relative; border-radius: 15px; height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fafafa; }
        .upload-area:hover { border-color: #d97706; background: #fffcf0; }
      `}</style>

      {showCelebration && <ConfettiPopper />}

      {/* --- ADMIN PANEL MODAL --- */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 relative">
            <button onClick={() => setShowAdminModal(false)} className="absolute top-6 right-6 p-2 hover:bg-stone-50 rounded-full transition-colors">
              <X className="w-5 h-5 text-stone-400" />
            </button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <ShieldCheck className="text-white w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-stone-900">Admin Login</h2>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input placeholder="Username" required className="input_field" value={adminUser} onChange={e => setAdminUser(e.target.value)} />
              <input placeholder="Password" type="password" required className="input_field" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              {authError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">{authError}</p>}
              <button type="submit" className="primary-btn !bg-stone-900">Enter Panel</button>
            </form>
          </div>
        </div>
      )}
      
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-amber-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => { setView('home'); setOrderStatus(null); }}>
            <div className="bg-amber-500 p-2 rounded-xl mr-3 shadow-lg shadow-amber-200">
              <Zap className="text-white h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic text-stone-900">Malabar <span className="text-amber-500">Avil</span></h1>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-8">
            <button 
              onClick={() => { setView('lookup'); setIsCartOpen(false); setTrackedOrder(null); setLookupInput(''); setLookupError(''); }} 
              className={`flex items-center text-xs font-black uppercase tracking-widest transition-colors ${view === 'lookup' ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'}`}
            >
              <Truck className="w-4 h-4 mr-2" /> My Orders
            </button>
            
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-stone-700 hover:text-amber-600 transition-colors">
              <ShoppingBag className="h-6 w-6" />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce">{cart.length}</span>}
            </button>
            
            {isAdmin ? (
              <button onClick={() => setView('admin')} className="hidden md:flex items-center text-xs font-black text-stone-900 bg-amber-100 px-4 py-2 rounded-xl uppercase tracking-widest">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Panel
              </button>
            ) : (
              <button onClick={() => setShowAdminModal(true)} className="p-2 text-stone-200 hover:text-stone-400 transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Cart Drawer */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isCartOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsCartOpen(false)}></div>
        <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-500 transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-6 px-4 pt-4 border-b pb-4">
              <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">BAG</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors"><X className="h-5 w-5 text-stone-400" /></button>
            </div>

            {orderStatus === 'success' ? (
              <div className="p-6">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter leading-none">Order Placed!</h3>
                  <p className="text-stone-400 text-sm mt-2">Malabar is calling your name.</p>
                </div>

                <div className="bg-stone-50 p-6 rounded-[2rem] border border-stone-100 mb-8">
                  <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-3">Copy your Tracking ID</p>
                  <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200">
                    <span className="font-black text-lg text-stone-900 tracking-tight">#{lastPlacedOrder?.id?.slice(-8).toUpperCase()}</span>
                    <button 
                      onClick={() => copyToClipboard(lastPlacedOrder?.id?.slice(-8).toUpperCase())}
                      className={`flex items-center px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${copied ? 'bg-green-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                    >
                      {copied ? <ClipboardCheck className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] text-stone-500 font-medium leading-relaxed italic">
                    Save this ID to check your order schedule later.
                  </p>
                </div>
                
                <button onClick={() => { setIsCartOpen(false); setOrderStatus(null); }} className="w-full primary-btn">Go Back Shop</button>
              </div>
            ) : cart.length === 0 ? (
              <div className="text-center py-20 opacity-20 flex flex-col items-center justify-center h-full">
                <ShoppingBasket className="w-16 h-16 mx-auto mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">Bag is empty</p>
              </div>
            ) : (
              <div className="master-container">
                <div className="card p-4 shadow-none border-stone-100">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-4 block">Mixes</label>
                  <div className="space-y-4">
                    {cart.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm font-bold border-b pb-2 last:border-0">
                        <span className="text-stone-900">{item.name}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-amber-600 font-black">₹{item.price}</span>
                          <button onClick={() => setCart(cart.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-stone-100 flex justify-between font-black text-xl text-stone-900">
                      <span>Total:</span><span>₹{cartTotal}</span>
                    </div>
                  </div>
                </div>
                <div className="card p-5 shadow-none border-stone-100">
                  <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-4 block">Shipping</label>
                  <div className="space-y-4">
                    <input required placeholder="Name" className="input_field" value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} />
                    <input required placeholder="Phone" className="input_field" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} />
                    <textarea required placeholder="Full Address" rows="3" className="input_field py-3 h-auto" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} />
                    <button onClick={handleCheckout} className="primary-btn mt-4">Place Order</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ORDER LOOKUP VIEW --- */}
      {view === 'lookup' && (
        <div className="max-w-xl mx-auto px-6 py-20 min-h-[80vh]">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-stone-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
               <Truck className="text-white w-8 h-8" />
            </div>
            <h2 className="text-4xl font-black text-stone-900 tracking-tighter uppercase italic">Order Status</h2>
            <p className="text-stone-400 font-medium mt-2">Enter your Order ID to see your schedule.</p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-3 mb-12">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
              <input 
                placeholder="Paste Order ID here..." 
                className="input_field pl-12 h-[55px] font-black tracking-widest" 
                value={lookupInput} 
                onChange={e => setLookupInput(e.target.value)} 
                required
              />
            </div>
            <button type="submit" className="primary-btn !w-36 h-[55px] flex items-center justify-center !rounded-2xl">
               Track
            </button>
          </form>

          {lookupError && (
            <div className="bg-red-50 text-red-500 p-5 rounded-2xl text-center font-black text-xs uppercase tracking-widest mb-8">
               {lookupError}
            </div>
          )}

          {trackedOrder && (
            <div className="relative">
              {trackedOrder.status === 'Delivery' && (
                <div className="celebration-card bg-gradient-to-r from-green-500 to-green-600 rounded-[2rem] p-8 mb-8 text-white shadow-xl flex items-center justify-between border-4 border-white/20">
                  <div>
                    <h3 className="text-2xl font-black flex items-center tracking-tight">
                      <PartyPopper className="w-8 h-8 mr-3 animate-bounce" /> Congratulations!
                    </h3>
                    <p className="mt-1 font-bold opacity-90">Your Malabar Bliss has been Delivered.</p>
                  </div>
                  <div className="hidden sm:block">
                    <Star className="w-10 h-10 text-amber-300 fill-amber-300" />
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[2.5rem] border border-stone-100 shadow-2xl p-10 animate-in zoom-in-95 duration-500">
                 <div className="flex justify-between items-center mb-10 border-b border-stone-50 pb-8">
                    <div>
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-[0.2em] mb-1">Receipt ID</p>
                      <h4 className="text-xl font-black text-stone-900 tracking-tight">#{trackedOrder.id.slice(-8).toUpperCase()}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-stone-400 tracking-[0.2em] mb-1">Paid</p>
                      <p className="text-xl font-black text-amber-600">₹{trackedOrder.total}</p>
                    </div>
                 </div>

                 <div className="mb-10">
                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-[0.2em] mb-6">Schedule Progress</p>
                    <OrderTimeline status={trackedOrder.status} placedDate={trackedOrder.placedDate} />
                 </div>

                 <div className="mt-10 pt-8 border-t border-stone-50 text-stone-500">
                    <div className="bg-stone-50 p-4 rounded-xl text-stone-600 font-bold text-sm leading-relaxed italic">
                      Recipient: {trackedOrder.customer.name}<br/>
                      {trackedOrder.customer.address}
                    </div>
                 </div>
              </div>
            </div>
          )}

          <button onClick={() => setView('home')} className="w-full mt-16 text-stone-300 font-black hover:text-stone-900 uppercase text-[10px] tracking-[0.3em]">Home</button>
        </div>
      )}

      {view === 'home' && (
        <main>
          <section className="relative pt-12 pb-32 overflow-hidden bg-gradient-to-b from-[#FFFBF0] to-transparent px-6 text-stone-900">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 text-center lg:text-left">
                <span className="inline-block bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">Official Store</span>
                <h2 className="text-5xl md:text-8xl font-black tracking-tight text-stone-900 leading-none italic">Instant <span className="text-amber-500">Avilmilk</span> Mix.</h2>
                <p className="text-lg text-stone-500 max-w-xl font-medium">Original Malabar recipe. Rehydrate in 60 seconds.</p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <button onClick={() => document.getElementById('shop').scrollIntoView({behavior:'smooth'})} className="bg-stone-900 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase shadow-2xl hover:scale-105 transition-all">Shop Now</button>
                  <a href="https://wa.me/7306828565" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-green-700 transition-all flex items-center"><MessageCircle className="mr-2 w-5 h-5" /> WhatsApp</a>
                </div>
              </div>
              <div className="relative">
                <img src="https://images.unsplash.com/photo-1544145945-f904253d0c7b?auto=format&fit=crop&q=80&w=800" className="w-full max-w-md mx-auto rounded-[3rem] shadow-2xl rotate-2" alt="Avilmilk" />
                <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:-left-8 md:translate-x-0 bg-white p-6 rounded-3xl shadow-2xl border border-amber-50 min-w-[200px]">
                  <div className="flex items-center space-x-3">
                    <div className="bg-amber-100 p-2 rounded-full"><CheckCircle2 className="text-amber-600 w-5 h-5" /></div>
                    <div><p className="text-2xl font-black text-amber-600">4.9/5</p><p className="text-stone-400 text-[9px] font-black uppercase tracking-widest mt-1">Customer Choice</p></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="shop" className="max-w-7xl mx-auto px-6 py-32 border-t border-stone-50">
            <h2 className="text-4xl font-black mb-12 text-stone-900 uppercase tracking-tighter">Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {displayProducts.map(p => (
                <div key={p.id} className="bg-white rounded-[2.5rem] border border-stone-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                  <div className="relative h-72 overflow-hidden border-b"><img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /></div>
                  <div className="p-8"><div className="flex justify-between items-start mb-4"><h3 className="text-xl font-black text-stone-900 tracking-tight">{p.name}</h3><span className="text-xl font-black text-amber-600">₹{p.price}</span></div><p className="text-stone-500 text-sm mb-8 leading-relaxed line-clamp-2 font-medium">{p.desc}</p>
                    <button onClick={() => { setCart([...cart, p]); setIsCartOpen(true); }} className="w-full bg-stone-50 text-stone-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center group">
                      Quick Add <ShoppingBag className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* --- ADMIN PANEL VIEW --- */}
      {view === 'admin' && isAdmin && (
        <div className="max-w-7xl mx-auto px-6 py-12 text-stone-900">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div>
              <h2 className="text-4xl font-black tracking-tighter uppercase italic">Admin Dashboard</h2>
              <div className="flex mt-6 bg-stone-100 p-1.5 rounded-2xl gap-1 shadow-inner">
                <button onClick={() => setAdminTab('products')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${adminTab === 'products' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>Inventory</button>
                <button onClick={() => setAdminTab('orders')} className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center ${adminTab === 'orders' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'}`}>Sales ({allOrders.length})</button>
              </div>
            </div>
            <button onClick={handleLogout} className="px-6 py-3 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center text-xs uppercase tracking-widest"><LogOut className="mr-2 h-4 w-4" /> Exit Studio</button>
          </div>

          {adminTab === 'products' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1">
                <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-xl sticky top-24">
                  <h3 className="text-xs font-black mb-8 uppercase tracking-widest text-stone-400">Add New Mix</h3>
                  <form onSubmit={addProduct} className="space-y-6">
                    <input placeholder="Mix Name" required className="input_field" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                    <input type="number" placeholder="Price (₹)" required className="input_field" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                    
                    {/* UPDATED: Image Gallery Upload UI */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-stone-400 ml-1">Product Pic</label>
                       <div className="upload-area">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                            onChange={handleImageUpload}
                          />
                          {newProduct.image ? (
                             <img src={newProduct.image} className="w-full h-full object-cover" />
                          ) : (
                             <div className="flex flex-col items-center text-stone-400">
                                <Upload className="w-6 h-6 mb-2" />
                                <span className="text-[10px] font-bold">Select from Gallery</span>
                             </div>
                          )}
                       </div>
                       {newProduct.image && (
                         <button 
                           onClick={() => setNewProduct({...newProduct, image: ''})}
                           className="text-[10px] font-bold text-red-400 uppercase tracking-widest w-full text-center py-1"
                         >
                           Remove Selection
                         </button>
                       )}
                    </div>

                    <textarea placeholder="Product Details..." rows="3" className="input_field py-3 h-auto" value={newProduct.desc} onChange={e => setNewProduct({...newProduct, desc: e.target.value})} />
                    <button type="submit" disabled={isAdding} className="primary-btn">
                       {isAdding ? 'Uploading...' : 'Save to Shop'}
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-4">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-3xl border border-stone-100 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center space-x-4"><img src={p.image} className="w-16 h-16 rounded-2xl object-cover border" alt="" /><div><h4 className="font-bold text-stone-900">{p.name}</h4><p className="text-amber-600 font-black">₹{p.price}</p></div></div>
                    <button onClick={() => deleteItem('products', p.id)} className="p-4 text-stone-200 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {allOrders.map(o => (
                <div key={o.id} className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-xl grid md:grid-cols-4 gap-12 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${o.status === 'Delivery' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <div className="md:col-span-1">
                    <p className="text-[10px] font-black uppercase text-stone-400 tracking-[0.2em] mb-4 text-stone-300">ID: #{o.id.slice(-8).toUpperCase()}</p>
                    <h4 className="text-xl font-black text-stone-900">{o.customer.name}</h4>
                    <p className="text-stone-500 text-xs mt-1 font-black flex items-center tracking-widest"><Phone className="w-3 h-3 mr-2" /> {o.customer.phone}</p>
                    <p className="text-stone-400 text-[11px] mt-6 leading-relaxed italic border-t pt-4 font-medium">{o.customer.address}</p>
                  </div>
                  <div className="md:col-span-2 border-x border-stone-50 px-6"><OrderTimeline status={o.status} placedDate={o.placedDate} /></div>
                  <div className="md:col-span-1 flex flex-col justify-between items-end">
                    <div className="text-right w-full">
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Update Stage</p>
                      <select className="w-full p-4 rounded-2xl text-[11px] font-black bg-stone-50 border-none outline-none cursor-pointer text-center uppercase tracking-[0.2em] shadow-inner" value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                        <option value="Ordered">1. Ordered</option><option value="Packed">2. Packed</option><option value="Shipped">3. Shipped</option><option value="Delivery">4. Delivered</option>
                      </select>
                      <h4 className="text-3xl font-black text-stone-900 mt-10 tracking-tighter">₹{o.total}</h4>
                    </div>
                    <button onClick={() => deleteItem('orders', o.id)} className="mt-4 p-3 text-red-500 opacity-20 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <footer className="bg-stone-900 text-white py-20 px-6 rounded-t-[4rem]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 text-stone-900">
          <div>
            <h1 className="text-2xl font-black tracking-tighter mb-4 italic uppercase text-white">Malabar <span className="text-amber-500">Avil</span></h1>
            <p className="text-stone-400 max-w-xs font-medium text-sm leading-relaxed">Kerala's favorite dessert beverage mix.</p>
          </div>
          <div className="space-y-6 text-center md:text-left">
            <p className="font-black text-sm flex items-center justify-center md:justify-start text-white tracking-widest uppercase"><Mail className="mr-2 h-4 w-4 text-amber-500" /> rashadkkekh242242@gmail.com</p>
            <div className="flex gap-6 justify-center md:justify-start items-center">
              <button onClick={() => setShowAdminModal(true)} className="text-stone-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Admin Panel</button>
              <span className="text-stone-700">|</span>
              <p className="text-stone-600 text-[10px] font-black uppercase tracking-widest">© 2026 Kozhikode Store</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
