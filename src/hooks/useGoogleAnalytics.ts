import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Declare gtag function for TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

// Initialize Google Analytics
export const initGoogleAnalytics = (measurementId: string) => {
  // Only initialize if not already initialized
  if (window.gtag) {
    return;
  }

  // Create dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_path: window.location.pathname,
  });

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
};

// Hook to track page views
export const useGoogleAnalytics = (measurementId: string | undefined) => {
  const location = useLocation();

  useEffect(() => {
    // Wait a bit to ensure the page title is updated (especially for dynamic titles)
    const timeoutId = setTimeout(() => {
      // If GA is already initialized (e.g., via script in HTML), just track page views
      if (window.gtag) {
        // Track page view on route change
        const id = measurementId || 'G-DP24YS8WVN'; // Use provided ID or fallback to HTML script ID
        const pagePath = location.pathname + location.search;
        const pageTitle = document.title || location.pathname;
        const pageLocation = window.location.href;
        
        // Track the page view with config (updates the current page)
        window.gtag('config', id, {
          page_path: pagePath,
          page_title: pageTitle,
          page_location: pageLocation,
        });
        
        // Also send a page_view event for better tracking in GA4
        window.gtag('event', 'page_view', {
          page_path: pagePath,
          page_title: pageTitle,
          page_location: pageLocation,
        });
        
        // Log for debugging (remove in production if desired)
        if (import.meta.env.DEV) {
          console.log('[GA] Page view tracked:', { pagePath, pageTitle });
        }
        
        return;
      }

      // If not initialized and measurementId is provided, initialize it
      if (measurementId) {
        initGoogleAnalytics(measurementId);
      }
    }, 150); // Small delay to ensure page title is updated

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search, measurementId]);
};

// Helper function to track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Helper function to track conversions
export const trackConversion = (conversionId: string, value?: number, currency?: string) => {
  if (window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: conversionId,
      value: value,
      currency: currency || 'EUR',
    });
  }
};

