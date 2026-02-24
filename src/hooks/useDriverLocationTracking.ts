import { useEffect, useRef, useState } from 'react';
import { useUpdateLocation } from './useLocationHooks';

/**
 * Custom hook to track and stream the driver's GPS location via REST fallback.
 * Sends coordinates to /api/location/update every `intervalMs`.
 */
export function useDriverLocationTracking({
    driverId,
    tripId,
    isTracking = false,
    intervalMs = 5000
}: {
    driverId?: string;
    tripId?: string;
    isTracking: boolean;
    intervalMs?: number;
}) {
    const { mutate: updateLocation } = useUpdateLocation();
    const intervalRef = useRef<number | null>(null);

    // Watch position to always have the latest coords ready for the interval
    // Use state to expose reactive values to the component
    const [currentPos, setCurrentPos] = useState<{ lat?: number, lng?: number, heading?: number }>({});

    // Also keep a ref for the interval to pick up without stale closures
    const latestPosParams = useRef<GeolocationCoordinates | null>(null);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isTracking || !driverId) {
            // Cleanup mapping
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        console.log(`[GPS Tracking] Started tracking for driver ${driverId}`);

        // Setup Geolocation Watcher to get smooth real-time updates from device
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                latestPosParams.current = position.coords;
                setCurrentPos({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    heading: position.coords.heading ?? undefined
                });
            },
            (error) => {
                console.error("[GPS Tracking] Error getting location", error);
            },
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        // Setup Interval Publisher (REST Fallback)
        intervalRef.current = window.setInterval(() => {
            if (latestPosParams.current) {
                const { latitude, longitude, heading, speed } = latestPosParams.current;

                const payload = {
                    driverId,
                    lat: latitude,
                    lng: longitude,
                    timestamp: new Date().toISOString(),
                    tripId,
                    heading: heading ?? undefined,
                    speed: speed ?? undefined
                };

                // Stream current location via REST
                updateLocation(payload, {
                    onSuccess: () => {
                        console.log(`[GPS Tracking] Streamed location for driver ${driverId} to REST API.`);
                    },
                    onError: (err) => {
                        console.error("[GPS Tracking] Failed to stream location to REST API", err);
                    }
                });
            }
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
            }
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };

    }, [isTracking, driverId, tripId, intervalMs, updateLocation]);

    // Return the latest coordinates for UI map sync safely triggering re-renders
    return currentPos;
}
