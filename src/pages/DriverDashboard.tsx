import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUpdateDriverStatus } from '../hooks/useDriverHooks';
import { useAcceptTrip } from '../hooks/useTripHooks';
import TripMap from '../components/TripMap';
import { useNavigate } from 'react-router-dom';
import { Bell, Car, Crosshair, Layers } from 'lucide-react';
import '../driver.css';

export default function DriverDashboard() {
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);
    const [tripOffer, setTripOffer] = useState<any>(null); // Details of incoming trip
    const { mutate: updateStatus } = useUpdateDriverStatus();
    const { mutate: acceptTrip } = useAcceptTrip();

    const driverLocation = { lat: 40.7580, lng: -73.9855 };

    const { isConnected, on, off } = useWebSocket({
        path: isOnline ? '/ws/driver/notifications' : null
    });

    useEffect(() => {
        if (!isConnected) return;

        // Listen for trip offer
        const handleTripOffer = (payload: any) => {
            console.log("Trip offer received via WS:", payload);
            setTripOffer(payload);
        };

        // Note: 'trip_offer' matches user prompt, but some backends might use 'TRIP_OFFER'.
        // Assuming your WS sends '{ "type": "trip_offer", ... }'. 
        // Modify the event string based on your exact WebSocket message payload 'type'.
        on('trip_offer', handleTripOffer);
        on('TRIP_OFFER', handleTripOffer); // Listening to both case-variants just in case

        return () => {
            off('trip_offer', handleTripOffer);
            off('TRIP_OFFER', handleTripOffer);
        };
    }, [isConnected, on, off]);

    const handleToggleOnline = (newStatus: boolean) => {
        setIsOnline(newStatus);
        updateStatus({ status: newStatus ? 'ONLINE' : 'OFFLINE' });
        if (!newStatus) {
            setTripOffer(null);
        }
    };

    const handleAccept = () => {
        if (!tripOffer) return;
        acceptTrip(tripOffer.id || tripOffer.tripId, {
            onSuccess: () => {
                alert('Trip Accepted!');
                setTripOffer(null);
                // Usually redirect to tracking view here for driver, e.g. navigate(`/driver/track/${tripOffer.id}`)
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
                    driverLat={driverLocation.lat}
                    driverLng={driverLocation.lng}
                    isTracking={false}
                    // Show route preview if an offer exists
                    pickupLat={tripOffer?.pickupLat}
                    pickupLng={tripOffer?.pickupLng}
                    dropoffLat={tripOffer?.dropoffLat}
                    dropoffLng={tripOffer?.dropoffLng}
                />
            </div>

            {/* Top Bar */}
            <div className="driver-top-bar">
                <div className="driver-logo">
                    <div className="car-icon-box">
                        <Car size={20} color="white" />
                    </div>
                    DriveSync
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
                        <div className="earnings-value">$142.50</div>
                    </div>
                    <div className="user-avatar-small" style={{ cursor: 'pointer' }} onClick={() => navigate('/profile')}>
                        <img src="https://i.pravatar.cc/100?img=11" alt="driver" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    </div>
                </div>
            </div>

            {/* Bottom Floating Map Controls */}
            <div className="driver-bottom-actions">
                <button className="icon-btn"><Crosshair size={20} /></button>
                <button className="icon-btn"><Layers size={20} /></button>
            </div>

            {/* Bottom Floating Banner (Surge) */}
            <div className="surge-banner">
                <span className="surge-dot"></span> <span style={{ color: 'white', fontWeight: 600 }}>High Demand Area</span>
                <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }}></span>
                <span className="surge-text">Earn <span className="surge-multiplier">1.5x</span> Surge in Downtown</span>
            </div>

            {/* Trip Offer Card */}
            {tripOffer && (
                <div className="trip-offer-card">
                    <div className="offer-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={16} /> NEW TRIP REQUEST
                        </div>
                        <span className="offer-timer">24s remaining</span>
                    </div>

                    <div className="offer-stats">
                        <div className="offer-price">
                            ${tripOffer.fare?.toFixed(2) || '18.20'}
                            <div className="est-earnings">Est. Earnings</div>
                        </div>
                        <div className="offer-distance">
                            {tripOffer.distance || '1.4 mi'}
                            <div className="est-earnings">Pickup distance</div>
                        </div>
                    </div>

                    <div className="offer-rider-info">
                        <div className="rider-avatar">
                            <img src="https://i.pravatar.cc/100?img=5" alt="rider" />
                        </div>
                        <div>
                            <div className="rider-name">{tripOffer.riderName || 'Sarah Jenkins'}</div>
                            <div className="rider-rating">★ 4.9 • 12 min trip</div>
                        </div>
                    </div>

                    <div className="offer-locations">
                        <div className="loc-line" />
                        <div className="loc-row">
                            <div className="loc-dot pickup" />
                            <div>
                                <div className="loc-label">PICKUP</div>
                                <div className="loc-address">{tripOffer.pickupAddress || 'Grand Central Station, 89 E 42nd St'}</div>
                            </div>
                        </div>
                        <div className="loc-row">
                            <div className="loc-dot dropoff" />
                            <div>
                                <div className="loc-label">DROPOFF</div>
                                <div className="loc-address">{tripOffer.dropoffAddress || 'Museum of Modern Art, W 53rd St'}</div>
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
