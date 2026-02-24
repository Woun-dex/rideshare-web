import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGetTrip, useCancelTrip, tripKeys } from '../hooks/useTripHooks';
import { useDriverLocation } from '../hooks/useLocationHooks';
import { useUserById } from '../api/userApi';
import { useWebSocket } from '../hooks/useWebSocket';
import TripMap from '../components/TripMap';
import { ArrowLeft, Share2, Shield, CheckCircle, Phone, User } from 'lucide-react';
import '../rider.css';

export default function TripTracking() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: tripDetails, isLoading } = useGetTrip(tripId || '', true, 5000);
    const { mutate: cancelTrip } = useCancelTrip();

    const [realtimeLocation, setRealtimeLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

    // REST polling fallback — fetch driver position every 3s when a driver is assigned
    const driverId = tripDetails?.driverId || '';
    const { data: polledDriverLoc } = useDriverLocation(driverId, !!driverId);

    // Fetch the assigned driver's real profile (name, phone, etc.)
    const { data: driverProfile } = useUserById(driverId, !!driverId);

    const { isConnected, on, off } = useWebSocket({
        path: tripId ? `/ws/track/${tripId}` : null,
        queryParams: {
            userId: localStorage.getItem('userId') || '',
            riderId: localStorage.getItem('userId') || ''
        }
    });

    useEffect(() => {
        if (!isConnected) return;

        // Listen for new event envelopes from Kafka backend
        const handleLocationUpdate = (payload: any) => {
            const lat = payload.latitude ?? payload.lat;
            const lng = payload.longitude ?? payload.lng ?? payload.lon;
            if (lat && lng) {
                setRealtimeLocation({ lat, lng });
            }
        };
        const handleStatusChange = (payload: any) => {
            setRealtimeStatus(payload.status);
            // Immediately re-fetch trip details so driverId, fare, etc. update instantly
            if (tripId) {
                queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
            }
        };

        on('LOCATION_UPDATED', handleLocationUpdate);
        on('STATUS_CHANGED', handleStatusChange);

        return () => {
            off('LOCATION_UPDATED', handleLocationUpdate);
            off('STATUS_CHANGED', handleStatusChange);
        };
    }, [isConnected, on, off]);

    if (isLoading) return <div className="rider-layout" style={{ color: 'white', padding: '50px' }}>Loading Tracker...</div>;

    const currentStatus = realtimeStatus || tripDetails?.status || 'FINDING DRIVER';

    // Prefer WebSocket realtime location, fall back to REST-polled driver location
    const showLocation = realtimeLocation
        || (polledDriverLoc && polledDriverLoc.lat ? { lat: polledDriverLoc.lat, lng: polledDriverLoc.lng } : null);
    const hasDriverGPS = showLocation?.lat !== undefined;

    // Explicit Route Endpoints logic:
    let routeStartLat, routeStartLng, routeEndLat, routeEndLng;

    if (!tripDetails?.driverId || !hasDriverGPS || currentStatus === 'REQUESTED' || currentStatus === 'FINDING DRIVER') {
        // No driver yet or no GPS -> Show full trip route (Pickup to Dropoff)
        routeStartLat = tripDetails?.pickupLat || 40.7128;
        routeStartLng = tripDetails?.pickupLng || -74.0060;
        routeEndLat = tripDetails?.dropoffLat || 40.7580;
        routeEndLng = tripDetails?.dropoffLng || -73.9855;
    } else if (currentStatus === 'ASSIGNED') {
        // Driver is heading to pickup -> Show route from Driver to Pickup
        routeStartLat = showLocation.lat;
        routeStartLng = showLocation.lng;
        routeEndLat = tripDetails!.pickupLat;
        routeEndLng = tripDetails!.pickupLng;
    } else {
        // Driver is heading to dropoff -> Show route from Driver to Dropoff
        routeStartLat = showLocation.lat;
        routeStartLng = showLocation.lng;
        routeEndLat = tripDetails!.dropoffLat;
        routeEndLng = tripDetails!.dropoffLng;
    }

    return (
        <div className="rider-layout">

            {/* Background Fullscreen Map */}
            <div className="rider-map-layer">
                <TripMap
                    pickupLat={tripDetails?.pickupLat || 40.7128}
                    pickupLng={tripDetails?.pickupLng || -74.0060}
                    dropoffLat={tripDetails?.dropoffLat || 40.7580}
                    dropoffLng={tripDetails?.dropoffLng || -73.9855}

                    driverLat={showLocation?.lat}
                    driverLng={showLocation?.lng}

                    // Show dynamic route from driver to active destination
                    routeStartLat={routeStartLat}
                    routeStartLng={routeStartLng}
                    routeEndLat={routeEndLat}
                    routeEndLng={routeEndLng}

                    isTracking={true}
                />
            </div>

            {/* Top Left Elements */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 20 }}>
                <button
                    className="pill-button"
                    style={{ width: 'FIT-CONTENT', padding: '12px 24px', borderRadius: '12px' }}
                    onClick={() => navigate('/request-trip')}
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="pill-button" style={{ borderRadius: '8px', cursor: 'default' }}>
                    <div className="input-dot" style={{ background: isConnected ? '#10b981' : '#f59e0b' }} />
                    {isConnected ? 'Tracking Live Location' : 'Connecting Stream...'}
                </div>
            </div>


            {/* Right Side Floating Panel */}
            <div className="rider-side-panel right" style={{ position: 'absolute', right: '24px' }}>
                <div className="rider-content" style={{ padding: '24px' }}>

                    {/* ETA Section */}
                    <div className="tracking-eta-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span className="eta-label">STATUS</span>
                            <span style={{ fontSize: '0.75rem', background: currentStatus === 'IN_PROGRESS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(235, 179, 5, 0.1)', color: currentStatus === 'IN_PROGRESS' ? '#10b981' : '#ebb305', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                {currentStatus === 'REQUESTED' ? 'FINDING DRIVER' : currentStatus === 'ASSIGNED' ? 'DRIVER ASSIGNED' : currentStatus === 'IN_PROGRESS' ? 'EN ROUTE' : currentStatus === 'COMPLETED' ? 'COMPLETED' : currentStatus}
                            </span>
                        </div>
                        <div className="eta-time">
                            {currentStatus === 'REQUESTED' ? 'Looking for a driver…' : currentStatus === 'ASSIGNED' ? 'Driver is on the way!' : currentStatus === 'IN_PROGRESS' ? 'Trip in progress' : currentStatus === 'COMPLETED' ? 'Trip completed' : currentStatus}
                        </div>
                        <div className="eta-desc">
                            {currentStatus === 'REQUESTED' ? 'We\'re matching you with a nearby driver. This may take a moment.' : currentStatus === 'ASSIGNED' ? 'Your driver has accepted the trip and is heading to your pickup location.' : currentStatus === 'IN_PROGRESS' ? 'You\'re on your way to the destination. Enjoy the ride!' : currentStatus === 'COMPLETED' ? 'You have arrived at your destination.' : ''}
                        </div>
                    </div>

                    {/* Driver Section */}
                    {tripDetails?.driverId ? (
                        <>
                            <div className="driver-card">
                                <div className="driver-avatar">
                                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #facc15, #ebb305)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={24} color="white" />
                                    </div>
                                    <div className="driver-badge"><CheckCircle size={12} color="white" /></div>
                                </div>
                                <div className="driver-info">
                                    <h3>{driverProfile?.name || 'Loading...'}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--rider-text-muted)' }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ 5.0</span>
                                        <span>• {driverProfile?.email || 'Driver'}</span>
                                    </div>
                                    {driverProfile?.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--rider-text-muted)', marginTop: '4px' }}>
                                            <Phone size={12} /> {driverProfile.phone}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vehicle Details */}
                            <div className="car-card">
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--rider-text-muted)', marginBottom: '8px' }}>VEHICLE</div>
                                <div className="car-title">{driverProfile?.vehicleInfo || 'Toyota Camry, Blue'}</div>
                                <div className="car-color" style={{ marginTop: '4px' }}>License: {driverProfile?.licenseNumber || 'NYC-7829'}</div>
                            </div>

                        </>
                    ) : (
                        <div className="driver-card" style={{ justifyContent: 'center', padding: '32px' }}>
                            <div style={{ color: 'var(--rider-text-muted)', textAlign: 'center' }}>
                                Matching you with a nearby driver...
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div className="timeline" style={{ marginTop: '24px' }}>
                        <div className="timeline-item">
                            <div className="time-dot" style={{ background: currentStatus === 'REQUESTED' || currentStatus === 'ASSIGNED' ? '#ebb305' : '#10b981' }} />
                            <div className="timeline-label">PICKUP</div>
                            <div className="timeline-text">
                                {currentStatus === 'REQUESTED' ? 'Waiting for a driver…' : currentStatus === 'ASSIGNED' ? 'Driver heading to you' : 'Picked up'}
                            </div>
                        </div>
                        <div className="timeline-item">
                            <div className="time-dot" style={{ background: currentStatus === 'IN_PROGRESS' ? '#ebb305' : currentStatus === 'COMPLETED' ? '#10b981' : 'transparent', border: currentStatus === 'REQUESTED' || currentStatus === 'ASSIGNED' ? '2px solid var(--rider-text-muted)' : 'none' }} />
                            <div className="timeline-label" style={{ color: currentStatus === 'IN_PROGRESS' || currentStatus === 'COMPLETED' ? 'var(--rider-text)' : 'var(--rider-text-muted)' }}>DROPOFF</div>
                            <div className="timeline-text">
                                {currentStatus === 'IN_PROGRESS' ? 'Heading to destination' : currentStatus === 'COMPLETED' ? 'Arrived' : 'Destination'}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="tracking-actions">
                        <button><Share2 size={18} /> Share Trip</button>
                        <button><Shield size={18} /> Safety</button>
                    </div>

                    <div
                        className="cancel-btn-text"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to cancel?")) {
                                cancelTrip(tripId!, { onSuccess: () => navigate('/request-trip') });
                            }
                        }}
                    >
                        CANCEL TRIP
                    </div>

                </div>

            </div>

        </div>
    );
}
