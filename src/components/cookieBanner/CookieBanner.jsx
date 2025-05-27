import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./cookieBanner.module.css";
import { cookieConsentManager } from "../../js/cookieBanner";

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const [fallbackDismissed, setFallbackDismissed] = useState(false); // Stato per tracciare se l'utente ha chiuso il fallback
  const [isInitialized, setIsInitialized] = useState(false); // Nuovo stato per tracciare l'inizializzazione

  // Inizializza currentPreferences con una copia per evitare modifiche dirette all'oggetto originale di cookieConsentManager
  const [currentPreferences, setCurrentPreferences] = useState(() => {
    const initialPreferences = {};
    for (const key in cookieConsentManager.categories) {
      initialPreferences[key] = cookieConsentManager.categories[key].checked;
    }
    return initialPreferences;
  });

  const bannerRef = useRef(null);
  const modalRef = useRef(null);
  const originalOverflowRef = useRef("");
  const fallbackTimeoutRef = useRef(null);

  // Gestione iniziale della visibilità del banner e caricamento script
  useEffect(() => {
    // Forza il refresh della cache del consenso
    cookieConsentManager.refreshConsentCache();
    const hasValidConsent = cookieConsentManager.hasValidConsent();

    if (!hasValidConsent && !fallbackDismissed) {
      setShowBanner(true);
      setShowFallbackBanner(false);

      // Timer per rilevare se il banner viene bloccato
      fallbackTimeoutRef.current = setTimeout(() => {
        // Controlla se il banner è effettivamente visibile nel DOM
        const bannerElement = bannerRef.current;
        if (bannerElement) {
          const rect = bannerElement.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(bannerElement);
          const isVisible =
            rect.height > 0 &&
            rect.width > 0 &&
            computedStyle.display !== "none" &&
            computedStyle.visibility !== "hidden" &&
            computedStyle.opacity !== "0";

          if (!isVisible && !fallbackDismissed) {
            setShowFallbackBanner(true);
            setShowBanner(false);
          }
        } else if (!fallbackDismissed) {
          setShowFallbackBanner(true);
          setShowBanner(false);
        }
      }, 1000);
    } else if (hasValidConsent) {
      cookieConsentManager.loadConsentedScripts();
      setShowBanner(false);
      setShowFallbackBanner(false);
    } else if (fallbackDismissed) {
      setShowBanner(false);
      setShowFallbackBanner(false);
    }

    setIsInitialized(true);

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [fallbackDismissed]);

  // Gestione della visibilità e dell'accessibilità del banner
  useEffect(() => {
    const bannerElement = bannerRef.current;
    if (bannerElement) {
      // Quando showBanner è true, imposta aria-hidden a false. Altrimenti a true
      bannerElement.setAttribute("aria-hidden", !showBanner);

      // Gestione del focus per accessibilità
      if (showBanner) {
        // Imposta un timeout per assicurarti che il banner sia visibile prima di tentare di mettere a fuoco
        const timeoutId = setTimeout(() => {
          const acceptButton = bannerElement.querySelector("#accept-all-btn");
          if (acceptButton) {
            acceptButton.focus();
          } else {
            // Fallback al primo elemento focusable
            const firstFocusableElement = bannerElement.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusableElement) {
              firstFocusableElement.focus();
            }
          }
        }, 200); // Piccolo ritardo per l'animazione CSS
        return () => clearTimeout(timeoutId);
      }
    }
  }, [showBanner]);

  // Gestione della visibilità, dell'accessibilità e del blocco dello scroll del modal
  useEffect(() => {
    const modalElement = modalRef.current;

    if (showModal) {
      // Salva lo stato originale dell'overflow prima di modificarlo
      originalOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      if (modalElement) {
        modalElement.setAttribute("aria-hidden", "false");

        const timeoutId = setTimeout(() => {
          const firstFocusableElement = modalElement.querySelector(
            'button, input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusableElement) {
            firstFocusableElement.focus();
          }
        }, 300);

        return () => clearTimeout(timeoutId);
      }
    } else {
      // Ripristina sempre lo stato originale dell'overflow
      document.body.style.overflow = originalOverflowRef.current || "";

      if (modalElement) {
        modalElement.setAttribute("aria-hidden", "true");
      }
    }

    // Cleanup function per assicurarsi che l'overflow venga sempre ripristinato
    return () => {
      if (!showModal) {
        document.body.style.overflow = originalOverflowRef.current || "";
      }
    };
  }, [showModal]);

  // Assicurati che l'overflow del body venga sempre ripristinato quando il componente viene smontato
  useEffect(() => {
    return () => {
      document.body.style.overflow = originalOverflowRef.current || "";
    };
  }, []);

  // Sincronizza automaticamente le preferenze tra il componente e Google
  useEffect(() => {
    const handleConsentUpdate = () => {
      if (cookieConsentManager.checkConsentModeSupport) {
        cookieConsentManager.updateConsentMode();
      }
    };
    window.addEventListener('cookieConsentChanged', handleConsentUpdate);
    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentUpdate);
    };
  }, []);

  // Funzioni di gestione degli eventi
  const handleAcceptAll = useCallback(() => {
    const preferences = {
      necessary: true,
      statistics: true,
      marketing: true,
    };    
    cookieConsentManager.applyConsent(preferences);    
    // Log per analytics
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'cookie_consent_action', {
        'event_category': 'cookie_banner',
        'event_label': 'accept_all',
        'consent_method': 'banner_button'
      });
    }    
    setShowBanner(false);
    setShowFallbackBanner(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    const preferences = {
      necessary: true,
      statistics: false,
      marketing: false,
    };    
    cookieConsentManager.applyConsent(preferences);
    setShowBanner(false);
    setShowFallbackBanner(false);
  }, []);

  const handleCustomize = useCallback(() => {
    // Questa parte è la chiave: rilegge cookieConsentManager.categories OGNI VOLTA
    // che la funzione viene chiamata, quindi ottiene lo stato più aggiornato.
    const updatedPreferences = {};
    for (const key in cookieConsentManager.categories) {
      updatedPreferences[key] = cookieConsentManager.categories[key].checked;
    }
    setCurrentPreferences(updatedPreferences);
    setShowModal(true);
    setShowBanner(false);
    setShowFallbackBanner(false);
  }, []);

  const handleSavePreferences = useCallback(() => {
    const preferencesToSave = {
      ...currentPreferences,
      necessary: true,
    };    
    cookieConsentManager.applyConsent(preferencesToSave);

    // Log dettagliato
    if (typeof window.gtag === 'function' && preferencesToSave.statistics) {
      const acceptedCategories = Object.keys(preferencesToSave)
        .filter(key => preferencesToSave[key])
        .join(',');
        
      window.gtag('event', 'cookie_consent_action', {
        'event_category': 'cookie_banner',
        'event_label': 'customize_save',
        'consent_method': 'modal_customization',
        'accepted_categories': acceptedCategories
      });
    }

    document.body.style.overflow = originalOverflowRef.current || "";
    setShowModal(false);
    setShowFallbackBanner(false);
  }, [currentPreferences]);

  const handleToggleChange = useCallback((category) => {
    setCurrentPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleModalClose = useCallback(() => {
    // Forza il ripristino dell'overflow prima di chiudere la modale
    document.body.style.overflow = originalOverflowRef.current || "";
    setShowModal(false);
  }, []);

  const handleCloseFallback = useCallback(() => {
    setFallbackDismissed(true); // Marca il fallback come dismesso
    setShowFallbackBanner(false);
    setShowBanner(false); // Assicurati che anche il banner normale sia nascosto
  }, []);

  // Trap focus all'interno del modal per accessibilità
  const trapFocus = useCallback(
    (e) => {
      if (e.key === "Tab" && showModal && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, input:not([disabled]), select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [showModal]
  );

  // Chiusura modal con tasto escape e gestione focus trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showModal) {
        handleModalClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", trapFocus);
    };
  }, [showModal, handleModalClose, trapFocus]);

  // Mostra un loading se non è ancora inizializzato
  if (!isInitialized) {
    return null;
  }

  // Se sia il banner che il modal sono nascosti e non c'è il fallback banner e il fallback non è stato dismesso, mostra solo il pulsante flottante
  if (!showBanner && !showModal && !showFallbackBanner && !fallbackDismissed) {
    return (
      <button
        id="cookie-settings-btn"
        className={`${styles.cookieSettingsBtn} ${styles.show}`}
        onClick={handleCustomize}
        aria-label="Gestisci preferenze cookie"
        title="Gestisci Cookie"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
          <circle cx="16" cy="10" r="1" fill="currentColor" />
          <circle cx="10" cy="16" r="1" fill="currentColor" />
          <circle cx="16" cy="16" r="1" fill="currentColor" />
        </svg>
      </button>
    );
  }

  // Se il fallback è stato dismesso, non mostrare nulla
  if (fallbackDismissed && !showModal) {
    return null;
  }

  // Altrimenti, renderizza banner, modal o fallback banner
  return (
    <>
      {/* Wrapper condizionale per banner e modal */}
      {(showBanner || showModal) && (
        <div className={styles.cookieConsentWrapper}>
          {/* Cookie banner */}
          <div
            id="cookie-banner"
            ref={bannerRef}
            className={`${styles.cookieBanner} ${
              showBanner ? styles.show : ""
            }`}
            role="dialog"
            aria-labelledby="cookie-banner-title"
            aria-describedby="cookie-banner-description"
            aria-hidden={!showBanner}
          >
            <div className={styles.bannerContent}>
              <div className={styles.bannerText}>
                <p
                  id="cookie-banner-description"
                  className={`${styles.bannerDescription} ${styles.bannerLinks}`}
                >
                  Utilizziamo cookie e tecnologie simili per migliorare la tua
                  esperienza di navigazione, personalizzare contenuti e annunci
                  e analizzare il nostro traffico. Leggi la nostra{" "}
                  <a
                    href="/privacy-policy"
                    aria-label="Leggi la nostra Privacy Policy"
                  >
                    Privacy Policy
                  </a>{" "}
                  e
                  <a
                    href="/cookie-policy"
                    aria-label="Leggi la nostra Cookie Policy"
                  >
                    {" "}
                    Cookie Policy
                  </a>{" "}
                  per maggiori informazioni.
                </p>
              </div>
              <div className={styles.bannerActions}>
                <button
                  id="accept-all-btn"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleAcceptAll}
                  aria-label="Accetta tutti i cookie"
                  tabIndex="0"
                >
                  Accetta
                </button>
                <button
                  id="reject-all-btn"
                  className={`${styles.btn} ${styles.btnOutline}`}
                  onClick={handleRejectAll}
                  aria-label="Rifiuta cookie non essenziali"
                  tabIndex="0"
                >
                  Rifiuta
                </button>
                <button
                  id="customize-btn"
                  className={`${styles.btn} ${styles.btnOutline}`}
                  onClick={handleCustomize}
                  aria-label="Personalizza le preferenze cookie"
                  tabIndex="0"
                >
                  Personalizza
                </button>
              </div>
            </div>
          </div>

          {/* Preferenze cookie modal */}
          <div
            id="cookie-modal"
            ref={modalRef}
            className={`${styles.cookieModal} ${showModal ? styles.show : ""}`}
            role="dialog"
            aria-labelledby="modal-title"
            aria-hidden={!showModal}
            onClick={(e) => e.target === modalRef.current && handleModalClose()}
          >
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2 id="modal-title" className={styles.modalTitle}>
                  Gestione Cookie
                </h2>
              </div>
              <div className={styles.modalBody}>
                {/* Categoria cookie necessari */}
                <div className={styles.cookieCategory}>
                  <div className={styles.categoryHeader}>
                    <h3 className={styles.categoryTitle}>Cookie Necessari</h3>
                    <label className={styles.toggleSwitch}>
                      <input
                        type="checkbox"
                        id="necessary-toggle"
                        checked
                        disabled
                        aria-label="Cookie necessari sempre attivi"
                      />
                      <span className={styles.toggleSlider}></span>
                    </label>
                  </div>
                  <p className={styles.categoryDescription}>
                    Questi cookie sono essenziali per il corretto funzionamento
                    del sito web e non possono essere disattivati. Vengono
                    utilizzati per le funzionalità di base come la navigazione e
                    l'accesso alle aree sicure.
                  </p>
                </div>

                {/* Mappa le altre categorie dinamicamente */}
                {Object.keys(currentPreferences)
                  .filter((key) => key !== "necessary")
                  .map((categoryKey) => (
                    <div key={categoryKey} className={styles.cookieCategory}>
                      <div className={styles.categoryHeader}>
                        <h3 className={styles.categoryTitle}>
                          {cookieConsentManager.categories[categoryKey]?.name ||
                            categoryKey}
                        </h3>
                        <label className={styles.toggleSwitch}>
                          <input
                            type="checkbox"
                            name={categoryKey}
                            checked={currentPreferences[categoryKey]}
                            onChange={() => handleToggleChange(categoryKey)}
                            disabled={
                              cookieConsentManager.categories[categoryKey]
                                ?.disabled || false
                            }
                            aria-label={`Attiva/Disattiva cookie ${
                              cookieConsentManager.categories[categoryKey]
                                ?.name || categoryKey
                            }`}
                          />
                          <span className={styles.toggleSlider}></span>
                        </label>
                      </div>
                      <p className={styles.categoryDescription}>
                        {cookieConsentManager.categories[categoryKey]
                          ?.description || "Nessuna descrizione disponibile."}
                      </p>
                    </div>
                  ))}
              </div>
              <div className={styles.modalFooter}>
                <button
                  id="save-preferences-btn"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleSavePreferences}
                  aria-label="Salva le preferenze selezionate"
                  tabIndex="0"
                >
                  Salva Preferenze
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback banner per adblocker */}
      {showFallbackBanner && (
        <div className={styles.fallbackBanner}>
          <div className={styles.fallbackContent}>
            <p className={styles.fallbackText}>
              Il tuo browser o un'estensione sta bloccando la gestione dei
              cookie. Se vuoi personalizzare le tue preferenze sui cookie,
              disattiva temporaneamente il blocco dei contenuti nelle
              impostazioni del browser e ricarica la pagina.
            </p>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleCloseFallback}
              aria-label="Ho capito, chiudi messaggio"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieBanner;
