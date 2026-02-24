import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Navigation, Star, XCircle, User, ArrowLeft } from 'lucide-react';
import TripMap from '../components/TripMap';
import { useDriverLocationTracking } from '../hooks/useDriverLocationTracking';
import { useGetTrip, useUpdateTripStatus, useCancelTrip } from '../hooks/useTripHooks';
import { useUserById } from '../api/userApi';
import '../driver-tracking.css';

export default function DriverTracking() {
    const { tripId } = useParams<{ tripId: string }>();
    const navigate = useNavigate();

    const { data: tripData, isLoading, isError } = useGetTrip(tripId || '', !!tripId, 5000);
    const updateTripStatus = useUpdateTripStatus();
    const { mutate: cancelTrip, isPending: isCancelling } = useCancelTrip();

    const [etaMins, setEtaMins] = useState(0);
    const [distanceMi, setDistanceMi] = useState(0);

    const driverId = localStorage.getItem('userId') || '';

    // Real-time GPS Tracking
    const { lat: driverLat, lng: driverLng } = useDriverLocationTracking({
        driverId,
        tripId: tripData?.id || '',
        isTracking: tripData?.status === 'ASSIGNED' || tripData?.status === 'IN_PROGRESS',
        intervalMs: 5000
    });

    // Fetch rider profile
    const riderId = tripData?.riderId || '';
    const { data: riderProfile } = useUserById(riderId, !!riderId);

    // ─── Phase Logic ───────────────────────────────────────────
    const isHeadingToPickup = tripData?.status === 'ASSIGNED' || tripData?.status === 'REQUESTED';
    const isInProgress = tripData?.status === 'IN_PROGRESS';
    const isCompleted = tripData?.status === 'COMPLETED';

    const handleStartTrip = () => {
        if (!tripData) return;
        updateTripStatus.mutate(
            { id: tripData.id, data: { status: 'IN_PROGRESS' } },
            { onError: () => alert('Failed to start trip.') }
        );
    };

    const handleCompleteTrip = () => {
        if (!tripData) return;
        updateTripStatus.mutate(
            { id: tripData.id, data: { status: 'COMPLETED' } },
            {
                onSuccess: () => navigate('/driver'),
                onError: () => alert('Failed to complete trip.')
            }
        );
    };

    const handleCancelTrip = () => {
        if (!tripData) return;
        if (!window.confirm('Are you sure you want to cancel this trip?')) return;
        cancelTrip(tripData.id, {
            onSuccess: () => navigate('/driver'),
            onError: () => alert('Failed to cancel trip.')
        });
    };

    if (isLoading) {
        return (
            <div className="driver-tracking-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid rgba(235,179,5,0.3)', borderTopColor: '#ebb305', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading trip...</div>
                </div>
            </div>
        );
    }
    if (isError || !tripData) {
        return (
            <div className="driver-tracking-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: '#ef4444' }}>Error loading trip.</div>
            </div>
        );
    }

    // ─── Map Coordinates ───────────────────────────────────────
    const hasGps = !!(driverLat && driverLng);
    const effectiveDriverLat = driverLat || tripData.pickupLat || 40.7484;
    const effectiveDriverLng = driverLng || tripData.pickupLng || -73.9857;
    const destLat = isHeadingToPickup ? tripData.pickupLat : tripData.dropoffLat;
    const destLng = isHeadingToPickup ? tripData.pickupLng : tripData.dropoffLng;

    const riderName = riderProfile?.name || `Rider ${tripData.riderId?.substring(0, 8) || ''}`;
    const statusLabel = isHeadingToPickup ? 'HEADING TO PICKUP' : isInProgress ? 'TRIP IN PROGRESS' : isCompleted ? 'TRIP COMPLETED' : tripData.status;
    const destLabel = isHeadingToPickup ? 'PICKUP LOCATION' : 'DROP-OFF LOCATION';
    const progressSegments = isCompleted ? 3 : isInProgress ? 2 : 1;
    const isBusy = updateTripStatus.isPending || isCancelling;

    return (
        <div className="driver-tracking-layout">
            {/* ── Full-Screen Map ── */}
            <div className="driver-tracking-map">
                <TripMap
                    isTracking={true}
                    driverLat={effectiveDriverLat}
                    driverLng={effectiveDriverLng}
                    pickupLat={tripData.pickupLat}
                    pickupLng={tripData.pickupLng}
                    dropoffLat={tripData.dropoffLat}
                    dropoffLng={tripData.dropoffLng}
                    routeStartLat={hasGps ? effectiveDriverLat : undefined}
                    routeStartLng={hasGps ? effectiveDriverLng : undefined}
                    routeEndLat={hasGps ? destLat : undefined}
                    routeEndLng={hasGps ? destLng : undefined}
                    onRouteCalculated={(dist, dur) => {
                        setDistanceMi(Number(dist.toFixed(1)));
                        setEtaMins(Math.round(dur));
                    }}
                />
            </div>

            {/* ── Top Left: Status HUD ── */}
            <div className="tracking-hud-top-left">
                <div className="nav-direction-icon" onClick={() => navigate('/driver')} style={{ cursor: 'pointer' }}>
                    <ArrowLeft size={22} color="#94a3b8" />
                </div>
                <div>
                    <div className="nav-distance-next" style={{ color: isHeadingToPickup ? '#10b981' : isInProgress ? '#ebb305' : '#a78bfa' }}>
                        {statusLabel}
                    </div>
                    <div className="nav-street-next">
                        {isHeadingToPickup ? 'Navigate to rider pickup' : isInProgress ? 'En route to destination' : 'Trip finished'}
                    </div>
                </div>
            </div>

            {/* ── Top Right: ETA / Distance ── */}
            <div className="tracking-hud-top-right">
                <div className="eta-block">
                    <div className="eta-label">ETA</div>
                    <div className="eta-value">{etaMins > 0 ? `${etaMins}m` : '--'}</div>
                </div>
                <div className="dist-block">
                    <div className="eta-label">Distance</div>
                    <div className="eta-value">{distanceMi > 0 ? `${distanceMi} mi` : '--'}</div>
                </div>
                <button className="recenter-btn">
                    <Navigation size={18} />
                </button>
            </div>

            {/* ── Bottom Dashboard Panel ── */}
            <div className="tracking-dashboard">
                {/* Rider Card */}
                <div className="rider-card">
                    <div className="rider-avatar-wrapper">
                        <div style={{
                            width: 52, height: 52, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid rgba(139, 92, 246, 0.4)'
                        }}>
                            <User size={12} color="white" />
                        </div>
                        <div className="rating-badge">
                            5.0 <Star size={8} fill="#0f172a" />
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div className="rider-name-large">{riderName}</div>
                        {riderProfile?.phone && (
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                                {riderProfile.phone}
                            </div>
                        )}
                    </div>
                    <div className="rider-actions">
                        <button className="action-btn call"><Navigation size={14} style={{ transform: 'rotate(90deg)' }} /></button>
                        <button className="action-btn msg"><MessageSquare size={14} /></button>
                    </div>
                </div>

                {/* Destination Info */}
                <div className="trip-destination-info">
                    <div className="dest-label">
                        <div className="dest-dot" style={{ background: isHeadingToPickup ? '#10b981' : '#6366f1' }} />
                        {destLabel}
                    </div>
                    <div className="trip-meta">
                        <span className="status-badge" style={{
                            background: isInProgress ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: isInProgress ? '#34d399' : '#60a5fa'
                        }}>
                            {tripData.status}
                        </span>
                        <span className="meta-text">
                            {etaMins > 0 ? `${etaMins} mins remaining` : 'Calculating...'} • {distanceMi > 0 ? `${distanceMi} mi` : '--'}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="trip-progress-bar">
                    <div className="progress-label">Trip progress</div>
                    <div className="progress-segments">
                        <div className={`segment ${progressSegments >= 1 ? 'active' : ''}`} />
                        <div className={`segment ${progressSegments >= 2 ? 'active' : ''}`} />
                        <div className={`segment ${progressSegments >= 3 ? 'active' : ''}`} />
                    </div>
                </div>

                {/* ── Action Buttons ── */}
                {isHeadingToPickup && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="confirm-arrival-btn" onClick={handleStartTrip} disabled={isBusy}>
                            {updateTripStatus.isPending ? 'Starting...' : '  Start Trip'}
                        </button>
                        <button
                            className="confirm-arrival-btn" onClick={handleCancelTrip} disabled={isBusy}
                            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 6px 20px rgba(239,68,68,0.3)' }}
                        >
                            {isCancelling ? '...' : <><XCircle size={16} /> Cancel</>}
                        </button>
                    </div>
                )}

                {isInProgress && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="confirm-arrival-btn" onClick={handleCompleteTrip} disabled={isBusy}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 6px 20px rgba(16,185,129,0.3)' }}
                        >
                            {updateTripStatus.isPending ? 'Completing...' : '✅  Complete Trip'}
                        </button>
                        <button
                            className="confirm-arrival-btn" onClick={handleCancelTrip} disabled={isBusy}
                            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 6px 20px rgba(239,68,68,0.3)' }}
                        >
                            {isCancelling ? '...' : <><XCircle size={16} /> Cancel</>}
                        </button>
                    </div>
                )}

                {isCompleted && (
                    <button
                        className="confirm-arrival-btn" onClick={() => navigate('/driver')}
                        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 6px 20px rgba(99,102,241,0.3)' }}
                    >
                        Back to Dashboard
                    </button>
                )}
            </div>
        </div>
    );
}
