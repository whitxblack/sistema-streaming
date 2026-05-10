/* ============================================================
   STORE — Supabase Integration (Global, no ES modules)
   ============================================================ */

const _supabaseClient = supabase.createClient(
  'https://oxcmccejunruigskizzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y21jY2VqdW5ydWlnc2tpenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM0MjksImV4cCI6MjA5MzkxOTQyOX0.NbY2pVSklCu5XwQhd6X9EO1Qk9YXsp19RgGZWsontNQ'
);

console.log('[STORE] Cliente Supabase creado.');

// ── Cache en memoria con TTL ─────────────────────────────────
const _cache = {};
const CACHE_TTL = 45 * 1000; // 45 segundos

function cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { delete _cache[key]; return null; }
  return entry.data;
}
function cacheSet(key, data) {
  _cache[key] = { data, ts: Date.now() };
}
function cacheInvalidate(...keys) {
  keys.forEach(k => delete _cache[k]);
}
function cacheInvalidatePrefix(prefix) {
  Object.keys(_cache).forEach(k => { if (k.startsWith(prefix)) delete _cache[k]; });
}
// ────────────────────────────────────────────────────────────

window.store = {
  _userProfile: null,
  _session: null,

  getSupabase() { return _supabaseClient; },

  async init() {
    console.log('[STORE] init()');
    const { data, error } = await _supabaseClient.auth.getSession();
    if (error) { console.error('[STORE] getSession error:', error); }

    const session = data?.session || null;
    this._session = session;

    if (session) {
      await this._fetchUserProfile(session.user.id);
      this.prefetchAll().catch(() => {});
    }

    _supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('[STORE] Auth state change:', event);
      this._session = session;
      if (session) {
        await this._fetchUserProfile(session.user.id);
        this.prefetchAll().catch(() => {});
      } else {
        this._userProfile = null;
        Object.keys(_cache).forEach(k => delete _cache[k]);
      }
    });
  },

  // Pre-carga todos los datos en paralelo al iniciar sesión
  async prefetchAll() {
    const user = this._userProfile;
    if (!user) return;
    if (user.role === 'admin') {
      await Promise.allSettled([
        this.getAllUsers(),
        this.getAllSubscriptions(),
        this.getAllPayments(),
        this.getServices(),
        this.getCoupons(),
        this.getAllWallets(),
      ]);
    } else {
      await Promise.allSettled([
        this.getUserSubscriptions(),
        this.getMyWallet(),
        this.getServices(),
      ]);
    }
    console.log('[STORE] Pre-carga completada.');
  },

  async _fetchUserProfile(userId) {
    const { data } = await _supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    this._userProfile = data || null;
    console.log('[STORE] Perfil:', this._userProfile?.name, '| Rol:', this._userProfile?.role);
  },

  currentUser() { return this._userProfile; },
  isAdmin() { return this._userProfile?.role === 'admin'; },

  async login(email, password) {
    const { data, error } = await _supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this._fetchUserProfile(data.user.id);
    return data.user;
  },

  async logout() {
    await _supabaseClient.auth.signOut();
    this._userProfile = null;
    this._session = null;
    Object.keys(_cache).forEach(k => delete _cache[k]);
    window.location.hash = '/login';
    window.location.reload();
  },

  async getUserSubscriptions() {
    const cacheKey = `subs_${this._session?.user?.id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    if (!this._session) return [];
    const { data, error } = await _supabaseClient
      .from('subscriptions')
      .select('*, services(*), coupons(*)')
      .eq('user_id', this._session.user.id)
      .order('next_due', { ascending: true });
    if (error) { console.error(error); return []; }
    const result = data || [];
    cacheSet(cacheKey, result);
    return result;
  },

  async getAllUsers() {
    const cached = cacheGet('all_users');
    if (cached) return cached;
    const { data } = await _supabaseClient.from('users').select('*').neq('role', 'admin');
    const result = data || [];
    cacheSet('all_users', result);
    return result;
  },

  async getAllPayments() {
    const cached = cacheGet('all_payments');
    if (cached) return cached;
    const { data } = await _supabaseClient
      .from('payments').select('*, users(*)').order('created_at', { ascending: false });
    const result = data || [];
    cacheSet('all_payments', result);
    return result;
  },

  async getAllSubscriptions() {
    const cached = cacheGet('all_subs');
    if (cached) return cached;
    const { data } = await _supabaseClient
      .from('subscriptions').select('*, users(*), services(*)');
    const result = data || [];
    cacheSet('all_subs', result);
    return result;
  },

  async getServices() {
    const cached = cacheGet('services');
    if (cached) return cached;
    const { data } = await _supabaseClient
      .from('services').select('*').eq('is_active', true);
    const result = data || [];
    cacheSet('services', result);
    return result;
  },

  async createPayment(paymentData, subIds) {
    const invNum = await this.generateInvoiceNumber();
    const { data: payment, error } = await _supabaseClient
      .from('payments').insert([{ ...paymentData, invoice_number: invNum }]).select().single();
    if (error) throw error;
    const items = subIds.map(subId => ({ payment_id: payment.id, subscription_id: subId, amount_usd: 0 }));
    await _supabaseClient.from('payment_items').insert(items);
    await _supabaseClient.from('subscriptions').update({ payment_status: 'review' }).in('id', subIds);
    cacheInvalidate('all_payments', 'all_subs');
    cacheInvalidatePrefix('subs_');
    return payment;
  },

  async uploadReceipt(file, paymentId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${paymentId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await _supabaseClient.storage.from('receipts').upload(`receipts/${fileName}`, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = _supabaseClient.storage.from('receipts').getPublicUrl(`receipts/${fileName}`);
    await _supabaseClient.from('payments').update({ receipt_url: publicUrl }).eq('id', paymentId);
    cacheInvalidate('all_payments');
    return publicUrl;
  },

  async approvePayment(paymentId, subIds) {
    await _supabaseClient.from('payments')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', paymentId);
    for (const subId of subIds) {
      const { data: sub } = await _supabaseClient.from('subscriptions').select('next_due').eq('id', subId).single();
      if (sub) {
        const nextDue = new Date(sub.next_due + 'T12:00:00');
        nextDue.setMonth(nextDue.getMonth() + 1);
        await _supabaseClient.from('subscriptions')
          .update({ payment_status: 'approved', next_due: nextDue.toISOString().split('T')[0] }).eq('id', subId);
      }
    }
    cacheInvalidate('all_payments', 'all_subs');
    cacheInvalidatePrefix('subs_');
  },

  getDolarRate() { const r = localStorage.getItem('dolarRate'); return r ? parseFloat(r) : null; },
  setDolarRate(rate) {
    localStorage.setItem('dolarRate', rate);
    localStorage.setItem('dolarUpdatedAt', new Date().toISOString());
  },

  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const { count } = await _supabaseClient.from('payments').select('*', { count: 'exact', head: true });
    return `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  },

  // ── COUPONS ─────────────────────────────────────────────────
  async getCoupons() {
    const cached = cacheGet('coupons');
    if (cached) return cached;
    const { data } = await _supabaseClient.from('coupons').select('*').order('created_at', { ascending: false });
    const result = data || [];
    cacheSet('coupons', result);
    return result;
  },
  async createCoupon(d) {
    const { data, error } = await _supabaseClient.from('coupons').insert([d]).select().single();
    if (error) throw error;
    cacheInvalidate('coupons');
    return data;
  },
  async toggleCoupon(id, isActive) {
    const { error } = await _supabaseClient.from('coupons').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
    cacheInvalidate('coupons');
  },
  async deleteCoupon(id) {
    const { error } = await _supabaseClient.from('coupons').delete().eq('id', id);
    if (error) throw error;
    cacheInvalidate('coupons');
  },
  async applyCouponToSubscription(subId, couponId) {
    const { data: sub } = await _supabaseClient.from('subscriptions').select('price_usd').eq('id', subId).single();
    const { data: coupon } = await _supabaseClient.from('coupons').select('*').eq('id', couponId).single();
    if (!sub || !coupon) throw new Error('Suscripción o cupón no encontrado');
    if (!coupon.is_active) throw new Error('Este cupón no está activo');
    let dp = parseFloat(sub.price_usd);
    if (coupon.type === 'percentage') dp -= dp * (parseFloat(coupon.percentage_off) / 100);
    else dp -= Math.min(parseFloat(coupon.amount_off), dp);
    await _supabaseClient.from('subscriptions').update({ coupon_id: couponId, discounted_price: Math.max(0, dp).toFixed(2) }).eq('id', subId);
    await _supabaseClient.from('coupons').update({ total_redemptions: coupon.total_redemptions + 1 }).eq('id', couponId);
    cacheInvalidate('all_subs', 'coupons');
    cacheInvalidatePrefix('subs_');
  },
  async removeCouponFromSubscription(subId) {
    const { error } = await _supabaseClient.from('subscriptions').update({ coupon_id: null, discounted_price: null }).eq('id', subId);
    if (error) throw error;
    cacheInvalidate('all_subs');
    cacheInvalidatePrefix('subs_');
  },

  // ── WALLETS ─────────────────────────────────────────────────
  async getMyWallet() {
    const cacheKey = `wallet_${this._session?.user?.id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    if (!this._session) return null;
    const { data } = await _supabaseClient.from('wallets').select('*').eq('user_id', this._session.user.id).single();
    const result = data || null;
    if (result) cacheSet(cacheKey, result);
    return result;
  },
  async getUserWallet(userId) {
    const cacheKey = `wallet_user_${userId}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
    const { data } = await _supabaseClient.from('wallets').select('*').eq('user_id', userId).single();
    const result = data || null;
    if (result) cacheSet(cacheKey, result);
    return result;
  },
  async getAllWallets() {
    const cached = cacheGet('all_wallets');
    if (cached) return cached;
    const { data } = await _supabaseClient.from('wallets').select('*, users(name, email, avatar)').order('balance', { ascending: false });
    const result = data || [];
    cacheSet('all_wallets', result);
    return result;
  },
  async addWalletCredits(userId, amount, description) {
    let { data: w } = await _supabaseClient.from('wallets').select('*').eq('user_id', userId).single();
    if (!w) {
      const { data: nw, error } = await _supabaseClient.from('wallets').insert([{ user_id: userId, balance: 0 }]).select().single();
      if (error) throw error;
      w = nw;
    }
    const newBal = (parseFloat(w.balance) + parseFloat(amount)).toFixed(2);
    await _supabaseClient.from('wallets').update({ balance: newBal }).eq('id', w.id);
    await _supabaseClient.from('wallet_transactions').insert([{ wallet_id: w.id, amount: parseFloat(amount), type: 'credit', description: description || 'Crédito por administrador' }]);
    cacheInvalidate('all_wallets', `wallet_user_${userId}`, `wallet_${userId}`);
    return parseFloat(newBal);
  },
  async deductWalletCredits(walletId, amount, description) {
    const { data: w } = await _supabaseClient.from('wallets').select('*').eq('id', walletId).single();
    if (!w) throw new Error('Wallet no encontrado');
    if (parseFloat(w.balance) < parseFloat(amount)) throw new Error('Saldo insuficiente');
    const newBal = (parseFloat(w.balance) - parseFloat(amount)).toFixed(2);
    await _supabaseClient.from('wallets').update({ balance: newBal }).eq('id', w.id);
    await _supabaseClient.from('wallet_transactions').insert([{ wallet_id: w.id, amount: parseFloat(amount), type: 'debit', description: description || 'Pago descontado del wallet' }]);
    cacheInvalidate('all_wallets', `wallet_${w.user_id}`);
    return parseFloat(newBal);
  },
  async getWalletTransactions(walletId) {
    const { data } = await _supabaseClient.from('wallet_transactions').select('*').eq('wallet_id', walletId).order('created_at', { ascending: false }).limit(20);
    return data || [];
  }
};
