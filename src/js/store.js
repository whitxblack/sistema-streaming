/* ============================================================
   STORE — Supabase Integration (Global, no ES modules)
   ============================================================ */

const _supabaseClient = supabase.createClient(
  'https://oxcmccejunruigskizzj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y21jY2VqdW5ydWlnc2tpenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDM0MjksImV4cCI6MjA5MzkxOTQyOX0.NbY2pVSklCu5XwQhd6X9EO1Qk9YXsp19RgGZWsontNQ'
);

console.log('[STORE] Cliente Supabase creado.');

window.store = {
  _userProfile: null,
  _session: null,

  getSupabase() { return _supabaseClient; },

  async init() {
    console.log('[STORE] init() — llamando getSession...');
    const { data, error } = await _supabaseClient.auth.getSession();
    if (error) { console.error('[STORE] getSession error:', error); }

    const session = data?.session || null;
    this._session = session;
    console.log('[STORE] sesión:', session ? 'ACTIVA' : 'NINGUNA');

    if (session) {
      await this._fetchUserProfile(session.user.id);
    }

    _supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('[STORE] Auth state change:', event);
      this._session = session;
      if (session) {
        await this._fetchUserProfile(session.user.id);
      } else {
        this._userProfile = null;
      }
    });
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
    window.location.hash = '/login';
    window.location.reload();
  },

  async getUserSubscriptions() {
    if (!this._session) return [];
    const { data, error } = await _supabaseClient
      .from('subscriptions')
      .select('*, services(*), coupons(*)')
      .eq('user_id', this._session.user.id)
      .order('next_due', { ascending: true });
    if (error) { console.error(error); return []; }
    return data || [];
  },

  async getAllUsers() {
    const { data } = await _supabaseClient.from('users').select('*').neq('role', 'admin');
    return data || [];
  },

  async getAllPayments() {
    const { data } = await _supabaseClient
      .from('payments').select('*, users(*)').order('created_at', { ascending: false });
    return data || [];
  },

  async getAllSubscriptions() {
    const { data } = await _supabaseClient
      .from('subscriptions').select('*, users(*), services(*)');
    return data || [];
  },

  async getServices() {
    const { data } = await _supabaseClient
      .from('services').select('*').eq('is_active', true);
    return data || [];
  },

  async createPayment(paymentData, subIds) {
    const invNum = await this.generateInvoiceNumber();
    const { data: payment, error } = await _supabaseClient
      .from('payments').insert([{ ...paymentData, invoice_number: invNum }]).select().single();
    if (error) throw error;
    const items = subIds.map(subId => ({ payment_id: payment.id, subscription_id: subId, amount_usd: 0 }));
    await _supabaseClient.from('payment_items').insert(items);
    await _supabaseClient.from('subscriptions').update({ payment_status: 'review' }).in('id', subIds);
    return payment;
  },

  async uploadReceipt(file, paymentId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${paymentId}_${Date.now()}.${fileExt}`;
    const { error: uploadError } = await _supabaseClient.storage.from('receipts').upload(`receipts/${fileName}`, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = _supabaseClient.storage.from('receipts').getPublicUrl(`receipts/${fileName}`);
    await _supabaseClient.from('payments').update({ receipt_url: publicUrl }).eq('id', paymentId);
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
  },

  getDolarRate() { const r = localStorage.getItem('dolarRate'); return r ? parseFloat(r) : null; },
  setDolarRate(rate) {
    localStorage.setItem('dolarRate', rate);
    localStorage.setItem('dolarUpdatedAt', new Date().toISOString());
  },

  // ── INVOICE NUMBER ──────────────────────────────────────────
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const { count } = await _supabaseClient.from('payments').select('*', { count: 'exact', head: true });
    return `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  },

  // ── COUPONS (admin only) ────────────────────────────────────
  async getCoupons() {
    const { data } = await _supabaseClient.from('coupons').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  async createCoupon(d) {
    const { data, error } = await _supabaseClient.from('coupons').insert([d]).select().single();
    if (error) throw error;
    return data;
  },
  async toggleCoupon(id, isActive) {
    const { error } = await _supabaseClient.from('coupons').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },
  async deleteCoupon(id) {
    const { error } = await _supabaseClient.from('coupons').delete().eq('id', id);
    if (error) throw error;
  },
  async applyCouponToSubscription(subId, couponId) {
    const { data: sub } = await _supabaseClient.from('subscriptions').select('price_usd').eq('id', subId).single();
    const { data: coupon } = await _supabaseClient.from('coupons').select('*').eq('id', couponId).single();
    if (!sub || !coupon) throw new Error('Suscripci\u00f3n o cup\u00f3n no encontrado');
    if (!coupon.is_active) throw new Error('Este cup\u00f3n no est\u00e1 activo');
    let dp = parseFloat(sub.price_usd);
    if (coupon.type === 'percentage') dp -= dp * (parseFloat(coupon.percentage_off) / 100);
    else dp -= Math.min(parseFloat(coupon.amount_off), dp);
    await _supabaseClient.from('subscriptions').update({ coupon_id: couponId, discounted_price: Math.max(0, dp).toFixed(2) }).eq('id', subId);
    await _supabaseClient.from('coupons').update({ total_redemptions: coupon.total_redemptions + 1 }).eq('id', couponId);
  },
  async removeCouponFromSubscription(subId) {
    const { error } = await _supabaseClient.from('subscriptions').update({ coupon_id: null, discounted_price: null }).eq('id', subId);
    if (error) throw error;
  },

  // ── WALLETS ─────────────────────────────────────────────────
  async getMyWallet() {
    if (!this._session) return null;
    const { data } = await _supabaseClient.from('wallets').select('*').eq('user_id', this._session.user.id).single();
    return data || null;
  },
  async getUserWallet(userId) {
    const { data } = await _supabaseClient.from('wallets').select('*').eq('user_id', userId).single();
    return data || null;
  },
  async getAllWallets() {
    const { data } = await _supabaseClient.from('wallets').select('*, users(name, email, avatar)').order('balance', { ascending: false });
    return data || [];
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
    await _supabaseClient.from('wallet_transactions').insert([{ wallet_id: w.id, amount: parseFloat(amount), type: 'credit', description: description || 'Cr\u00e9dito por administrador' }]);
    return parseFloat(newBal);
  },
  async deductWalletCredits(walletId, amount, description) {
    const { data: w } = await _supabaseClient.from('wallets').select('*').eq('id', walletId).single();
    if (!w) throw new Error('Wallet no encontrado');
    if (parseFloat(w.balance) < parseFloat(amount)) throw new Error('Saldo insuficiente');
    const newBal = (parseFloat(w.balance) - parseFloat(amount)).toFixed(2);
    await _supabaseClient.from('wallets').update({ balance: newBal }).eq('id', w.id);
    await _supabaseClient.from('wallet_transactions').insert([{ wallet_id: w.id, amount: parseFloat(amount), type: 'debit', description: description || 'Pago descontado del wallet' }]);
    return parseFloat(newBal);
  },
  async getWalletTransactions(walletId) {
    const { data } = await _supabaseClient.from('wallet_transactions').select('*').eq('wallet_id', walletId).order('created_at', { ascending: false }).limit(20);
    return data || [];
  }
};
