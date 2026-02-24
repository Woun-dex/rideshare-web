import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestTrip } from '../hooks/useTripHooks';
import TripMap from '../components/TripMap';
import { Car, CreditCard, Menu, Bell, Navigation, Plus, Minus } from 'lucide-react';
import '../rider.css';

export default function RequestTrip() {
    const navigate = useNavigate();
    const { mutate: requestTrip, isPending } = useRequestTrip();

    const [pickupLat, setPickupLat] = useState<number | undefined>(undefined);
    const [pickupLng, setPickupLng] = useState<number | undefined>(undefined);
    const [dropoffLat, setDropoffLat] = useState<number | undefined>(undefined);
    const [dropoffLng, setDropoffLng] = useState<number | undefined>(undefined);

    const [pickupText, setPickupText] = useState('');
    const [dropoffText, setDropoffText] = useState('');
    const [selectingLocation, setSelectingLocation] = useState<'pickup' | 'dropoff' | null>('pickup');

    // Dynamic routing stats
    const [routeDistance, setRouteDistance] = useState<number | null>(null);
    const [routeDuration, setRouteDuration] = useState<number | null>(null);

    // Rider's own GPS location (for auto-centering map)
    const [riderLat, setRiderLat] = useState<number | undefined>(undefined);
    const [riderLng, setRiderLng] = useState<number | undefined>(undefined);

    // Grab rider's GPS on mount and auto-fill pickup
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setRiderLat(lat);
                setRiderLng(lng);

                // Auto-set pickup to current location if not already set manually
                setPickupLat(lat);
                setPickupLng(lng);

                const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
                try {
                    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
                    const data = await res.json();
                    if (data.features && data.features.length > 0) {
                        setPickupText(data.features[0].place_name);
                    } else {
                        setPickupText('Current Location');
                    }
                } catch (err) {
                    setPickupText('Current Location');
                }

                // Advance to dropoff selection
                setSelectingLocation('dropoff');
            },
            (err) => console.warn('[Rider GPS]', err.message),
            { enableHighAccuracy: true }
        );
    }, []);

    // Manual re-center via Navigation button
    const recenterFnRef = useRef<(() => void) | null>(null);
    const handleRecenterReady = useCallback((fn: () => void) => {
        recenterFnRef.current = fn;
    }, []);

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

    const reverseGeocode = async (lng: number, lat: number) => {
        try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                return data.features[0].place_name;
            }
        } catch (err) {
            console.error(err);
        }
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    };

    const forwardGeocode = async (query: string, type: 'pickup' | 'dropoff') => {
        if (!query) return;
        try {
            const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`);
            const data = await res.json();
            if (data.features && data.features.length > 0) {
                const [lng, lat] = data.features[0].center;
                if (type === 'pickup') {
                    setPickupLat(lat);
                    setPickupLng(lng);
                } else {
                    setDropoffLat(lat);
                    setDropoffLng(lng);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleMapClick = async (lat: number, lng: number) => {
        if (selectingLocation === 'pickup') {
            setPickupLat(lat);
            setPickupLng(lng);
            const name = await reverseGeocode(lng, lat);
            setPickupText(name);
            setSelectingLocation('dropoff'); // move sequentially
        } else if (selectingLocation === 'dropoff') {
            setDropoffLat(lat);
            setDropoffLng(lng);
            const name = await reverseGeocode(lng, lat);
            setDropoffText(name);
            setSelectingLocation(null);
        }
    };

    const handleRequest = () => {
        if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
            alert('Please select pickup and dropoff locations.');
            return;
        }

        requestTrip(
            { pickupLat, pickupLng, dropoffLat, dropoffLng },
            {
                onSuccess: (data) => {
                    if (data.id) {
                        navigate(`/track/${data.id}`);
                    } else {
                        console.error('Trip created but no ID returned:', data);
                        alert('Trip was created but no ID was returned. Check console for details.');
                    }
                },
                onError: (err) => console.error('Failed to request trip', err)
            }
        );
    };

    return (
        <div className="rider-layout">

            {/* Background Fullscreen Map */}
            <div className="rider-map-layer">
                <TripMap
                    pickupLat={pickupLat} pickupLng={pickupLng}
                    dropoffLat={dropoffLat} dropoffLng={dropoffLng}
                    driverLat={riderLat} driverLng={riderLng}
                    isTracking={false}
                    centerOnDriver={true}
                    onRecenterReady={handleRecenterReady}
                    onMapClick={handleMapClick}
                    onRouteCalculated={(dist, dur) => {
                        setRouteDistance(dist);
                        setRouteDuration(dur);
                    }}
                />
            </div>

            {/* Global Top Nav */}
            <div className="top-pill-toggles">
                <button className="pill-button icon-only">
                    <Menu size={18} />
                </button>
                <div style={{ display: 'flex', background: 'var(--rider-bg-panel)', borderRadius: '24px', padding: '4px', border: '1px solid var(--rider-border)' }}>
                    <button className="pill-button active" style={{ boxShadow: 'none', border: 'none' }}>Ride</button>
                </div>
            </div>

            <div className="top-right-actions">
                <button className="pill-button icon-only">
                    <Bell size={18} />
                </button>
                <div className="user-pill" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                    <div className="user-avatar" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Rider Account</span>
                </div>
            </div>

            {/* Map Controls */}
            <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 20 }}>
                <button className="pill-button icon-only" style={{ background: 'var(--rider-bg-panel)' }} onClick={() => recenterFnRef.current?.()}><Navigation size={20} /></button>
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--rider-bg-panel)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--rider-border)' }}>
                    <button className="pill-button icon-only" style={{ border: 'none', borderRadius: 0, borderBottom: '1px solid var(--rider-border)', boxShadow: 'none' }}><Plus size={20} /></button>
                    <button className="pill-button icon-only" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}><Minus size={20} /></button>
                </div>
            </div>

            {/* Left Sidebar Form */}
            <div className="rider-side-panel left">
                <div className="rider-header">
                    <div className="rider-header-icon">
                        <Car size={24} />
                    </div>
                    <h1>Rider</h1>
                </div>

                <div className="rider-content">
                    <h2 style={{ fontSize: '1.4rem', marginBottom: '24px', fontWeight: 'bold' }}>Request a Trip</h2>

                    <div className="rider-input-group">
                        <div className="rider-input-line" />

                        <div
                            className={`rider-input-row ${selectingLocation === 'pickup' ? 'active-selection' : ''}`}
                            onClick={() => setSelectingLocation('pickup')}
                            style={{ border: selectingLocation === 'pickup' ? '1px solid #ebb305' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <div className="input-dot" />
                            <input
                                type="text"
                                value={pickupText}
                                onChange={(e) => setPickupText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && forwardGeocode(pickupText, 'pickup')}
                                placeholder="Pickup (Search or map click)"
                            />
                        </div>

                        <div
                            className={`rider-input-row ${selectingLocation === 'dropoff' ? 'active-selection' : ''}`}
                            onClick={() => setSelectingLocation('dropoff')}
                            style={{ border: selectingLocation === 'dropoff' ? '1px solid #ebb305' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <div className="input-square" />
                            <input
                                type="text"
                                placeholder="Where to? (Search or map click)"
                                value={dropoffText}
                                onChange={(e) => setDropoffText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && forwardGeocode(dropoffText, 'dropoff')}
                            />
                        </div>
                        {selectingLocation && (
                            <div style={{ fontSize: '0.8rem', color: '#ebb305', marginTop: '8px', paddingLeft: '8px' }}>
                                Currently picking "{selectingLocation}" from map... Just tap any location! Hit Enter in the box to search.
                            </div>
                        )}
                    </div>

                    <div className="options-label">Selected Ride</div>

                    <div className="ride-options">
                        <div className="ride-option selected" style={{ cursor: 'default' }}>
                            <div className="option-img">
                                <Car color="#10b981" />
                            </div>
                            <div className="option-info">
                                <div className="option-title">Standard Ride</div>
                                <div className="option-desc">Affordable everyday ride</div>
                            </div>
                            <div className="option-price-eta">
                                <div className="option-price">
                                    {routeDistance ? `$${(5.00 + routeDistance * 2.50).toFixed(2)}` : '--'}
                                </div>
                                <div className="option-eta selected">
                                    {routeDuration ? `${Math.round(routeDuration)} min dropoff` : '--'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rider-footer">


                        <button
                            className="request-btn"
                            onClick={handleRequest}
                            disabled={isPending || !pickupLat || !dropoffLat}
                            style={{ opacity: (!pickupLat || !dropoffLat) ? 0.5 : 1 }}
                        >
                            {isPending ? 'Requesting...' : 'Request Ride'}
                        </button>
                    </div>

                </div>
            </div>

            {/* Bottom Floating Banner for Request View */}
            <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--rider-bg-panel)', padding: '12px 24px', borderRadius: '30px', display: 'flex', gap: '16px', border: '1px solid var(--rider-border)', zIndex: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="input-dot" />
                    <span style={{ fontSize: '0.9rem', color: 'var(--rider-text)' }}>Fastest pickup nearby</span>
                </div>
                <div style={{ width: '1px', background: 'var(--rider-border)', alignSelf: 'stretch' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--rider-text)', fontWeight: 600 }}>
                    {routeDuration ? `Arrives in ~${Math.round(routeDuration)} mins` : 'Select dropoff'}
                </span>
            </div>

        </div>
    );
}
