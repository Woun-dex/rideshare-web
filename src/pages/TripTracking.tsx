import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetTrip, useCancelTrip } from '../hooks/useTripHooks';
import { useWebSocket } from '../hooks/useWebSocket';
import TripMap from '../components/TripMap';
import { ArrowLeft, Share2, Shield, MessageSquare, Phone, CloudRain, CheckCircle, Car, CreditCard } from 'lucide-react';
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
        const handleDriverLocation = (payload: any) => setRealtimeLocation({ lat: payload.lat, lng: payload.lng });
        const handleStatusChange = (payload: any) => setRealtimeStatus(payload.status);

        on('DRIVER_LOCATION_UPDATE', handleDriverLocation);
        on('TRIP_STATUS_UPDATE', handleStatusChange);

        return () => {
            off('DRIVER_LOCATION_UPDATE', handleDriverLocation);
            off('TRIP_STATUS_UPDATE', handleStatusChange);
        };
    }, [isConnected, on, off]);

    if (isLoading) return <div style={{ color: 'white', padding: '50px' }}>Loading Tracker...</div>;

    const currentStatus = realtimeStatus || tripDetails?.status || 'FINDING DRIVER';
    // Dummy driver lat/lng falling back to an initial position near dropoff to demonstrate animation
    const showLocation = realtimeLocation || { lat: 40.7300, lng: -73.9900 };

    return (
        <div className="rider-layout">

            {/* Background Fullscreen Map */}
            <div className="rider-map-layer">
                <TripMap
                    pickupLat={tripDetails?.pickupLat || 40.7128}
                    pickupLng={tripDetails?.pickupLng || -74.0060}
                    dropoffLat={tripDetails?.dropoffLat || 40.7580}
                    dropoffLng={tripDetails?.dropoffLng || -73.9855}
                    driverLat={showLocation.lat}
                    driverLng={showLocation.lng}
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
                            <span className="eta-label">ESTIMATED ARRIVAL</span>
                            <span style={{ fontSize: '0.75rem', background: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>PRIORITY PICKUP</span>
                        </div>
                        <div className="eta-time">4 <span style={{ fontSize: '1.2rem', color: '#60a5fa' }}>mins</span></div>
                        <div className="eta-desc">Marcus is 1.2 miles away and heading your way. Status: {currentStatus}</div>
                    </div>

                    {/* Driver Section */}
                    <div className="driver-card">
                        <div className="driver-avatar">
                            {/* Insert real driver pic here */}
                            <img src="https://i.pravatar.cc/100?img=11" alt="driver" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                            <div className="driver-badge"><CheckCircle size={12} color="white" /></div>
                        </div>
                        <div className="driver-info">
                            <h3>Marcus Richardson</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--rider-text-muted)' }}>
                                <span style={{ color: '#f59e0b', fontWeight: 600 }}>★ 4.9</span>
                                <span>• 2,450 Trips</span>
                            </div>
                        </div>
                    </div>

                    {/* Car Details */}
                    <div className="car-card">
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--rider-text-muted)', marginBottom: '8px' }}>YOUR RIDE</div>
                        <div className="car-title">Tesla Model 3</div>
                        <div className="car-color">Midnight Silver Metallic</div>
                        <div className="car-plate">7YJR842</div>
                    </div>

                    {/* Timeline */}
                    <div className="timeline">
                        <div className="timeline-item">
                            <div className="time-dot active" />
                            <div className="timeline-label">CURRENT LOCATION</div>
                            <div className="timeline-text">Main St & 5th Ave Intersection</div>
                        </div>
                        <div className="timeline-item">
                            <div className="time-dot" style={{ background: 'transparent' }} />
                            <div className="timeline-label" style={{ color: 'var(--rider-text-muted)' }}>PICKUP POINT</div>
                            <div className="timeline-text">1244 Grand Central Terminal, NY</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="tracking-actions">
                        <button><Share2 size={18} /> Share Trip</button>
                        <button><Shield size={18} /> Safety</button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                        <button className="message-btn"><MessageSquare size={18} /> Message Marcus</button>
                        <button className="call-btn"><Phone size={20} /></button>
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

                {/* Fixed Footer Payment Receipt Style */}
                <div style={{ background: 'var(--rider-bg-input)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--rider-border)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#2563eb', padding: '6px', borderRadius: '4px' }}><CreditCard size={16} color="white" /></div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--rider-text-muted)' }}>PAYMENT</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Visa •••• 4242</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--rider-text-muted)' }}>FARE</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>$24.50</div>
                    </div>
                </div>

            </div>

        </div>
    );
}
