import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategoryLabel } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (type) => {
  const color = type === 'lost' ? '#d97706' : '#059669';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path d="M15 0C6.72 0 0 6.72 0 15c0 11.25 15 27 15 27s15-15.75 15-27C30 6.72 23.28 0 15 0z" fill="${color}" opacity="0.95"/>
      <circle cx="15" cy="15" r="8" fill="white" opacity="0.3"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
    className: '',
  });
};

export default function MapView({
  items = [],
  center = [14.6928, -17.4467], // Dakar by default
  zoom = 12,
  height = '400px',
  onLocationSelect,
  selectedLocation = null,
  interactive = true,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: interactive,
      dragging: interactive,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    if (onLocationSelect) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat, lng });
        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.setLatLng([lat, lng]);
        } else {
          selectedMarkerRef.current = L.marker([lat, lng]).addTo(map);
        }
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when items change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerLayerRef.current) {
      markerLayerRef.current.clearLayers();
    } else {
      markerLayerRef.current = L.layerGroup().addTo(map);
    }

    items.forEach((item) => {
      const coords = item.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const [lng, lat] = coords;

      const catLabel = getCategoryLabel(item.category);
      const isLost = item.type === 'lost';
      const badgeBg = isLost ? 'rgba(217, 119, 6, 0.12)' : 'rgba(5, 150, 105, 0.12)';
      const badgeColor = isLost ? '#b45309' : '#047857';
      const badgeBorder = isLost ? 'rgba(217, 119, 6, 0.25)' : 'rgba(5, 150, 105, 0.25)';

      marker.bindPopup(`
        <div style="min-width:180px;font-family:Inter,system-ui,sans-serif;padding:3px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;background:${badgeBg};color:${badgeColor};border:1px solid ${badgeBorder};text-transform:uppercase;letter-spacing:0.04em;">
              ${isLost ? 'Perdu' : 'Trouvé'}
            </span>
            <span style="font-size:11px;color:#64748b;font-weight:500;">${catLabel}</span>
          </div>
          <div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:4px;line-height:1.35;">${item.title}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:8px;">${item.city ?? ''}</div>
          <a href="/items/${item._id}" style="font-size:11px;color:#0284c7;font-weight:600;text-decoration:none;">Voir le détail &rarr;</a>
        </div>
      `);
      marker.addTo(markerLayerRef.current);
    });
  }, [items]);

  // Update selected location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocation) return;
    const { lat, lng } = selectedLocation;
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setLatLng([lat, lng]);
    } else {
      selectedMarkerRef.current = L.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [selectedLocation]);

  return (
    <div
      ref={mapRef}
      className="rounded-2xl overflow-hidden border border-slate-800"
      style={{ height, width: '100%' }}
    />
  );
}
