import { useState, useEffect, useRef, useCallback } from 'react';
import { tripApi } from '../api/tripApi';
import { driverApi } from '../api/driverApi';
import { locationApi } from '../api/locationApi';
import { WebSocketClient } from '../api/websocketClient';
import {
    Car, User, MapPin, Play, CheckCircle, XCircle,
    Radio, Send, Star, ToggleLeft, ToggleRight, Terminal, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import '../mock-test.css';

interface LogEntry {
    time: string;
    source: 'rider' | 'driver' | 'system';
    message: string;
}

// Default NYC coordinates for mock testing
const NYC_PICKUP = { lat: 40.7484, lng: -73.9857 }; // Empire State Building
const NYC_DROPOFF = { lat: 40.7580, lng: -73.9855 }; // Times Square

export default function MockTestHarness() {
    // ─── Identity ───────────────────────────────────────────
    const [riderId, setRiderId] = useState(localStorage.getItem('userId') || '');
    const [driverId, setDriverId] = useState('');

    // ─── Rider State ────────────────────────────────────────
    const [pickupLat, setPickupLat] = useState(NYC_PICKUP.lat);
    const [pickupLng, setPickupLng] = useState(NYC_PICKUP.lng);
    const [dropoffLat, setDropoffLat] = useState(NYC_DROPOFF.lat);
    const [dropoffLng, setDropoffLng] = useState(NYC_DROPOFF.lng);
    const [tripId, setTripId] = useState<string | null>(null);
    const [tripStatus, setTripStatus] = useState<string>('IDLE');
    const [tripDetails, setTripDetails] = useState<any>(null);
    const [riderLoading, setRiderLoading] = useState(false);
    const [rating, setRating] = useState(0);

    // ─── Driver State ───────────────────────────────────────
    const [isOnline, setIsOnline] = useState(false);
    const [driverLoading, setDriverLoading] = useState(false);
    const [tripOffer, setTripOffer] = useState<any>(null);
    const [mockLocStep, setMockLocStep] = useState(0);
    const [driverWsConnected, setDriverWsConnected] = useState(false);

    // ─── WebSocket Refs ─────────────────────────────────────
    const riderWsRef = useRef<WebSocketClient | null>(null);
    const driverWsRef = useRef<WebSocketClient | null>(null);
    const [riderWsConnected, setRiderWsConnected] = useState(false);

    // ─── Event Log ──────────────────────────────────────────
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logOpen, setLogOpen] = useState(true);
    const logEndRef = useRef<HTMLDivElement>(null);

    // ─── Polling ────────────────────────────────────────────
    const pollRef = useRef<number | null>(null);

    const addLog = useCallback((source: LogEntry['source'], message: string) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-200), { time, source, message }]);
    }, []);

    // Auto-scroll log
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // ═══════════════════════════════════════════════════════
    //  RIDER ACTIONS
    // ═══════════════════════════════════════════════════════

    const handleRequestTrip = async () => {
        if (!riderId) { addLog('system', '⚠ Set a Rider ID first'); return; }
        setRiderLoading(true);
        addLog('rider', `Requesting trip: (${pickupLat}, ${pickupLng}) → (${dropoffLat}, ${dropoffLng})`);

        // Temporarily set localStorage so the API reads the correct rider
        const prevUserId = localStorage.getItem('userId');
        localStorage.setItem('userId', riderId);

        try {
            const trip = await tripApi.requestTrip({ pickupLat, pickupLng, dropoffLat, dropoffLng });
            setTripId(trip.id);
            setTripStatus(trip.status);
            setTripDetails(trip);
            addLog('rider', `✅ Trip created: ${trip.id} — Status: ${trip.status}`);
            startPolling(trip.id);
        } catch (err: any) {
            addLog('rider', `❌ Request failed: ${err.message || err}`);
        } finally {
            if (prevUserId) localStorage.setItem('userId', prevUserId);
            else localStorage.removeItem('userId');
            setRiderLoading(false);
        }
    };

    // ─── Rider WebSocket ────────────────────────────────────
    useEffect(() => {
        if (!tripId || !riderId) return;

        const ws = new WebSocketClient({
            path: `/ws/track/${tripId}`,
            queryParams: { userId: riderId, riderId },
            onConnect: () => {
                setRiderWsConnected(true);
                addLog('rider', `🔌 WS connected to /ws/track/${tripId}`);
            },
            onDisconnect: () => {
                setRiderWsConnected(false);
                addLog('rider', `🔌 WS disconnected from /ws/track/${tripId}`);
            },
            onMessage: (data) => {
                const type = data.eventType || data.type || 'unknown';
                addLog('rider', `📨 WS [${type}]: ${JSON.stringify(data).substring(0, 150)}`);
                if (type === 'STATUS_CHANGED' && data.status) {
                    setTripStatus(data.status);
                }
            }
        });
        ws.connect();
        riderWsRef.current = ws;

        return () => {
            ws.close();
            riderWsRef.current = null;
            setRiderWsConnected(false);
        };
    }, [tripId, riderId]);

    // ─── Trip Polling ───────────────────────────────────────
    const startPolling = (id: string) => {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = window.setInterval(async () => {
            try {
                const trip = await tripApi.getTrip(id);
                setTripDetails(trip);
                setTripStatus(trip.status);
                if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
                    if (pollRef.current) window.clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            } catch { /* silent */ }
        }, 3000);
    };

    useEffect(() => {
        return () => {
            if (pollRef.current) window.clearInterval(pollRef.current);
        };
    }, []);

    const handleCancelTrip = async () => {
        if (!tripId) return;
        try {
            await tripApi.cancelTrip(tripId);
            setTripStatus('CANCELLED');
            addLog('rider', `🚫 Trip ${tripId} cancelled.`);
        } catch (err: any) {
            addLog('rider', `❌ Cancel failed: ${err.message}`);
        }
    };

    const handleRateTrip = async () => {
        if (!tripId || rating === 0) return;
        try {
            await tripApi.rateTrip(tripId, { rating });
            addLog('rider', `⭐ Rated trip ${tripId}: ${rating} stars`);
        } catch (err: any) {
            addLog('rider', `❌ Rating failed: ${err.message}`);
        }
    };

    // ═══════════════════════════════════════════════════════
    //  DRIVER ACTIONS
    // ═══════════════════════════════════════════════════════

    const handleToggleOnline = async () => {
        if (!driverId) { addLog('system', '⚠ Set a Driver ID first'); return; }
        const newStatus = !isOnline;
        setDriverLoading(true);

        const prevUserId = localStorage.getItem('userId');
        localStorage.setItem('userId', driverId);

        try {
            await driverApi.updateStatus({ status: newStatus ? 'ONLINE' : 'OFFLINE' });
            setIsOnline(newStatus);
            addLog('driver', `${newStatus ? '🟢' : '🔴'} Driver status: ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
        } catch (err: any) {
            addLog('driver', `❌ Status update failed: ${err.message}`);
        } finally {
            if (prevUserId) localStorage.setItem('userId', prevUserId);
            else localStorage.removeItem('userId');
            setDriverLoading(false);
        }
    };

    // ─── Driver WebSocket ───────────────────────────────────
    useEffect(() => {
        if (!isOnline || !driverId) {
            if (driverWsRef.current) {
                driverWsRef.current.close();
                driverWsRef.current = null;
                setDriverWsConnected(false);
            }
            return;
        }

        const ws = new WebSocketClient({
            path: '/ws/driver/notifications',
            queryParams: { driverId },
            onConnect: () => {
                setDriverWsConnected(true);
                addLog('driver', '🔌 WS connected to /ws/driver/notifications');
            },
            onDisconnect: () => {
                setDriverWsConnected(false);
                addLog('driver', '🔌 WS disconnected from /ws/driver/notifications');
            },
            onMessage: (data) => {
                const type = data.eventType || data.type || 'unknown';
                addLog('driver', `📨 WS [${type}]: ${JSON.stringify(data).substring(0, 150)}`);
                if (type === 'TRIP_REQUESTED') {
                    setTripOffer(data);
                    addLog('driver', `🔔 NEW TRIP OFFER received! Trip: ${data.tripId}`);
                }
            }
        });
        ws.connect();
        driverWsRef.current = ws;

        return () => {
            ws.close();
            driverWsRef.current = null;
            setDriverWsConnected(false);
        };
    }, [isOnline, driverId]);

    const handleAcceptTrip = async () => {
        if (!tripOffer?.tripId || !driverId) return;
        const acceptId = tripOffer.tripId;

        const prevUserId = localStorage.getItem('userId');
        localStorage.setItem('userId', driverId);

        try {
            await tripApi.acceptTrip(acceptId);
            addLog('driver', `✅ Accepted trip: ${acceptId}`);
            setTripOffer(null);
            if (!tripId) setTripId(acceptId);
        } catch (err: any) {
            addLog('driver', `❌ Accept failed: ${err.message}`);
        } finally {
            if (prevUserId) localStorage.setItem('userId', prevUserId);
            else localStorage.removeItem('userId');
        }
    };

    const handleDeclineTrip = () => {
        addLog('driver', `🚫 Declined trip: ${tripOffer?.tripId}`);
        setTripOffer(null);
    };

    // ─── Mock Location Sending ──────────────────────────────
    const sendMockLocation = async () => {
        if (!driverId) { addLog('system', '⚠ Set a Driver ID first'); return; }

        // Interpolate between pickup and dropoff in 10 steps
        const totalSteps = 10;
        const step = Math.min(mockLocStep, totalSteps);
        const t = step / totalSteps;

        const currentLat = pickupLat + (dropoffLat - pickupLat) * t;
        const currentLng = pickupLng + (dropoffLng - pickupLng) * t;

        try {
            await locationApi.updateLocation({
                driverId,
                lat: currentLat,
                lng: currentLng,
                timestamp: new Date().toISOString(),
                tripId: tripId || undefined,
                heading: 0,
                speed: 30
            });
            addLog('driver', `📍 Location sent: (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}) [step ${step}/${totalSteps}]`);
            setMockLocStep(prev => prev + 1);
        } catch (err: any) {
            addLog('driver', `❌ Location update failed: ${err.message}`);
        }
    };

    const handleStartTrip = async () => {
        const id = tripOffer?.tripId || tripId;
        if (!id) { addLog('system', '⚠ No active trip to start'); return; }
        try {
            await tripApi.updateStatus(id, { status: 'IN_PROGRESS' });
            setTripStatus('IN_PROGRESS');
            addLog('driver', `▶ Trip ${id} started (IN_PROGRESS)`);
        } catch (err: any) {
            addLog('driver', `❌ Start failed: ${err.message}`);
        }
    };

    const handleCompleteTrip = async () => {
        const id = tripOffer?.tripId || tripId;
        if (!id) { addLog('system', '⚠ No active trip to complete'); return; }
        try {
            await tripApi.updateStatus(id, { status: 'COMPLETED' });
            setTripStatus('COMPLETED');
            addLog('driver', `✅ Trip ${id} completed!`);
        } catch (err: any) {
            addLog('driver', `❌ Complete failed: ${err.message}`);
        }
    };

    const handleResetAll = () => {
        // Close websockets
        riderWsRef.current?.close();
        driverWsRef.current?.close();
        if (pollRef.current) window.clearInterval(pollRef.current);

        setTripId(null);
        setTripStatus('IDLE');
        setTripDetails(null);
        setTripOffer(null);
        setIsOnline(false);
        setMockLocStep(0);
        setRating(0);
        setRiderWsConnected(false);
        setDriverWsConnected(false);
        addLog('system', '🔄 All state reset.');
    };

    const statusClass = tripStatus.toLowerCase().replace(' ', '_');

    return (
        <div className="test-harness">

            {/* ═══ Header ═══ */}
            <div className="test-header">
                <h1>
                    <Zap size={18} />
                    <span>Test Harness</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, WebkitTextFillColor: '#64748b' }}>
                        Trip Lifecycle Simulator
                    </span>
                </h1>
                <div className="test-header-actions">
                    <div className="id-group">
                        <label>Rider ID</label>
                        <input
                            className="id-input"
                            value={riderId}
                            onChange={e => setRiderId(e.target.value)}
                            placeholder="Enter rider user ID..."
                        />
                    </div>
                    <div className="id-group">
                        <label>Driver ID</label>
                        <input
                            className="id-input"
                            value={driverId}
                            onChange={e => setDriverId(e.target.value)}
                            placeholder="Enter driver user ID..."
                        />
                    </div>
                    <button className="test-btn outline" onClick={handleResetAll} style={{ padding: '8px 14px', marginTop: '14px' }}>
                        Reset All
                    </button>
                </div>
            </div>

            {/* ═══ Split Panels ═══ */}
            <div className="test-panels">

                {/* ─── RIDER PANEL ─── */}
                <div className="test-panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <div className="icon-badge rider"><User size={16} /></div>
                            RIDER
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {riderWsConnected && <span className="status-chip connected">WS Live</span>}
                            <span className={`status-chip ${statusClass}`}>{tripStatus}</span>
                        </div>
                    </div>
                    <div className="panel-body">

                        {/* Coordinates */}
                        <div className="section-label">Pickup Location</div>
                        <div className="coord-grid">
                            <div className="coord-field">
                                <label>Latitude</label>
                                <input type="number" step="0.0001" value={pickupLat} onChange={e => setPickupLat(+e.target.value)} />
                            </div>
                            <div className="coord-field">
                                <label>Longitude</label>
                                <input type="number" step="0.0001" value={pickupLng} onChange={e => setPickupLng(+e.target.value)} />
                            </div>
                        </div>

                        <div className="section-label">Dropoff Location</div>
                        <div className="coord-grid">
                            <div className="coord-field">
                                <label>Latitude</label>
                                <input type="number" step="0.0001" value={dropoffLat} onChange={e => setDropoffLat(+e.target.value)} />
                            </div>
                            <div className="coord-field">
                                <label>Longitude</label>
                                <input type="number" step="0.0001" value={dropoffLng} onChange={e => setDropoffLng(+e.target.value)} />
                            </div>
                        </div>

                        {/* Request Button */}
                        <button
                            className="test-btn primary"
                            onClick={handleRequestTrip}
                            disabled={riderLoading || !!tripId}
                        >
                            {riderLoading ? <><span className="spinner-sm" /> Requesting...</> : <><MapPin size={16} /> Request Trip</>}
                        </button>

                        {/* Trip Info */}
                        {tripId && (
                            <>
                                <div className="mock-divider" />
                                <div className="info-card">
                                    <div className="info-row">
                                        <span className="info-label">Trip ID</span>
                                        <span className="info-value">{tripId.substring(0, 12)}...</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Status</span>
                                        <span className={`status-chip ${statusClass}`}>{tripStatus}</span>
                                    </div>
                                    {tripDetails?.driverId && (
                                        <div className="info-row">
                                            <span className="info-label">Driver</span>
                                            <span className="info-value">{tripDetails.driverId.substring(0, 12)}...</span>
                                        </div>
                                    )}
                                    {tripDetails?.fare != null && (
                                        <div className="info-row">
                                            <span className="info-label">Fare</span>
                                            <span className="info-value">${tripDetails.fare.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Cancel */}
                                {tripStatus !== 'COMPLETED' && tripStatus !== 'CANCELLED' && (
                                    <button className="test-btn red" onClick={handleCancelTrip}>
                                        <XCircle size={16} /> Cancel Trip
                                    </button>
                                )}

                                {/* Rating */}
                                {tripStatus === 'COMPLETED' && (
                                    <div>
                                        <div className="section-label">Rate This Trip</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                                            <div className="rating-stars">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button key={s} onClick={() => setRating(s)}>
                                                        <Star size={22} fill={s <= rating ? '#ebb305' : 'none'} color={s <= rating ? '#ebb305' : '#475569'} />
                                                    </button>
                                                ))}
                                            </div>
                                            <button className="test-btn primary" onClick={handleRateTrip} disabled={rating === 0} style={{ padding: '8px 16px' }}>
                                                Submit
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* ─── DRIVER PANEL ─── */}
                <div className="test-panel">
                    <div className="panel-header">
                        <div className="panel-title">
                            <div className="icon-badge driver"><Car size={16} /></div>
                            DRIVER
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {driverWsConnected && <span className="status-chip connected">WS Live</span>}
                            <span className={`status-chip ${isOnline ? 'online' : 'offline'}`}>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                    <div className="panel-body">

                        {/* Online Toggle */}
                        <button
                            className={`test-btn ${isOnline ? 'red' : 'green'}`}
                            onClick={handleToggleOnline}
                            disabled={driverLoading}
                        >
                            {driverLoading ? <span className="spinner-sm" /> : isOnline ? <><ToggleRight size={16} /> Go Offline</> : <><ToggleLeft size={16} /> Go Online</>}
                        </button>

                        {/* Trip Offer */}
                        {tripOffer && (
                            <>
                                <div className="mock-offer-card">
                                    <div className="offer-title"><Radio size={14} /> INCOMING TRIP OFFER</div>
                                    <div className="offer-detail">Trip: {tripOffer.tripId?.substring(0, 16)}...</div>
                                    <div className="offer-detail">Rider: {tripOffer.riderId?.substring(0, 16) || 'unknown'}...</div>
                                    {tripOffer.pickup && (
                                        <div className="offer-detail">
                                            Pickup: ({tripOffer.pickup.latitude?.toFixed(4)}, {tripOffer.pickup.longitude?.toFixed(4)})
                                        </div>
                                    )}
                                    {tripOffer.dropoff && (
                                        <div className="offer-detail">
                                            Dropoff: ({tripOffer.dropoff.latitude?.toFixed(4)}, {tripOffer.dropoff.longitude?.toFixed(4)})
                                        </div>
                                    )}
                                    {tripOffer.fare != null && <div className="offer-detail">Fare: ${tripOffer.fare.toFixed(2)}</div>}
                                </div>
                                <div className="btn-row">
                                    <button className="test-btn green" onClick={handleAcceptTrip}>
                                        <CheckCircle size={16} /> Accept
                                    </button>
                                    <button className="test-btn red" onClick={handleDeclineTrip}>
                                        <XCircle size={16} /> Decline
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="mock-divider" />

                        {/* Location Simulation */}
                        <div className="section-label">Location Simulation</div>
                        <div className="loc-sim">
                            <div className="dot" />
                            Step {mockLocStep} / 10 — Simulating driver movement
                        </div>
                        <button className="test-btn blue" onClick={sendMockLocation} disabled={!driverId}>
                            <Send size={16} /> Send Mock Location
                        </button>

                        <div className="mock-divider" />

                        {/* Lifecycle Actions */}
                        <div className="section-label">Trip Lifecycle</div>
                        <div className="btn-row">
                            <button
                                className="test-btn green"
                                onClick={handleStartTrip}
                                disabled={!tripId && !tripOffer}
                            >
                                <Play size={16} /> Start Trip
                            </button>
                            <button
                                className="test-btn primary"
                                onClick={handleCompleteTrip}
                                disabled={!tripId && !tripOffer}
                            >
                                <CheckCircle size={16} /> Complete
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Event Log ═══ */}
            <div className="event-log-container">
                <div className="event-log-header" onClick={() => setLogOpen(!logOpen)}>
                    <h3>
                        <Terminal size={14} />
                        EVENT LOG
                        <span className="event-count">{logs.length}</span>
                    </h3>
                    {logOpen ? <ChevronDown size={16} color="#64748b" /> : <ChevronUp size={16} color="#64748b" />}
                </div>
                {logOpen && (
                    <div className="event-log-body">
                        {logs.length === 0 && (
                            <div style={{ color: '#475569', fontSize: '0.78rem', padding: '12px 0', textAlign: 'center' }}>
                                No events yet. Start by requesting a trip or going online as a driver.
                            </div>
                        )}
                        {logs.map((log, i) => (
                            <div className="log-entry" key={i}>
                                <span className="log-time">{log.time}</span>
                                <span className={`log-source ${log.source}`}>{log.source.toUpperCase()}</span>
                                <span className="log-msg">{log.message}</span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                )}
            </div>
        </div>
    );
}
