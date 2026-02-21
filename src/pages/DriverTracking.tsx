import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CornerUpRight, MessageSquare, Navigation, Star } from 'lucide-react';
import TripMap from '../components/TripMap';
import { useDriverLocationTracking } from '../hooks/useDriverLocationTracking';
import { useGetTrip, useUpdateTripStatus } from '../hooks/useTripHooks';
import '../driver.css';

export default function DriverTracking() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();

    const { data: tripData, isLoading, isError } = useGetTrip(tripId || '', !!tripId, 5000);
    const updateTripStatus = useUpdateTripStatus();

    const [etaMins, setEtaMins] = useState(12);
    const [distanceMi, setDistanceMi] = useState(3.2);

    // Hardcoded driver ID for MVP testing.
    const driverId = 'driver-123';

    // *** Real-time GPS Tracking via REST Fallback ***
    // This hook will automatically pulse POST /api/location/update every 5s while mounted.
    useDriverLocationTracking({
        driverId,
        tripId: tripData?.id || '',
        isTracking: tripData?.status === 'ACCEPTED' || tripData?.status === 'IN_PROGRESS',
        intervalMs: 5000
    });

    const handleConfirmArrival = () => {
        if (!tripData) return;
        updateTripStatus.mutate(
            { id: tripData.id, data: { status: 'IN_PROGRESS' } },
            {
                onSuccess: () => {
                    alert('Arrival confirmed! Rider has been notified.');
                    navigate('/driver'); // Or transition to 'IN PROGRESS' state
                },
                onError: () => {
                    alert('Failed to update trip status.');
                }
            }
        );
    };

    if (isLoading) return <div className="driver-tracking-layout">Loading trip...</div>;
    if (isError || !tripData) return <div className="driver-tracking-layout">Error loading trip.</div>;

    // Mock rider details for UI demonstration since they are not in TripResponseDto yet
    const riderName = 'Marcus Thompson';
    const riderRating = 4.9;
    const destinationAddress = '789 Innovation Drive, Tech District';

    const isHeadingToPickup = tripData.status === 'ACCEPTED' || tripData.status === 'REQUESTED';

    return (
        <div className="driver-tracking-layout">
            {/* Background Cinematic Map Layer */}
            <div className="driver-tracking-map">
                {/* 
                    TripMap is currently stateless and center-fits the bounds.
                    In a full implementation, the map would strictly follow the driver's streaming coords.
                */}
                <TripMap
                    isTracking={true}
                    driverLat={40.7484} // Mocking current driver location on map
                    driverLng={-73.9857}
                    dropoffLat={isHeadingToPickup ? tripData.pickupLat : tripData.dropoffLat}
                    dropoffLng={isHeadingToPickup ? tripData.pickupLng : tripData.dropoffLng}
                    onRouteCalculated={(dist, dur) => {
                        setDistanceMi(Number(dist.toFixed(1)));
                        setEtaMins(Math.round(dur));
                    }}
                />
            </div>

            {/* Top Navigation HUD overlays */}
            <div className="tracking-hud-top-left">
                <div className="nav-direction-icon">
                    <CornerUpRight size={28} color="#60a5fa" />
                </div>
                <div>
                    <div className="nav-distance-next">450 ft</div>
                    <div className="nav-street-next">Turn right onto Market St</div>
                </div>
            </div>

            <div className="tracking-hud-top-right">
                <div className="eta-block">
                    <div className="eta-label">ETA</div>
                    <div className="eta-value">{etaMins}m</div>
                </div>
                <div className="dist-block">
                    <div className="eta-label">DISTANCE</div>
                    <div className="eta-value">{distanceMi} mi</div>
                </div>
                <button className="recenter-btn">
                    <Navigation size={20} />
                </button>
            </div>

            {/* Notifications Overlay (Bottom Left) */}
            <div className="tracking-notification">
                <div className="msg-icon">
                    <MessageSquare size={18} color="#60a5fa" />
                </div>
                <div>
                    <div className="msg-label">NEW MESSAGE</div>
                    <div className="msg-text">"I'm waiting near the main entrance next to the blue sign."</div>
                </div>
            </div>

            {/* Bottom Dashboard Panel */}
            <div className="tracking-dashboard">
                <div className="rider-card">
                    <div className="rider-avatar-wrapper">
                        <img src="https://i.pravatar.cc/100?img=12" alt="Rider" />
                        <div className="rating-badge">
                            {riderRating} <Star size={10} fill="#1e293b" />
                        </div>
                    </div>
                    <div>
                        <div className="rider-name-large">{riderName}</div>
                        <div className="rider-actions">
                            <button className="action-btn call"><Navigation size={14} style={{ transform: 'rotate(90deg)' }} /></button>
                            <button className="action-btn msg"><MessageSquare size={14} /></button>
                        </div>
                    </div>
                </div>

                <div className="trip-destination-info">
                    <div className="dest-label">
                        <div className="dest-dot"></div> {isHeadingToPickup ? 'PICKUP' : 'DESTINATION'}
                    </div>
                    <div className="dest-address">{destinationAddress}</div>
                    <div className="trip-meta">
                        <span className="status-badge">{tripData.status}</span>
                        <span className="meta-text">{etaMins} mins remaining • {distanceMi} mi</span>
                    </div>
                </div>

                <div className="trip-progress-bar">
                    <div className="progress-label">TRIP PROGRESS</div>
                    <div className="progress-segments">
                        <div className="segment active"></div>
                        <div className="segment"></div>
                        <div className="segment"></div>
                    </div>
                </div>

                <button
                    className="confirm-arrival-btn"
                    onClick={handleConfirmArrival}
                    disabled={updateTripStatus.isPending || tripData.status === 'IN_PROGRESS' || tripData.status === 'COMPLETED'}
                >
                    {updateTripStatus.isPending ? 'Updating...' : isHeadingToPickup ? 'Confirm Arrival' : 'Complete Trip'}
                </button>
            </div>
        </div>
    );
}
