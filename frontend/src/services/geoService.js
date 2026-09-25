/**
 * Service de géolocalisation et recherche d'adresses (OpenStreetMap Nominatim + IP fallback)
 */

// Cache de localisation pour éviter des requêtes répétées
let cachedUserLocation = null;

/**
 * Détecte la position géographique de l'utilisateur.
 * Priorité 1: GPS navigateur (navigator.geolocation)
 * Priorité 2: Détection IP rapide (ipwho.is)
 * Fallback: Cotonou [6.3653, 2.4183] (au lieu d'un centre par défaut lointain)
 */
export async function detectUserLocation() {
  if (cachedUserLocation) return cachedUserLocation;

  // 1. Tenter le GPS navigateur (timeout de 3 secondes pour ne pas bloquer l'interface)
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    const gpsLocation = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 3500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            source: 'gps',
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 }
      );
    });

    if (gpsLocation) {
      cachedUserLocation = gpsLocation;
      return gpsLocation;
    }
  }

  // 2. Fallback via IP (très précis pour la ville/pays sans demander de permission)
  try {
    const res = await fetch('https://ipwho.is/', { cache: 'force-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude) {
        const ipLocation = {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city,
          country: data.country,
          source: 'ip',
        };
        cachedUserLocation = ipLocation;
        return ipLocation;
      }
    }
  } catch (_) {
    // ignore network error
  }

  // 3. Fallback sécurisé
  const fallback = { lat: 6.3653, lng: 2.4183, city: 'Cotonou', country: 'Bénin', source: 'default' };
  cachedUserLocation = fallback;
  return fallback;
}

/**
 * Reverse geocoding : Convertit (lat, lng) en nom de ville, quartier ou adresse.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
        'User-Agent': 'TrouveMoiApp/1.0',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};

    const quartier = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district;
    const ville = addr.city || addr.town || addr.village || addr.municipality;
    const pays = addr.country;

    // Construction d'un nom court et pertinent pour le champ Ville / Quartier
    let shortCity = '';
    if (quartier && ville && quartier !== ville) {
      shortCity = `${quartier}, ${ville}`;
    } else if (ville) {
      shortCity = ville;
    } else if (quartier) {
      shortCity = quartier;
    } else if (data.name) {
      shortCity = data.name;
    } else if (pays) {
      shortCity = pays;
    }

    return {
      displayName: data.display_name,
      city: shortCity,
      fullAddress: addr,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Recherche de lieux et adresses avec autocomplétion
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'fr,fr-FR;q=0.9,en;q=0.8',
        'User-Agent': 'TrouveMoiApp/1.0',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item) => {
      const addr = item.address || {};
      const quartier = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district;
      const ville = addr.city || addr.town || addr.village || addr.municipality;
      const shortCity = quartier && ville && quartier !== ville ? `${quartier}, ${ville}` : (ville || item.name);
      return {
        id: item.place_id,
        label: item.display_name,
        city: shortCity,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });
  } catch (_) {
    return [];
  }
}
