import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface MapProps {
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
    driverLat?: number;
    driverLng?: number;
    isTracking?: boolean; // Changes the focus of the map

    // Explicit endpoints for tracking route (overrides default pickup -> dropoff)
    routeStartLat?: number;
    routeStartLng?: number;
    routeEndLat?: number;
    routeEndLng?: number;

    centerOnDriver?: boolean; // When true, auto-fly to driver GPS on first fix
    onRecenterReady?: (recenterFn: () => void) => void; // Exposes a manual re-center function
    onMapClick?: (lat: number, lng: number) => void;
    onRouteCalculated?: (distanceMiles: number, durationMins: number) => void;
}

export default function TripMap({
    pickupLat, pickupLng,
    dropoffLat, dropoffLng,
    driverLat, driverLng,
    isTracking = false,
    centerOnDriver = false,
    routeStartLat, routeStartLng, routeEndLat, routeEndLng,
    onRecenterReady,
    onMapClick,
    onRouteCalculated
}: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const driverMarker = useRef<mapboxgl.Marker | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const hasCenteredOnDriver = useRef(false);
    const onMapClickRef = useRef(onMapClick);
    const onRouteCalculatedRef = useRef(onRouteCalculated);

    useEffect(() => {
        onMapClickRef.current = onMapClick;
    }, [onMapClick]);

    useEffect(() => {
        onRouteCalculatedRef.current = onRouteCalculated;
    }, [onRouteCalculated]);

    // Fetch actual driving route from Mapbox Directions API
    const getDrivingRoute = async (start: [number, number], end: [number, number]) => {
        try {
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
            );
            const json = await query.json();

            if (!json.routes || json.routes.length === 0) {
                console.warn("Mapbox returned no routes. Falling back to straight line.", json);
                return {
                    type: 'Feature' as const,
                    properties: {},
                    geometry: {
                        type: 'LineString' as const,
                        coordinates: [start, end]
                    }
                };
            }

            const data = json.routes[0];
            const route = data.geometry.coordinates;

            if (onRouteCalculatedRef.current) {
                const distanceMiles = data.distance * 0.000621371; // meters to miles
                const durationMins = data.duration / 60; // seconds to mins
                onRouteCalculatedRef.current(distanceMiles, durationMins);
            }

            return {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                    type: 'LineString' as const,
                    coordinates: route
                }
            };
        } catch (err) {
            console.error("Failed to fetch route", err);
            // Fallback to straight line if API fails
            return {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                    type: 'LineString' as const,
                    coordinates: [start, end]
                }
            };
        }
    };

    // Initialize Map and static markers
    useEffect(() => {
        if (!mapContainer.current) return;
        if (map.current) return;

        const initLng = pickupLng || -74.0060;
        const initLat = pickupLat || 40.7128;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/standard', // Utilizing Mapbox Standard style
            center: [initLng, initLat],
            zoom: 14,
            pitch: 60,
            bearing: -17,
            antialias: true
        });

        const mapInstance = map.current;

        mapInstance.on('click', (e) => {
            if (onMapClickRef.current) {
                onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
            }
        });

        mapInstance.on('load', () => {
            setMapLoaded(true);
            // Pickup marker — pulsing green dot
            if (pickupLat && pickupLng) {
                const el = document.createElement('div');
                el.className = 'custom-marker pickup-marker';
                el.innerHTML = `
                    <div style="position:relative;width:20px;height:20px">
                        <div style="position:absolute;inset:0;background:#10b981;border-radius:50%;opacity:0.3;animation:markerPulse 2s ease-out infinite"></div>
                        <div style="position:absolute;inset:4px;background:#10b981;border-radius:50%;border:2px solid white;box-shadow:0 0 12px rgba(16,185,129,0.8)"></div>
                    </div>
                `;
                new mapboxgl.Marker(el)
                    .setLngLat([pickupLng, pickupLat])
                    .addTo(mapInstance);
            }

            // Dropoff marker — pulsing gold dot
            if (dropoffLat && dropoffLng) {
                const el = document.createElement('div');
                el.className = 'custom-marker dropoff-marker';
                el.innerHTML = `
                    <div style="position:relative;width:20px;height:20px">
                        <div style="position:absolute;inset:0;background:#ebb305;border-radius:50%;opacity:0.3;animation:markerPulse 2s ease-out infinite 0.5s"></div>
                        <div style="position:absolute;inset:4px;background:#ebb305;border-radius:50%;border:2px solid white;box-shadow:0 0 12px rgba(235,179,5,0.8)"></div>
                    </div>
                `;
                new mapboxgl.Marker(el)
                    .setLngLat([dropoffLng, dropoffLat])
                    .addTo(mapInstance);
            }

            // Inject pulse animation keyframes
            if (!document.getElementById('marker-pulse-style')) {
                const style = document.createElement('style');
                style.id = 'marker-pulse-style';
                style.textContent = `
                    @keyframes markerPulse {
                        0% { transform: scale(1); opacity: 0.4; }
                        100% { transform: scale(2.8); opacity: 0; }
                    }
                    @keyframes driverPulse {
                        0% { transform: scale(1); opacity: 0.5; }
                        100% { transform: scale(3); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }

            // 3D Terrain (Digital Elevation Model)
            mapInstance.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });
            mapInstance.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

            // Note: Mapbox Standard style natively handles 3D buildings, landmarks, 
            // sky, and fog with dynamic lighting.

            // Mapbox Standard Configuration
            // You can change 'lightPreset' to: 'dawn', 'day', 'dusk', or 'night'
            mapInstance.setConfigProperty('basemap', 'lightPreset', 'dusk');
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [pickupLat, pickupLng, dropoffLat, dropoffLng, isTracking]);

    // Handle Route Lines Reactively
    useEffect(() => {
        if (!mapLoaded || !map.current) return;

        let start: [number, number] | null = null;
        let end: [number, number] | null = null;

        if (routeStartLat && routeStartLng && routeEndLat && routeEndLng) {
            start = [routeStartLng, routeStartLat];
            end = [routeEndLng, routeEndLat];
        } else if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
            start = [pickupLng, pickupLat];
            end = [dropoffLng, dropoffLat];
        }

        if (start && end) {
            const mapInstance = map.current;
            getDrivingRoute(start, end).then((route) => {
                if (!mapInstance.getSource('route')) {
                    mapInstance.addSource('route', {
                        type: 'geojson',
                        data: route
                    });

                    // Route glow shadow layer
                    mapInstance.addLayer({
                        id: 'route-glow',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#ef4444', // Red-500
                            'line-width': 12,
                            'line-opacity': 0.25,
                            'line-blur': 8
                        }
                    });

                    // Main route line
                    mapInstance.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': '#dc2626', // Red-600
                            'line-width': 4,
                            'line-opacity': 0.9
                        }
                    });
                } else {
                    (mapInstance.getSource('route') as mapboxgl.GeoJSONSource).setData(route);
                }

                // Auto-fit bounds
                const bounds = new mapboxgl.LngLatBounds();
                if (start) bounds.extend(start);
                if (end) bounds.extend(end);

                // Also optionally include driver in bounds
                if (driverLat && driverLng) {
                    bounds.extend([driverLng, driverLat]);
                }

                const padding = isTracking
                    ? { top: 100, bottom: 100, left: 100, right: 450 }
                    : { top: 100, bottom: 100, left: 450, right: 100 };

                mapInstance.fitBounds(bounds, { padding, maxZoom: 15 });
            });
        }
    }, [mapLoaded, routeStartLat, routeStartLng, routeEndLat, routeEndLng, pickupLat, pickupLng, dropoffLat, dropoffLng, driverLat, driverLng, isTracking]);

    // Handle real-time Driver Marker updates
    useEffect(() => {
        if (!map.current || !driverLat || !driverLng) return;

        if (!driverMarker.current) {
            const el = document.createElement('div');
            el.className = 'driver-marker';
            el.innerHTML = `
                <div style="position:relative;width:32px;height:32px">
                    <div style="position:absolute;inset:0;background:#ebb305;border-radius:50%;opacity:0.3;animation:driverPulse 1.5s ease-out infinite"></div>
                    <div style="position:absolute;inset:4px;background:white;border-radius:50%;border:3px solid #ebb305;box-shadow:0 0 16px rgba(235,179,5,0.7)"></div>
                </div>
            `;

            driverMarker.current = new mapboxgl.Marker(el)
                .setLngLat([driverLng, driverLat])
                .addTo(map.current);
        } else {
            driverMarker.current.setLngLat([driverLng, driverLat]);
        }

    }, [driverLat, driverLng]);

    // ── Auto-fly to driver's GPS when centerOnDriver becomes true ──
    useEffect(() => {
        if (!centerOnDriver) {
            // Reset so next time driver goes online it will re-center
            hasCenteredOnDriver.current = false;
            return;
        }
        if (hasCenteredOnDriver.current) return;
        if (!map.current || !driverLat || !driverLng) return;

        hasCenteredOnDriver.current = true;
        map.current.flyTo({
            center: [driverLng, driverLat],
            zoom: 14,
            pitch: 45,
            duration: 2000
        });
    }, [centerOnDriver, driverLat, driverLng]);

    // ── Expose manual re-center function to parent ──
    const recenterOnDriver = useCallback(() => {
        if (!map.current || !driverLat || !driverLng) return;
        map.current.flyTo({
            center: [driverLng, driverLat],
            zoom: 15,
            pitch: 45,
            duration: 1200
        });
    }, [driverLat, driverLng]);

    useEffect(() => {
        if (onRecenterReady) {
            onRecenterReady(recenterOnDriver);
        }
    }, [recenterOnDriver, onRecenterReady]);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* Vignette / Gradient overlay for cinematic dark feel */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle at center, transparent 40%, rgba(10, 14, 26, 0.6) 100%)',
                pointerEvents: 'none',
                zIndex: 1
            }} />
        </div>
    );
}
