'use client';

import React from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

// Fix for Leaflet default icon issue in Next.js
if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

const MapEvents = ({ onMoveEnd }) => {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      onMoveEnd(center.lat, center.lng);
    },
  });
  return null;
};

export default function VendorMap({ center, onMoveEnd }) {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={17}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapEvents onMoveEnd={onMoveEnd} />
      </MapContainer>

      {/* Fixed Center Pin Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center pb-8 z-[1000]">
         <div className="relative">
            <MapPin className="w-10 h-10 text-[#005596] drop-shadow-lg animate-bounce" fill="white" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/20 rounded-full blur-[1px]" />
         </div>
      </div>
    </div>
  );
}
