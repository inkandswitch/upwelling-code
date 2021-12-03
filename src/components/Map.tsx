import React, { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { nanoid } from 'nanoid';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Feature } from '../types';
mapboxgl.accessToken = 'pk.eyJ1Ijoia3JtY2tlbHYiLCJhIjoiY2lxbHpscXo5MDBlMGdpamZnN21mOXF3MCJ9.BtXlq8OmTEM8fHqWuxicPQ';

type MapProps = {
  features: any,
  onChangeText: (id: string, e: Event) => void,
  onMapChange: (features: Feature) => void 
}

export function Map(props: MapProps) {
  const mapRef = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(0);
  const [lat, setLat] = useState(0);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (!mapRef.current) return; // wait for map to initialize
    //@ts-ignore
    let map: mapboxgl.Map = mapRef.current
    map.on('move', () => {
      setLng(map.getCenter().lng);
      setLat(map.getCenter().lat);
      setZoom(map.getZoom());
    });
  });

  useEffect(() => {
    if (mapRef.current) return; // initialize map only once
    let map = new mapboxgl.Map({
      //@ts-ignore
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      doubleClickZoom: false,
      zoom: zoom
    });

    map.on('dblclick', (e) => {
      const coordinates = e.lngLat
      let feature = {
        id: nanoid(),
        lng: coordinates.lng,
        lat: coordinates.lat,
        description: '',
      }  
      renderFeatures([feature])
      props.onMapChange(feature)
    })

    //@ts-ignore
    mapRef.current = map
    renderFeatures(props.features)
  }, [])

  useEffect(() => {
    renderFeatures(props.features)
  }, [props.features])

  function renderFeatures(features: Feature[]) {
    for (const feature of features) {
      // create a HTML element for each feature
      const el = document.createElement('div');
      el.className = 'marker';

      let dom = document.createElement('textarea')
      dom.value = feature.description?.toString() || ''
      dom.oninput = (e: Event) => {
        props.onChangeText(feature.id, e)
      }
      let popup = new mapboxgl.Popup({ offset: 25 })
        .setDOMContent(dom)
      new mapboxgl.Marker(el)
        .setLngLat([feature.lng, feature.lat])
        .setPopup(popup)
        //@ts-ignore
        .addTo(mapRef.current);
    }
  }

  return (
      <div ref={mapContainer} className="map-container" />
  );

}