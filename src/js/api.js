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
    const saved = localStorage.getItem('euroRate');
    const updatedAt = localStorage.getItem('euroUpdatedAt');
    const TTL = 15 * 60 * 1000;
    if (saved && updatedAt && (Date.now() - new Date(updatedAt).getTime()) < TTL) {
      return parseFloat(saved);
    }
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/euros');
      const data = await res.json();
      const oficial = data.find(c => c.fuente === 'oficial') || data[0];
      const rate = oficial?.promedio || oficial?.precio || null;
      if (rate) {
        localStorage.setItem('euroRate', rate);
        localStorage.setItem('euroUpdatedAt', new Date().toISOString());
      }
      return rate;
    } catch {
      return saved ? parseFloat(saved) : null;
    }
  },

  usdToBs(usd, rate) { return rate ? (usd * rate).toFixed(2) : null; },

  formatUSD(amount) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  },

  formatBs(amount) {
    if (!amount) return '—';
    return 'Bs. ' + new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
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
    const localLogos = {
      'netflix': 'logos/netflix.png',
      'spotify': 'logos/spotify.png',
      'disney+': 'logos/disney.svg',
      'disney': 'logos/disney.svg',
      'youtube premium': 'logos/youtube.png',
      'youtube': 'logos/youtube.png',
      'max (hbo)': 'logos/max.png',
      'max': 'logos/max.png',
      'hbo max': 'logos/max.png',
      'amazon prime': 'logos/amazon.png',
      'prime video': 'logos/amazon.png',
      'apple tv+': 'logos/apple.png',
      'apple tv': 'logos/apple.png',
      'chatgpt plus': 'logos/chatgpt.png',
      'chatgpt': 'logos/chatgpt.png',
      'canva pro': 'logos/canva.png',
      'canva': 'logos/canva.png'
    };
    const key = name.toLowerCase().trim();
    if (localLogos[key]) {
      return `<img src="${localLogos[key]}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`;
    }
    // If local logo is not available, we use the emoji fallback
    // (Clearbit removed to prevent broken images if blocked)
    return `<span style="font-size:22px">${emoji || '📱'}</span>`;
  }
};
