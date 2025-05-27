class CookieConsent {
    constructor() {
        // Configurazione Consent Mode V2
        this.consentModeConfig = {
            default: {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',        
                'ad_personalization': 'denied',  
                'functionality_storage': 'granted',
                'personalization_storage': 'denied',
                'security_storage': 'granted'
            },
            categoryMapping: {
                statistics: ['analytics_storage'],
                marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
                necessary: ['functionality_storage', 'security_storage']
            }
        };
        // 'checked' verrà sovrascritto da loadPreferences se un consenso è già presente
        this.categories = {
            necessary: {
                name: 'Necessari',
                description: 'Questi cookie sono essenziali per il corretto funzionamento del sito web e non possono essere disattivati. Vengono utilizzati per le funzionalità di base come la navigazione e l\'accesso alle aree sicure.',
                checked: true, // Sempre attivi per default
                disabled: true // Non modificabile dall'utente
            },
            statistics: {
                name: 'Statistici',
                description: 'Questi cookie ci aiutano a capire come i visitatori interagiscono con il sito raccogliendo informazioni in forma anonima. Include servizi come Google Analytics.',
                checked: false // Off per default, ma sovrascritto da loadPreferences
            },
            marketing: {
                name: 'Marketing',
                description: 'Questi cookie vengono utilizzati per mostrare annunci pubblicitari pertinenti e per misurare l\'efficacia delle campagne. Include servizi come Facebook Pixel e Google Ads.',
                checked: false // Off per default, ma sovrascritto da loadPreferences
            }
        };

        this.cookieName = 'cookie-consent-preferences'; // Nome del cookie per le preferenze
        this.consentDuration = 180; // Durata del consenso in giorni
        
        // Cache per evitare controlli ripetuti dei cookie
        this._consentCache = null;
        this._cacheTimestamp = null;
        this._cacheExpiry = 5000; // Cache valida per 5 secondi

        // Script bloccati per categoria
        this.blockedScripts = {
            statistics: [
                {
                    name: 'Google Analytics',
                    src: 'https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID', // Sostituisci con il tuo ID reale
                    init: this.initGoogleAnalytics.bind(this)
                }
            ],
            marketing: [
                {
                    name: 'Facebook Pixel',
                    init: this.initFacebookPixel.bind(this)
                },                
            ]
        };

        // Carica le preferenze all'inizializzazione dell'istanza
        // Questo popolerà this.categories.checked con i valori salvati se validi
        this.loadPreferences();
    }


    /**
     * Aggiorna Google Consent Mode basato sulle preferenze correnti
     */
    updateConsentMode() {
        if (typeof window.gtag !== 'function') {
            console.warn('gtag non disponibile per aggiornamento consent mode');
            return;
        }
        const consentUpdate = {};        
        Object.keys(this.consentModeConfig.categoryMapping).forEach(category => {
            const isGranted = this.categories[category]?.checked || false;
            const consentValue = isGranted ? 'granted' : 'denied';
            
            this.consentModeConfig.categoryMapping[category].forEach(param => {
                consentUpdate[param] = consentValue;
            });
        });
        // Aggiorna il consent mode con i nuovi valori
        window.gtag('consent', 'update', consentUpdate);
        if (window.fbq && this.categories.marketing?.checked) {
        // Se marketing è attivo e Facebook Pixel esiste, riattivalo
        if (typeof window.fbq === 'function' && window.fbq.queue) {
            console.log('Facebook Pixel riattivato con consenso marketing');
        }
    }
    }
      /**
     * Legge un cookie specifico
     * @param {string} name - Nome del cookie da leggere
     * @returns {string|null} Valore del cookie o null se non esiste
     */
    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    /**
     * Imposta un cookie con scadenza
     * @param {string} name - Nome del cookie
     * @param {string} value - Valore del cookie
     * @param {number} days - Giorni di validità
     */
    setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }

    /**
     * Carica le preferenze dai cookie e aggiorna lo stato interno delle categorie.
     * @returns {boolean} True se le preferenze sono state caricate e sono ancora valide, false altrimenti.
     */
    loadPreferences() {
        try {
            const cookieValue = this.getCookie(this.cookieName);
            if (cookieValue) {
                const data = JSON.parse(decodeURIComponent(cookieValue));
                // Verifica se il consenso è ancora valido per la durata specificata
                if (data.timestamp && (Date.now() - data.timestamp) < (this.consentDuration * 24 * 60 * 60 * 1000)) {
                    // Aggiorna la proprietà 'checked' delle categorie esistenti con le preferenze salvate
                    Object.keys(data.preferences).forEach(catKey => {
                        if (this.categories[catKey] && !this.categories[catKey].disabled) {
                            // Assicurati che il valore sia un booleano
                            this.categories[catKey].checked = !!data.preferences[catKey].checked;
                        }
                    });                    
                    // Aggiorna la cache
                    this._consentCache = true;
                    this._cacheTimestamp = Date.now();                    
                    return true;
                }
            }
        } catch (error) {
            console.warn('Errore nel caricamento delle preferenze cookie:', error);
        }        
        // Se non ci sono preferenze valide, le categorie rimangono ai valori di default (necessary: true, altri: false)
        this._consentCache = false;
        this._cacheTimestamp = Date.now();
        return false;
    }
    /**
     * Salva le preferenze aggiornate nei cookie.
     * Questa funzione viene chiamata dal componente React.
     * @param {Object} newPreferences - Un oggetto con le preferenze aggiornate (es. { necessary: true, statistics: false, marketing: true }).
     * Il componente React dovrebbe passare solo i booleani 'checked'.
     */
    savePreferences(newPreferences) {
        try {
            // Aggiorna lo stato 'checked' delle categorie interne della classe con i nuovi valori
            Object.keys(this.categories).forEach(catKey => {
                if (newPreferences[catKey] !== undefined) {
                    // Assicurati che il valore sia un booleano e rispetta il disabled
                    this.categories[catKey].checked = this.categories[catKey].disabled ? true : !!newPreferences[catKey];
                }
            });

            // Prepara i dati da salvare nel cookie
            const dataToStore = {
                preferences: {},
                timestamp: Date.now(),
                version: '1.0' // Utile per future migrazioni della struttura
            };
            Object.keys(this.categories).forEach(catKey => {
                dataToStore.preferences[catKey] = {
                    checked: this.categories[catKey].checked
                };
            });

            // Salva nei cookie invece che nel localStorage
            this.setCookie(this.cookieName, encodeURIComponent(JSON.stringify(dataToStore)), this.consentDuration);

            // Aggiorna la cache
            this._consentCache = true;
            this._cacheTimestamp = Date.now();

            // Notifica il componente React o altri moduli che le preferenze sono cambiate
            window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
                detail: dataToStore.preferences
            }));
        } catch (error) {
            console.error('Errore nel salvataggio delle preferenze cookie:', error);
        }
    }

    /**
     * Verifica se esiste un consenso valido basato sulle preferenze caricate.
     * @returns {boolean} True se un consenso valido è stato caricato, false altrimenti.
     */
    hasValidConsent() {
        // Usa la cache se è ancora valida per evitare controlli ripetuti dei cookie
        const now = Date.now();
        if (this._consentCache !== null && 
            this._cacheTimestamp !== null && 
            (now - this._cacheTimestamp) < this._cacheExpiry) {
            return this._consentCache;
        }

        // Se la cache è scaduta o non esiste, ricarica le preferenze
        return this.loadPreferences();
    }

    /**
     * Forza il refresh della cache del consenso
     */
    refreshConsentCache() {
        this._consentCache = null;
        this._cacheTimestamp = null;
        return this.hasValidConsent();
    }

    /**
     * Applica il consenso in base alle preferenze attuali.
     * Questo metodo viene chiamato dal componente React.
     * @param {Object} preferencesFromReact - L'oggetto delle preferenze passato dal componente React
     * (es. { necessary: true, statistics: false, marketing: true }).
     */
    applyConsent(preferencesFromReact) {
        this.savePreferences(preferencesFromReact); // Salva le preferenze aggiornate
        this.updateConsentMode(); // Aggiorna Google Consent Mode V2 con le nuove preferenze
        this.loadConsentedScripts(); // Carica gli script ora consentiti
        this.cleanupUnconsentedCookies(); // Pulisce i cookie non più consentiti
    }

    /**
     * Carica gli script di terze parti per le categorie di cookie per cui è stato dato il consenso.
     */
    loadConsentedScripts() {
    Object.keys(this.blockedScripts).forEach(category => {
        if (this.categories[category] && this.categories[category].checked) {
            
            if (category === 'marketing' && window._fbq_original) {
                window.fbq = window._fbq_original;
            }            
            this.blockedScripts[category].forEach(script => {
                if (script.src && !document.querySelector(`script[src="${script.src}"]`)) {
                    this.loadScript(script);
                } else if (!script.src && script.init) {
                    script.init();
                }
            });
        }
    });
}

    /**
     * Carica un singolo script esterno o esegue una funzione di inizializzazione.
     * @param {Object} scriptConfig - Oggetto contenente 'name', 'src' (opzionale) e 'init' (opzionale).
     */
    loadScript(scriptConfig) {
        try {
            if (scriptConfig.src) {
                const script = document.createElement('script');
                script.src = scriptConfig.src;
                script.async = true; // Caricamento asincrono
                script.onload = () => {
                    // Esegue la funzione di inizializzazione una volta che lo script è caricato
                    if (scriptConfig.init) {
                        scriptConfig.init();
                    }
                };
                document.head.appendChild(script);
            } else if (scriptConfig.init) {
                // Se non c'è un src, esegue direttamente la funzione di inizializzazione
                scriptConfig.init();
            }
        } catch (error) {
            console.error(`Errore nel caricamento dello script ${scriptConfig.name}:`, error);
        }
    }

    /**
     * Pulisce i cookie associati alle categorie per cui il consenso è stato revocato.
     */
    cleanupUnconsentedCookies() {
        const cookiesToClean = {
            statistics: [
                '_ga', '_gid', '_gat', '_gtag', 
                '_ga_*', '_gat_gtag_*', '_gat_UA-*', // Pattern per GA4 e Universal Analytics
                'gtag', 'ga', 'gid'
            ],
            marketing: ['_fbp', '_fbc', 'fr', '_gcl_au', 'fbevents', 'datr', 'sb', 'c_user']
        };

        Object.keys(cookiesToClean).forEach(category => {
            // Se la categoria non è consentita (o non esiste o 'checked' è false)
            if (!this.categories[category] || !this.categories[category].checked) {
                cookiesToClean[category].forEach(cookieName => {
                    // Gestisce pattern con wildcard
                    if (cookieName.includes('*')) {
                        this.deleteMatchingCookies(cookieName.replace('*', ''));
                    } else {
                        this.deleteCookie(cookieName);
                    }
                });
                
                // Per Google Analytics, ferma anche il tracking in corso
                if (category === 'statistics' && window.gtag) {
                    // Disabilita GA4 tracking
                    window.gtag('consent', 'update', {
                        'analytics_storage': 'denied'
                    });
                }
            }
        });
    }

    /**
     * Elimina tutti i cookie che iniziano con un determinato prefisso
     * @param {string} prefix - Il prefisso del cookie da cercare
     */
    deleteMatchingCookies(prefix) {
        // Ottieni tutti i cookie
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
            const [name] = cookie.trim().split('=');
            if (name.startsWith(prefix)) {
                this.deleteCookie(name);
            }
        });
    }

    /**
     * Elimina un cookie specifico impostando la sua data di scadenza nel passato.
     * Tenta di eliminare il cookie per diversi path/domain per massima copertura.
     * @param {string} name - Il nome del cookie da eliminare.
     */
    deleteCookie(name) {
        const hostname = window.location.hostname;
        const domain = hostname.startsWith('www.') ? hostname.substring(4) : hostname;
        
        // Array di configurazioni per eliminare il cookie da tutti i possibili path/domain
        const deletionConfigs = [
            // Path principale
            { path: '/', domain: '' },
            { path: '/', domain: '; domain=' + hostname },
            { path: '/', domain: '; domain=.' + hostname },
            { path: '/', domain: '; domain=' + domain },
            { path: '/', domain: '; domain=.' + domain },
            // Root path
            { path: '', domain: '' },
            { path: '', domain: '; domain=' + hostname },
            { path: '', domain: '; domain=.' + hostname }
        ];
        
        deletionConfigs.forEach(config => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${config.path}${config.domain}; SameSite=Lax`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${config.path}${config.domain}; SameSite=None; Secure`;
        });
    }

    // ==========================================
    // Funzioni di inizializzazione degli script di terze parti
    // ==========================================

    /**
     * Inizializza Google Analytics con supporto per consent mode.
     */
    initGoogleAnalytics() {   
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
            'page_title': document.title,
            'page_location': window.location.href,
            'consent_mode_version': 'v2'
        });
    }
}
   /**
     * Inizializza Facebook Pixel con il tuo ID
     */
    /**
 * Inizializza Facebook Pixel con il tuo ID
 */
initFacebookPixel() {
    if (window.fbq) {
        return;
    }

    /* eslint-disable */
    // Codice Facebook Pixel 
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', 'YOUR_PIXEL_ID'); // Sostituisci con il tuo ID Pixel
    window.fbq('track', 'PageView');
    }
}
export const cookieConsentManager = new CookieConsent();