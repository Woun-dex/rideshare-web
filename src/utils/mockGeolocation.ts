/**
 * Mock Geolocation — Patches navigator.geolocation for testing without real GPS.
 *
 * RIDER:  Fixed position near the pickup (Empire State Building area).
 * DRIVER: Simulates movement from a starting point toward the rider's pickup,
 *         then toward the dropoff. Each call to watchPosition advances the position.
 *
 * Enable:  localStorage.setItem('mockGeo', 'true')   then refresh
 * Disable: localStorage.removeItem('mockGeo')        then refresh
 *
 * Customize positions:
 *   localStorage.setItem('mockGeoRider', JSON.stringify({ lat: 40.7484, lng: -73.9857 }))
 *   localStorage.setItem('mockGeoDriver', JSON.stringify({ lat: 40.7400, lng: -73.9900 }))
 */

// ─── Default Coordinates (NYC) ──────────────────────────
const DEFAULT_RIDER = { lat: 40.7484, lng: -73.9857 };   // Empire State Building
const DEFAULT_DRIVER_START = { lat: 40.7400, lng: -73.9900 }; // ~1km south-west
const DEFAULT_PICKUP = { lat: 40.7484, lng: -73.9857 };
const DEFAULT_DROPOFF = { lat: 40.7580, lng: -73.9855 };  // Times Square

// How many watchPosition ticks to reach pickup, then dropoff
const STEPS_TO_PICKUP = 8;
const STEPS_TO_DROPOFF = 10;

let driverTick = 0;

function getStoredPos(key: string, fallback: { lat: number; lng: number }) {
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return fallback;
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

/** Returns interpolated driver position based on current tick */
function getDriverPosition(): { lat: number; lng: number; heading: number } {
    const start = getStoredPos('mockGeoDriver', DEFAULT_DRIVER_START);
    const pickup = getStoredPos('mockGeoRider', DEFAULT_PICKUP);
    const dropoff = DEFAULT_DROPOFF;

    let lat: number, lng: number;

    if (driverTick <= STEPS_TO_PICKUP) {
        // Phase 1: heading to pickup
        const t = driverTick / STEPS_TO_PICKUP;
        lat = lerp(start.lat, pickup.lat, t);
        lng = lerp(start.lng, pickup.lng, t);
    } else {
        // Phase 2: heading to dropoff
        const t = (driverTick - STEPS_TO_PICKUP) / STEPS_TO_DROPOFF;
        lat = lerp(pickup.lat, dropoff.lat, t);
        lng = lerp(pickup.lng, dropoff.lng, t);
    }

    // Simple heading approximation (degrees from north)
    const heading = driverTick <= STEPS_TO_PICKUP ? 45 : 0;

    return { lat, lng, heading };
}

function createMockPosition(lat: number, lng: number, heading = 0): GeolocationPosition {
    const coords = {
        latitude: lat,
        longitude: lng,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading,
        speed: 8, // ~30 km/h
        toJSON() { return this; },
    };
    return {
        coords,
        timestamp: Date.now(),
        toJSON() { return { coords, timestamp: this.timestamp }; },
    };
}

export function installMockGeolocation() {
    if (localStorage.getItem('mockGeo') !== 'true') return;

    const role = localStorage.getItem('userRole');
    const isDriver = role === 'DRIVER';

    console.log(
        `%c[Mock GPS] Active — role=${role || 'RIDER'} ` +
        `(set localStorage "mockGeo" to "false" to disable)`,
        'color: #ebb305; font-weight: bold'
    );

    const mockGeo: Geolocation = {
        getCurrentPosition(success, _error?, _options?) {
            const pos = isDriver
                ? getDriverPosition()
                : getStoredPos('mockGeoRider', DEFAULT_RIDER);
            setTimeout(() => success(createMockPosition(pos.lat, pos.lng, pos.heading ?? 0)), 100);
        },

        watchPosition(success, _error?, _options?) {
            const id = window.setInterval(() => {
                if (isDriver) {
                    const pos = getDriverPosition();
                    driverTick++;
                    success(createMockPosition(pos.lat, pos.lng, pos.heading));
                } else {
                    const pos = getStoredPos('mockGeoRider', DEFAULT_RIDER);
                    success(createMockPosition(pos.lat, pos.lng));
                }
            }, 3000); // emit every 3s

            return id;
        },

        clearWatch(id: number) {
            window.clearInterval(id);
        },
    };

    Object.defineProperty(navigator, 'geolocation', {
        value: mockGeo,
        writable: true,
        configurable: true,
    });
}
