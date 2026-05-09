/* ============================================================
   API — Dollar Rate & Utilities (Global, no ES modules)
   ============================================================ */
console.log('[API] Cargado.');

window.api = {
  // Precio real del usuario (con descuento si aplica — invisible para el usuario)
  getEffectivePrice(sub) {
    return (sub.discounted_price !== null && sub.discounted_price !== undefined)
      ? parseFloat(sub.discounted_price)
      : parseFloat(sub.price_usd);
  },
  hasDiscount(sub) {
    return sub.discounted_price !== null && sub.discounted_price !== undefined
      && parseFloat(sub.discounted_price) < parseFloat(sub.price_usd);
  },

  async fetchDolarRate() {
    const saved = localStorage.getItem('dolarRate');
    const updatedAt = localStorage.getItem('dolarUpdatedAt');
    const TTL = 15 * 60 * 1000;
    if (saved && updatedAt && (Date.now() - new Date(updatedAt).getTime()) < TTL) {
      return parseFloat(saved);
    }
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/cotizaciones');
      const data = await res.json();
      const oficial = data.find(c => c.fuente === 'oficial') || data[0];
      const rate = oficial?.promedio || oficial?.precio || null;
      if (rate) { window.store.setDolarRate(rate); }
      return rate;
    } catch {
      return saved ? parseFloat(saved) : null;
    }
  },

  usdToBs(usd, rate) { return rate ? (usd * rate).toFixed(2) : null; },

  formatUSD(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  },

  formatBs(amount) {
    if (!amount) return '—';
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + ' Bs';
  },

  getDaysUntilDue(nextDue) {
    if (!nextDue) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(nextDue + 'T12:00:00'); due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  },

  getPaymentStatusInfo({ nextDue, paymentStatus }) {
    const days = this.getDaysUntilDue(nextDue);
    if (paymentStatus === 'approved') return { label: 'Al día', cssClass: 'days-paid', badgeClass: 'badge-approved' };
    if (paymentStatus === 'review') return { label: 'En revisión', cssClass: 'days-warning', badgeClass: 'badge-review' };
    if (days < 0) return { label: `Vencido ${Math.abs(days)}d`, cssClass: 'days-expired', badgeClass: 'badge-overdue' };
    if (days === 0) return { label: 'Vence hoy', cssClass: 'days-danger', badgeClass: 'badge-pending' };
    if (days <= 5) return { label: `${days}d restantes`, cssClass: 'days-danger', badgeClass: 'badge-pending' };
    if (days <= 10) return { label: `${days}d restantes`, cssClass: 'days-warning', badgeClass: 'badge-pending' };
    return { label: `${days}d restantes`, cssClass: 'days-ok', badgeClass: 'badge-active' };
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  getServiceLogo(name, emoji) {
    const knownLogos = {
      'netflix': 'https://logo.clearbit.com/netflix.com',
      'spotify': 'https://logo.clearbit.com/spotify.com',
      'disney+': 'https://logo.clearbit.com/disneyplus.com',
      'disney': 'https://logo.clearbit.com/disneyplus.com',
      'hbo max': 'https://logo.clearbit.com/max.com',
      'max': 'https://logo.clearbit.com/max.com',
      'amazon prime': 'https://logo.clearbit.com/amazon.com',
      'prime video': 'https://logo.clearbit.com/primevideo.com',
      'youtube premium': 'https://logo.clearbit.com/youtube.com',
      'youtube': 'https://logo.clearbit.com/youtube.com',
      'apple tv+': 'https://logo.clearbit.com/apple.com',
      'apple tv': 'https://logo.clearbit.com/apple.com',
      'apple music': 'https://logo.clearbit.com/apple.com',
      'paramount+': 'https://logo.clearbit.com/paramountplus.com',
      'star+': 'https://logo.clearbit.com/starplus.com',
      'crunchyroll': 'https://logo.clearbit.com/crunchyroll.com',
      'playstation plus': 'https://logo.clearbit.com/playstation.com',
      'xbox game pass': 'https://logo.clearbit.com/xbox.com',
      'nintendo switch online': 'https://logo.clearbit.com/nintendo.com'
    };
    const key = name.toLowerCase().trim();
    if (knownLogos[key]) {
      return `<img src="${knownLogos[key]}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;"/>`;
    }
    return `<span style="font-size:22px">${emoji || '📱'}</span>`;
  }
};
