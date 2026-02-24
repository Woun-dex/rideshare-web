import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUpdateDriverStatus } from '../hooks/useDriverHooks';
import { useAcceptTrip } from '../hooks/useTripHooks';
import { useDriverLocationTracking } from '../hooks/useDriverLocationTracking';
import TripMap from '../components/TripMap';
import { useNavigate } from 'react-router-dom';
import { Bell, Car, Crosshair, Layers, User } from 'lucide-react';
import type { EventEnvelope } from '../api/eventTypes';
import '../driver.css';

export default function DriverDashboard() {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(() => localStorage.getItem('driverIsOnline') === 'true');
    const [tripOffer, setTripOffer] = useState<EventEnvelope | null>(null); // Details of incoming trip matching Kafka event
    const { mutate: updateStatus } = useUpdateDriverStatus();
    const { mutate: acceptTrip } = useAcceptTrip();

    const driverId = localStorage.getItem('userId') || '';

    // Stream location to the backend when the driver is online so they can be matched
    const { lat: driverLat, lng: driverLng } = useDriverLocationTracking({
        driverId,
        isTracking: isOnline,
        intervalMs: 5000
    });

    // Ref to hold the manual re-center function provided by TripMap
    const recenterFnRef = useRef<(() => void) | null>(null);
    const handleRecenterReady = useCallback((fn: () => void) => {
        recenterFnRef.current = fn;
    }, []);

    const { isConnected, on, off } = useWebSocket({
        path: isOnline ? '/ws/driver/notifications' : null,
        queryParams: { driverId: localStorage.getItem('userId') || '' }
    });

    useEffect(() => {
        if (!isConnected) return;

        // Listen for new trip request from Kafka topic
        const handleTripOffer = (payload: EventEnvelope) => {
            console.log("Trip requested (Kafka Event):", payload);
            setTripOffer(payload);
        };

        on('TRIP_REQUESTED', handleTripOffer);

        return () => {
            off('TRIP_REQUESTED', handleTripOffer);
        };
    }, [isConnected, on, off]);

    const handleToggleOnline = (newStatus: boolean) => {
        setIsOnline(newStatus);
        localStorage.setItem('driverIsOnline', String(newStatus));
        updateStatus({ status: newStatus ? 'ONLINE' : 'OFFLINE' });
        if (!newStatus) {
            setTripOffer(null);
        }
    };

    const handleAccept = () => {
        if (!tripOffer) return;
        acceptTrip(tripOffer.tripId, {
            onSuccess: () => {
                const id = tripOffer.tripId;
                setTripOffer(null);
                navigate(`/driver/track/${id}`);
            },
            onError: (err) => {
                console.error("Failed to accept", err);
                alert("Failed to accept trip.");
            }
        });
    };

    const handleDecline = () => {
        setTripOffer(null);
    };

    return (
        <div className="driver-layout">
            <div className="driver-map-layer">
                <TripMap
                    driverLat={driverLat}
                    driverLng={driverLng}
                    isTracking={false}
                    centerOnDriver={isOnline}
                    onRecenterReady={handleRecenterReady}
                    // Show route preview if an offer exists mapping to EventEnvelope payload
                    pickupLat={tripOffer?.pickup?.latitude}
                    pickupLng={tripOffer?.pickup?.longitude}
                    dropoffLat={tripOffer?.dropoff?.latitude}
                    dropoffLng={tripOffer?.dropoff?.longitude}
                />
            </div>

            {/* Top Bar */}
            <div className="driver-top-bar">
                <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                    <div className="driver-logo">
                        <div className="car-icon-box">
                            <Car size={20} color="white" />
                        </div>
                        RideShare
                    </div>
                    {/* Navigation matching History */}
                    <nav className="header-nav" style={{ display: 'flex', gap: '32px' }}>
                        <a className="active" style={{ color: '#3b82f6', fontWeight: 500 }}>Dashboard</a>
                        <a onClick={() => navigate('/driver/history')} style={{ cursor: 'pointer', color: '#94a3b8', fontWeight: 500 }}>Trips</a>
                        <a style={{ color: '#94a3b8', fontWeight: 500 }}>Wallet</a>
                    </nav>
                </div>

                <div className="status-toggle-container">
                    <button
                        className={`status-btn online ${isOnline ? 'active' : ''}`}
                        onClick={() => !isOnline && handleToggleOnline(true)}
                    >
                        Online
                    </button>
                    <button
                        className={`status-btn offline ${!isOnline ? 'active' : ''}`}
                        onClick={() => isOnline && handleToggleOnline(false)}
                    >
                        Offline
                    </button>
                </div>

                <div className="driver-stats">
                    <div className="earnings">
                        <div className="earnings-label">TODAY'S EARNINGS</div>
                        <div className="earnings-value">$0.00</div>
                    </div>
                    <div className="user-avatar-small" style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #facc15, #ebb305)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => navigate('/profile')}>
                        <User size={20} color="white" />
                    </div>
                </div>
            </div>

            {/* Bottom Floating Map Controls */}
            <div className="driver-bottom-actions">
                <button className="icon-btn" onClick={() => recenterFnRef.current?.()}><Crosshair size={20} /></button>
                <button className="icon-btn"><Layers size={20} /></button>
            </div>

            {/* Bottom Floating Banner (Surge) */}
            <div className="surge-banner">
                <span className="surge-dot"></span> <span style={{ color: 'white', fontWeight: 600 }}>Ready to drive</span>
                <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }}></span>
                <span className="surge-text">Waiting for requests in your area</span>
            </div>

            {/* Trip Offer Card */}
            {tripOffer && (
                <div className="trip-offer-card">
                    <div className="offer-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={16} /> NEW TRIP REQUEST
                        </div>
                        <span className="offer-timer">Waiting...</span>
                    </div>

                    <div className="offer-stats">
                        <div className="offer-price">
                            ${tripOffer.fare?.toFixed(2) || '0.00'}
                            <div className="est-earnings">Est. Earnings</div>
                        </div>
                        <div className="offer-distance">
                            -- mi
                            <div className="est-earnings">Pickup distance</div>
                        </div>
                    </div>

                    <div className="offer-rider-info">
                        <div className="rider-avatar" style={{ overflow: 'hidden', background: 'linear-gradient(135deg, #facc15, #ebb305)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={24} color="white" />
                        </div>
                        <div>
                            <div className="rider-name">{"Rider " + (tripOffer.riderId?.substring(0, 4) || '')}</div>
                            <div className="rider-rating">★ 5.0 • Standard Trip</div>
                        </div>
                    </div>

                    <div className="offer-locations">
                        <div className="loc-line" />
                        <div className="loc-row">
                            <div className="loc-dot pickup" />
                            <div>
                                <div className="loc-label">PICKUP</div>
                                <div className="loc-address">{tripOffer.pickup?.address || 'Requested Location'}</div>
                            </div>
                        </div>
                        <div className="loc-row">
                            <div className="loc-dot dropoff" />
                            <div>
                                <div className="loc-label">DROPOFF</div>
                                <div className="loc-address">{tripOffer.dropoff?.address || 'Target Location'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="offer-actions">
                        <button className="btn-decline" onClick={handleDecline}>DECLINE</button>
                        <button className="btn-accept" onClick={handleAccept}>ACCEPT</button>
                    </div>
                </div>
            )}
        </div>
    );
}
