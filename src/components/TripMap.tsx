import { useEffect, useRef } from 'react';
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
    onMapClick?: (lat: number, lng: number) => void;
    onRouteCalculated?: (distanceMiles: number, durationMins: number) => void;
}

export default function TripMap({
    pickupLat, pickupLng,
    dropoffLat, dropoffLng,
    driverLat, driverLng,
    isTracking = false,
    onMapClick,
    onRouteCalculated
}: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const driverMarker = useRef<mapboxgl.Marker | null>(null);
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
            style: 'mapbox://styles/mapbox/dark-v11', // Sleek dark mode from design
            center: [initLng, initLat],
            zoom: 12,
            pitch: 45 // Adds a 3D perspective to match modern tracking UIs
        });

        const mapInstance = map.current;

        mapInstance.on('click', (e) => {
            if (onMapClickRef.current) {
                onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
            }
        });

        mapInstance.on('load', () => {
            // Plot markers once loaded
            if (pickupLat && pickupLng) {
                const el = document.createElement('div');
                el.className = 'custom-marker pickup-marker';
                el.style.backgroundColor = '#10b981';
                el.style.width = '12px';
                el.style.height = '12px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.8)';

                new mapboxgl.Marker(el)
                    .setLngLat([pickupLng, pickupLat])
                    .addTo(mapInstance);
            }

            if (dropoffLat && dropoffLng) {
                const el = document.createElement('div');
                el.className = 'custom-marker dropoff-marker';
                el.style.backgroundColor = '#6366f1'; // Brand blue
                el.style.width = '12px';
                el.style.height = '12px';
                el.style.borderRadius = '50%';
                el.style.border = '2px solid white';
                el.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.8)';

                new mapboxgl.Marker(el)
                    .setLngLat([dropoffLng, dropoffLat])
                    .addTo(mapInstance);
            }

            // Draw actual driving route line between pickup and dropoff
            if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
                getDrivingRoute([pickupLng, pickupLat], [dropoffLng, dropoffLat]).then((route) => {
                    if (!mapInstance.getSource('route')) {
                        mapInstance.addSource('route', {
                            type: 'geojson',
                            data: route
                        });

                        mapInstance.addLayer({
                            id: 'route-line',
                            type: 'line',
                            source: 'route',
                            layout: {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            paint: {
                                'line-color': '#3b82f6', // Bright blue
                                'line-width': 4,
                                'line-opacity': 0.8
                            }
                        });
                    } else {
                        (mapInstance.getSource('route') as mapboxgl.GeoJSONSource).setData(route);
                    }
                });

                // Auto-fit bounds to show entire route
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([pickupLng, pickupLat]).extend([dropoffLng, dropoffLat]);
                if (driverLat && driverLng) {
                    bounds.extend([driverLng, driverLat]);
                }

                // Keep padding for the sidebars (left sidebar in request, right in tracking)
                const padding = isTracking
                    ? { top: 100, bottom: 100, left: 100, right: 450 }
                    : { top: 100, bottom: 100, left: 450, right: 100 };

                mapInstance.fitBounds(bounds, { padding, maxZoom: 15 });
            }
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [pickupLat, pickupLng, dropoffLat, dropoffLng, isTracking]);

    // Handle real-time Driver Marker updates
    useEffect(() => {
        if (!map.current || !driverLat || !driverLng) return;

        if (!driverMarker.current) {
            const el = document.createElement('div');
            el.className = 'driver-marker';
            el.style.backgroundColor = 'white';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.border = '4px solid #3b82f6'; // Blue border
            el.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.6)';

            driverMarker.current = new mapboxgl.Marker(el)
                .setLngLat([driverLng, driverLat])
                .addTo(map.current);
        } else {
            // Animate existing marker
            driverMarker.current.setLngLat([driverLng, driverLat]);
        }

    }, [driverLat, driverLng]);

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
