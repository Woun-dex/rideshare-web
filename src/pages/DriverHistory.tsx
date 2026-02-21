import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Bell, ChevronLeft, ChevronRight, MessageSquare, CreditCard, RotateCcw } from 'lucide-react';
import TripMap from '../components/TripMap';
import { useGetTripHistory } from '../hooks/useTripHooks';
import '../driver-history.css';

export default function DriverHistory() {
    const navigate = useNavigate();
    const { data: historyData, isLoading, isError } = useGetTripHistory();

    const trips = useMemo(() => {
        if (!historyData) return [];
        return historyData.map((trip) => ({
            id: trip.id,
            dateStr: new Date(trip.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            timeStr: new Date(trip.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            // Given the limited DTO, we fallback to placeholder strings for UI addresses currently
            pickupShort: `Lat: ${trip.pickupLat.toFixed(2)}, Lng: ${trip.pickupLng.toFixed(2)}`,
            dropoffShort: `Lat: ${trip.dropoffLat.toFixed(2)}, Lng: ${trip.dropoffLng.toFixed(2)}`,
            pickupFull: `Lat: ${trip.pickupLat.toFixed(2)}, Lng: ${trip.pickupLng.toFixed(2)}`,
            dropoffFull: `Lat: ${trip.dropoffLat.toFixed(2)}, Lng: ${trip.dropoffLng.toFixed(2)}`,
            fare: trip.fare || 0,
            rating: 5.0, // Mock
            status: trip.status,
            distanceMi: 5.0, // Mock
            baseFare: (trip.fare || 0) * 0.7,
            serviceFee: (trip.fare || 0) * 0.2,
            taxes: (trip.fare || 0) * 0.1,
            riderName: 'Rider ' + trip.riderId.substring(0, 4),
            riderRating: 4.8, // Mock
            vehicleType: 'STANDARD',
            requestedTime: new Date(trip.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            arrivedTime: '--',
            pickupLat: trip.pickupLat,
            pickupLng: trip.pickupLng,
            dropoffLat: trip.dropoffLat,
            dropoffLng: trip.dropoffLng,
        }));
    }, [historyData]);

    const [selectedTripId, setSelectedTripId] = useState<string>('');
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        if (trips.length > 0 && !selectedTripId) {
            setSelectedTripId(trips[0].id);
        }
    }, [trips, selectedTripId]);

    const selectedTrip = trips.find(t => t.id === selectedTripId) || trips[0];

    // Simulate loading details toast when changing trips
    useEffect(() => {
        if (!selectedTripId) return;
        setShowToast(false);
        const timer = setTimeout(() => setShowToast(true), 300);
        const hideTimer = setTimeout(() => setShowToast(false), 3000);
        return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }, [selectedTripId]);

    if (isLoading) return <div className="history-layout"><div style={{ padding: '2rem', color: 'white' }}>Loading history...</div></div>;
    if (isError) return <div className="history-layout"><div style={{ padding: '2rem', color: 'white' }}>Error loading history.</div></div>;

    const Header = () => (
        <header className="history-header">
            <div className="header-logo" onClick={() => navigate('/driver')} style={{ cursor: 'pointer' }}>
                <div className="car-icon-box-blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>
                </div>
                RIDEFLOW
            </div>
            <nav className="header-nav">
                <a onClick={() => navigate('/driver')} style={{ cursor: 'pointer' }}>Dashboard</a>
                <a className="active">Trips</a>
                <a>Wallet</a>
            </nav>
            <div className="header-user-actions">
                <button className="icon-only-btn"><Bell size={18} /></button>
                <div className="user-profile-badge" onClick={() => navigate('/profile')}>
                    <div className="user-text">
                        <div className="name">User</div>
                        <div className="status">Driver</div>
                    </div>
                    <img src="https://i.pravatar.cc/100?img=11" alt="Driver" className="avatar" />
                </div>
            </div>
        </header>
    );

    if (trips.length === 0) {
        return (
            <div className="history-layout">
                <Header />
                <main className="history-main-content">
                    <section className="trip-list-section">
                        <div className="list-header-row">
                            <div>
                                <h1 className="page-title">Trip History</h1>
                                <p className="page-subtitle">No trips found</p>
                            </div>
                        </div>
                        <div className="trip-table">
                            <div className="table-body" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                You have not completed any trips yet.
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        );
    }

    return (
        <div className="history-layout">
            <Header />

            <main className="history-main-content">

                {/* Left Column: Trip List */}
                <section className="trip-list-section">

                    <div className="list-header-row">
                        <div>
                            <h1 className="page-title">Trip History</h1>
                            <p className="page-subtitle">You have {trips.length} recent trips</p>
                        </div>
                        <div className="list-controls">
                            <div className="search-box">
                                <Search size={16} color="#64748b" />
                                <input type="text" placeholder="Search trips..." />
                            </div>
                            <button className="filter-btn">
                                <Filter size={16} /> Filter
                            </button>
                        </div>
                    </div>

                    <div className="trip-table">
                        <div className="table-header">
                            <div className="col-date">DATE & TIME</div>
                            <div className="col-route">ROUTE</div>
                            <div className="col-fare">FARE</div>
                            <div className="col-rating">RATING</div>
                            <div className="col-status">STATUS</div>
                        </div>

                        <div className="table-body">
                            {trips.map(trip => (
                                <div
                                    key={trip.id}
                                    className={`table-row ${selectedTripId === trip.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTripId(trip.id)}
                                >
                                    <div className="col-date">
                                        <div className="date-str">{trip.dateStr}</div>
                                        <div className="time-str">{trip.timeStr}</div>
                                    </div>
                                    <div className="col-route">
                                        <div className="route-line-small">
                                            <div className="dot blue-dot" />
                                            <div className="line" />
                                            <div className="dot filled-blue-dot" />
                                        </div>
                                        <div className="route-text">
                                            <div>{trip.pickupShort}</div>
                                            <div>{trip.dropoffShort}</div>
                                        </div>
                                    </div>
                                    <div className="col-fare font-bold">${trip.fare.toFixed(2)}</div>
                                    <div className="col-rating">
                                        {trip.rating ? (
                                            <><span className="star">★</span> {trip.rating.toFixed(1)}</>
                                        ) : (
                                            <span className="not-rated">Not rated</span>
                                        )}
                                    </div>
                                    <div className="col-status">
                                        <span className={`status-pill ${trip.status.toLowerCase()}`}>
                                            {trip.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="table-footer">
                            <div className="showing-text">Showing {trips.length} of {trips.length} trips</div>
                            <div className="pagination">
                                <button className="page-arrow"><ChevronLeft size={16} /></button>
                                <button className="page-num active">1</button>
                                <button className="page-arrow"><ChevronRight size={16} /></button>
                            </div>
                        </div>

                    </div>
                </section>


                {/* Right Column: Trip Details Sidebar */}
                <aside className="trip-details-sidebar">

                    <div className="static-map-container">
                        <div className="map-distance-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            {selectedTrip.distanceMi} mi
                        </div>
                        {/* Interactive map disabled for static preview, zoomed out to show route */}
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                            <TripMap
                                pickupLat={selectedTrip.pickupLat} pickupLng={selectedTrip.pickupLng}
                                dropoffLat={selectedTrip.dropoffLat} dropoffLng={selectedTrip.dropoffLng}
                            />
                        </div>
                        {/* Hardcoded fake path SVG for precise styling matching screenshot */}
                        <svg className="fake-route-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M 30,70 C 50,70 70,40 70,30" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        <div className="map-marker pickup-marker-static" style={{ left: '30%', top: '70%' }}>
                            <div className="tooltip">PICKUP</div>
                        </div>
                        <div className="map-marker dropoff-marker-static" style={{ left: '70%', top: '30%' }}>
                            <div className="tooltip">DROP-OFF</div>
                        </div>
                    </div>

                    <div className="details-content">

                        <div className="rider-summary-box">
                            <div className="rider-avatar-large">
                                <img src="https://i.pravatar.cc/100?img=12" alt="Rider" />
                            </div>
                            <div className="rider-info-text">
                                <div className="rider-name-bold">{selectedTrip.riderName}</div>
                                <div className="rider-meta">
                                    <span style={{ color: '#fbbf24' }}>★ {selectedTrip.riderRating}</span> • {selectedTrip.vehicleType}
                                </div>
                            </div>
                            <button className="chat-btn"><MessageSquare size={18} /></button>
                        </div>

                        <div className="timeline-section">
                            <div className="timeline-item">
                                <div className="timeline-node empty-blue" />
                                <div className="timeline-content">
                                    <div className="timeline-label">PICKUP</div>
                                    <div className="timeline-address font-bold">{selectedTrip.pickupFull}</div>
                                    <div className="timeline-time">Requested at {selectedTrip.requestedTime}</div>
                                </div>
                            </div>
                            <div className="timeline-connector" />
                            <div className="timeline-item">
                                <div className="timeline-node solid-blue" />
                                <div className="timeline-content">
                                    <div className="timeline-label">DROP-OFF</div>
                                    <div className="timeline-address font-bold">{selectedTrip.dropoffFull}</div>
                                    <div className="timeline-time">Arrived at {selectedTrip.arrivedTime}</div>
                                </div>
                            </div>
                        </div>

                        <div className="receipt-section">
                            <div className="receipt-header">RECEIPT BREAKDOWN</div>

                            <div className="receipt-row">
                                <span>Base Fare</span>
                                <span>${selectedTrip.baseFare.toFixed(2)}</span>
                            </div>
                            <div className="receipt-row">
                                <span>Distance ({selectedTrip.distanceMi} mi)</span>
                                <span>${(selectedTrip.distanceMi * 2).toFixed(2)}</span>
                            </div>
                            <div className="receipt-row">
                                <span>Service Fee</span>
                                <span>${selectedTrip.serviceFee.toFixed(2)}</span>
                            </div>
                            <div className="receipt-row border-bottom">
                                <span>Taxes & Tolls</span>
                                <span>${selectedTrip.taxes.toFixed(2)}</span>
                            </div>

                            <div className="receipt-total-row">
                                <span className="font-bold">Total Amount</span>
                                <span className="total-value">${selectedTrip.fare.toFixed(2)}</span>
                            </div>

                            <div className="payment-method-box">
                                <CreditCard size={20} color="#94a3b8" />
                                <div className="payment-details">
                                    <div className="pay-label">PAYMENT METHOD</div>
                                    <div className="pay-card">VISA •••• 4242</div>
                                </div>
                                <a href="#" className="receipt-link">Receipt PDF</a>
                            </div>

                            <div className="action-buttons-row">
                                <button className="btn-support">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                                    Support
                                </button>
                                <button className="btn-rebook">
                                    <RotateCcw size={16} />
                                    Rebook
                                </button>
                            </div>

                        </div>
                    </div>
                </aside>

            </main>

            {/* Bottom Toast Notification */}
            <div className={`toast-notification ${showToast ? 'visible' : ''}`}>
                <div className="toast-icon-check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                Trip details loaded successfully
                <button className="toast-close" onClick={() => setShowToast(false)}>×</button>
            </div>
        </div>
    );
}
