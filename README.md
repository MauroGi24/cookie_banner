# Cookie Banner

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![GDPR](https://img.shields.io/badge/GDPR-compliant-success.svg)
![Google Consent Mode](https://img.shields.io/badge/Google%20Consent%20Mode-V2-orange.svg)

Un sistema completo e professionale per la gestione dei cookie e compliance GDPR con supporto per Google Consent Mode V2 e Facebook Pixel.

## 📋 Caratteristiche Principali

### ✅ Compliance Normativa
- GDPR Compliant - Rispetta tutte le normative europee
- Google Consent Mode V2 - Supporto completo ai nuovi parametri 2024
- Consenso granulare - Gestione per categorie (Necessari, Statistici, Marketing)
- Opt-in per default - Tutti i cookie non necessari sono disattivati di default

### 🎯 Integrazione Servizi
- Google Analytics 4 - Con consent mode avanzato
- Facebook Pixel - Caricamento condizionale e tracking eventi
- Cleanup automatico - Rimozione cookie quando consenso revocato e blocco immediato tracking
- Estensibile - Facile aggiunta di nuovi servizi di tracking
- Link a Privacy e Cookie Policy

### 🔧 Funzionalità Tecniche
- Cache intelligente - Evita controlli ripetuti dei cookie
- Fallback adblocker - Gestione per utenti con ad blocker attivi
- Accessibilità completa - WCAG 2.1 AA compliant
- Responsive design - Ottimizzato per tutti i dispositivi

## 🏗️ Architettura

### Stack Tecnologico
- Frontend: HTML5, CSS3, Vanilla JavaScript ES6+
- Framework: React 18+ con Hooks
- Styling: CSS Modules + CSS Custom Properties
- Browser Support: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+

### Struttura Progetto
```
src/
├── components/
│   ├── CookieBanner.jsx          # Componente React principale
│   └── cookieBanner.module.css   # Stili CSS modularizzati
├── js/
│   └── cookieBanner.js           # Logica core JavaScript
└── index.html                    # Setup HTML base
```

## 🚀 Installazione e Setup

### 1. Setup Base HTML

Aggiungi nel `<head>` del tuo HTML:

```html
<!-- Google Consent Mode V2 - DEVE essere il primo script -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  
  gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',        // Nuovo parametro V2
    'ad_personalization': 'denied',  // Nuovo parametro V2
    'functionality_storage': 'granted',
    'personalization_storage': 'denied',
    'security_storage': 'granted'
  });
</script>

<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA4_ID"></script>
<script>
  gtag('js', new Date());
  gtag('config', 'YOUR_GA4_ID', {
    'send_page_view': false
  });
</script>
```

### 2. Integrazione React

```jsx
import CookieBanner from './components/CookieBanner';

function App() {
  return (
    <div className="App">
      <CookieBanner />
      {/* resto dell'applicazione */}
    </div>
  );
}
```

### 3. Configurazione

Nel file `cookieBanner.js`, configura i tuoi ID:

```javascript
// Google Analytics ID
src: 'https://www.googletagmanager.com/gtag/js?id=YOUR_GA4_ID'

// Facebook Pixel ID
fbq('init', 'YOUR_FACEBOOK_PIXEL_ID');
```

## ⚙️ Configurazione Avanzata

### Personalizzazione Categorie Cookie

```javascript
this.categories = {
  necessary: {
    name: 'Cookie Necessari',
    description: 'Essenziali per il funzionamento del sito...',
    checked: true,
    disabled: true
  },
  statistics: {
    name: 'Cookie Statistici', 
    description: 'Aiutano a capire come i visitatori interagiscono...',
    checked: false
  },
  marketing: {
    name: 'Cookie Marketing',
    description: 'Utilizzati per mostrare annunci pertinenti...',
    checked: false
  }
};
```

### Aggiunta Nuovi Servizi

```javascript
this.blockedScripts = {
  statistics: [
    {
      name: 'Hotjar',
      src: 'https://static.hotjar.com/c/hotjar-xxx.js',
      init: this.initHotjar.bind(this)
    }
  ],
  marketing: [
    {
      name: 'LinkedIn Insight',
      init: this.initLinkedIn.bind(this)
    }
  ]
};
```

## 🎯 Esempi d'Uso

### E-commerce

```javascript
// Tracking acquisti
cookieConsentManager.trackFacebookPurchase(99.99, 'EUR');

// Eventi personalizzati
cookieConsentManager.trackFacebookEvent('AddToCart', {
  content_name: 'Prodotto XYZ',
  value: 29.99,
  currency: 'EUR'
});
```

### Lead Generation

```javascript
// Form di contatto
function handleContactForm() {
  if (cookieConsentManager.categories.marketing.checked) {
    cookieConsentManager.trackFacebookLead();
  }
}
```

### Blog/Content Site

```javascript
// Tracking lettura articoli
cookieConsentManager.trackFacebookEvent('ViewContent', {
  content_type: 'article',
  content_name: document.title
});
```

## 📈 Roadmap

### v1.1
- [ ] Supporto lingue multiple (i18n)
- [ ] Server-side consent management

Made with ❤️ for GDPR compliance

⭐ Star questo repo se ti è stato utile!