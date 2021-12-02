import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1Ijoia3JtY2tlbHYiLCJhIjoiY2lxbHpscXo5MDBlMGdpamZnN21mOXF3MCJ9.BtXlq8OmTEM8fHqWuxicPQ';

type MapProps = {
  onChange: () => void 
}

export function Map(props: MapProps) {
  const map = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(-70.9);
  const [lat, setLat] = useState(42.35);
  const [zoom, setZoom] = useState(9);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    //@ts-ignore
    map.current = new mapboxgl.Map({
      //@ts-ignore
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom
    });
  })

  return <div>
    <div ref={mapContainer} className="map-container" />
  </div>

}