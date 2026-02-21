import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTrip, useCancelTrip } from '../hooks/useTripHooks';
import { useWebSocket } from '../hooks/useWebSocket';
import TripMap from '../components/TripMap';
import { ArrowLeft, Share2, Shield, MessageSquare, Phone, CloudRain, CheckCircle, CreditCard } from 'lucide-react';
import '../rider.css';

export default function TripTracking() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();

    const { data: tripDetails, isLoading } = useGetTrip(tripId || '', true, 5000);
    const { mutate: cancelTrip } = useCancelTrip();

    const [realtimeLocation, setRealtimeLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

    const { isConnected, on, off } = useWebSocket({
        path: tripId ? `/ws/track/${tripId}` : null
    });

    useEffect(() => {
        if (!isConnected) return;

        // Listen for new event envelopes from Kafka backend
        const handleLocationUpdate = (payload: any) => {
            // Depending on backend structure, coordinates might be flat OR in pickup/dropoff.
            // Following typical LocationUpdate patterns from the provided schema:
            if (payload.latitude && payload.longitude) {
                setRealtimeLocation({ lat: payload.latitude, lng: payload.longitude });
            }
        };
        const handleStatusChange = (payload: any) => setRealtimeStatus(payload.status);

        on('LOCATION_UPDATED', handleLocationUpdate);
        on('STATUS_CHANGED', handleStatusChange);

        return () => {
            off('LOCATION_UPDATED', handleLocationUpdate);
            off('STATUS_CHANGED', handleStatusChange);
        };
    }, [isConnected, on, off]);

    if (isLoading) return <div className="rider-layout" style={{ color: 'white', padding: '50px' }}>Loading Tracker...</div>;

    const currentStatus = realtimeStatus || tripDetails?.status || 'FINDING DRIVER';

    // Only use realtime or actual driver location. No static mockup fallbacks.
    const showLocation = realtimeLocation || null;

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

            {/* Bottom Left Weather Widget */}
            <div style={{ position: 'absolute', bottom: '24px', left: '24px', background: 'var(--rider-bg-panel)', padding: '16px', borderRadius: '12px', zIndex: 20, border: '1px solid var(--rider-border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(59,130,246,0.1)', padding: '8px', borderRadius: '8px', color: '#60a5fa' }}><CloudRain size={24} /></div>
                <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--rider-text-muted)' }}>Weather Delay</div>
                    <div style={{ fontWeight: 600 }}>+2 min expected</div>
                </div>
            </div>

            {/* Right Side Floating Panel */}
            <div className="rider-side-panel right" style={{ position: 'absolute', right: '24px' }}>
                <div className="rider-content" style={{ padding: '24px' }}>

                    {/* ETA Section */}
                    <div className="tracking-eta-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <span className="eta-label">STATUS</span>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>PRIORITY PICKUP</span>
                        </div>
                        <div className="eta-time">{currentStatus}</div>
                        <div className="eta-desc">Your driver is navigating to your location.</div>
                    </div>

                    {/* Driver Section */}
                    {tripDetails?.driverId ? (
                        <>
                            <div className="driver-card">
                                <div className="driver-avatar">
                                    <img src="https://i.pravatar.cc/100?img=11" alt="driver" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                    <div className="driver-badge"><CheckCircle size={12} color="white" /></div>
                                </div>
                                <div className="driver-info">
                                    <h3>Driver {tripDetails.driverId.substring(0, 4)}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--rider-text-muted)' }}>
                                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ 5.0</span>
                                        <span>• Active Driver</span>
                                    </div>
                                </div>
                            </div>

                            {/* Car Details */}
                            <div className="car-card">
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--rider-text-muted)', marginBottom: '8px' }}>YOUR RIDE</div>
                                <div className="car-title">Standard Vehicle</div>
                                <div className="car-color">Wait for driver</div>
                                <div className="car-plate">----</div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', marginTop: '16px' }}>
                                <button className="message-btn"><MessageSquare size={18} /> Message</button>
                                <button className="call-btn"><Phone size={20} /></button>
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
                            <div className="time-dot active" />
                            <div className="timeline-label">CURRENT LOCATION</div>
                            <div className="timeline-text">Awaiting Driver Arrival</div>
                        </div>
                        <div className="timeline-item">
                            <div className="time-dot" style={{ background: 'transparent' }} />
                            <div className="timeline-label" style={{ color: 'var(--rider-text-muted)' }}>PICKUP POINT</div>
                            <div className="timeline-text">Requested Location</div>
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

                {/* Fixed Footer Payment */}
                <div style={{ background: 'var(--rider-bg-input)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--rider-border)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '6px', borderRadius: '4px' }}>
                            <CreditCard size={16} color="#10b981" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--rider-text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>WALLET BALANCE</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Account</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--rider-text-muted)' }}>FARE</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                            {tripDetails?.fare ? `$${tripDetails.fare.toFixed(2)}` : '--'}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
