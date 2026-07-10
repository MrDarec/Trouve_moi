import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCategoryIcon } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';

// Fix default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (type) => {
  const color = type === 'lost' ? '#f97316' : '#10b981';
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

      const icon = createIcon(item.type);
      const marker = L.marker([lat, lng], { icon });
      const emoji = getCategoryIcon(item.category);

      marker.bindPopup(`
        <div style="min-width:180px;font-family:Inter,sans-serif;">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${emoji} ${item.title}</div>
          <div style="font-size:11px;color:${item.type === 'lost' ? '#f97316' : '#10b981'};font-weight:500;margin-bottom:6px;">
            ${item.type === 'lost' ? '🔴 Perdu' : '🟢 Trouvé'}
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${item.city ?? ''}</div>
          <a href="/items/${item._id}" style="font-size:11px;color:#8b5cf6;font-weight:600;">Voir le détail →</a>
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
