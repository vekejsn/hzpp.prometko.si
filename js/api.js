let config;
let userLanguage;

/**
 * Detects the language preference: user setting > browser language > default (en)
 * Supports 'hr' (Croatian) and 'en' (English)
 */
function detectLanguage() {
    // Check if user has set a language preference in localStorage
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && (savedLanguage === 'hr' || savedLanguage === 'en')) {
        return savedLanguage;
    }
    
    // Auto-detect from browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang && browserLang.startsWith('hr')) {
        return 'hr';
    }
    
    // Default to English
    return 'en';
}

/**
 * Get the current user language preference
 */
export function getUserLanguage() {
    if (!userLanguage) {
        userLanguage = detectLanguage();
    }
    return userLanguage;
}

/**
 * Set the user language preference and save to localStorage
 */
export function setUserLanguage(lang) {
    if (lang === 'hr' || lang === 'en') {
        userLanguage = lang;
        localStorage.setItem('language', lang);
    }
}

export async function getConfig() {
    if (!config) {
        const response = await fetch('config.json');
        config = await response.json();
    }
    return config;
}

export async function fetchStops() {
    const config = await getConfig();
    const url = `${config.motis_api_base_url}/api/v1/map/stops?min=49.415360776528956%2C7.898969151846785&max=36.38523043114108%2C26.9347879737411&zoom=20`;
    const res = await fetch(url);
    return await res.json();
}

export async function fetchTrips() {
    const config = await getConfig();
    const now = new Date();
    const later = new Date(now.getTime() + 60000); // 1 minute window
    const url = `${config.motis_api_base_url}/api/v1/map/trips?min=49.415360776528956%2C7.898969151846785&max=36.38523043114108%2C26.9347879737411&startTime=${encodeURIComponent(now.toISOString())}&endTime=${encodeURIComponent(later.toISOString())}&zoom=20`;
    const res = await fetch(url);
    return await res.json();
}

export async function getTrip(tripId, language) {
    const config = await getConfig();
    const lang = language || getUserLanguage();
    const url = `${config.motis_api_base_url}/api/v2/trip?tripId=${encodeURIComponent(tripId)}&language=${encodeURIComponent(lang)}`;
    const res = await fetch(url);
    return await res.json();
}

export async function getStopTimes(stopId) {
    const config = await getConfig();
    const url = `${config.motis_api_base_url}/api/v1/stoptimes?stopId=${encodeURIComponent(stopId)}&n=100`;
    const res = await fetch(url);
    return await res.json();
}

/**
 * Fetch and parse GTFS-RT protobuf feed to find vehicle data for a specific trip
 */
export async function getGTFSRTVehicleData(tripId) {
    try {
        // Check if protobuf is available
        if (!window.protobuf) {
            console.error('Protobuf library not loaded');
            return null;
        }
        
        // Extract the short trip ID from the full trip ID
        // Format: 20260415_19:38_hzpp_i-tr872da_19 -> i-tr872da_19
        // Split by '_' and take everything from 'hzpp' onwards, then rejoin with '_'
        const parts = tripId.split('_');
        const shortTripId = parts.slice(3).join('_'); // Skip first 3 parts (date, time, hzpp) and rejoin
        console.log('Full tripId:', tripId, '-> Short tripId:', shortTripId);
        
        const proxyUrl = 'https://cors.proxy.prometko.si/https://rt.gtfs.baguette.pirnet.si/gtfs-rt/HZPP/trip_updates.pb';
        const res = await fetch(proxyUrl);
        const arrayBuffer = await res.arrayBuffer();
        
        // Define GTFS-RT protobuf schema
        const proto = window.protobuf.Root.fromJSON({
            nested: {
                transit_realtime: {
                    nested: {
                        FeedMessage: {
                            fields: {
                                header: { type: 'FeedHeader', id: 1 },
                                entity: { rule: 'repeated', type: 'FeedEntity', id: 2 }
                            }
                        },
                        FeedHeader: {
                            fields: {
                                gtfs_realtime_version: { type: 'string', id: 1 },
                                incrementality: { type: 'Incrementality', id: 2 },
                                timestamp: { type: 'uint64', id: 3 }
                            },
                            nested: {
                                Incrementality: { values: { FULL_DATASET: 0, DIFFERENTIAL: 1 } }
                            }
                        },
                        FeedEntity: {
                            fields: {
                                id: { type: 'string', id: 1 },
                                is_deleted: { type: 'bool', id: 2 },
                                trip_update: { type: 'TripUpdate', id: 3 }
                            }
                        },
                        TripUpdate: {
                            fields: {
                                trip: { type: 'TripDescriptor', id: 1 },
                                vehicle: { type: 'VehicleDescriptor', id: 3 },
                                stop_time_update: { rule: 'repeated', type: 'StopTimeUpdate', id: 4 }
                            }
                        },
                        TripDescriptor: {
                            fields: {
                                trip_id: { type: 'string', id: 1 },
                                route_id: { type: 'string', id: 5 }
                            }
                        },
                        VehicleDescriptor: {
                            fields: {
                                id: { type: 'string', id: 1 },
                                label: { type: 'string', id: 2 }
                            }
                        },
                        StopTimeUpdate: {
                            fields: {
                                stop_sequence: { type: 'uint32', id: 1 },
                                arrival: { type: 'StopTimeEvent', id: 2 },
                                departure: { type: 'StopTimeEvent', id: 3 }
                            }
                        },
                        StopTimeEvent: {
                            fields: {
                                delay: { type: 'int32', id: 1 },
                                time: { type: 'int64', id: 2 }
                            }
                        }
                    }
                }
            }
        });
        
        const FeedMessage = proto.lookupType('transit_realtime.FeedMessage');
        const message = FeedMessage.decode(new Uint8Array(arrayBuffer));
        console.log('GTFS-RT message decoded, entities:', message.entity?.length);
        
        // Find the matching trip using the short trip ID
        let vehicleData = null;
        if (message.entity) {
            console.log('Looking for short tripId:', shortTripId);
            for (const entity of message.entity) {
                if (entity.trip_update && entity.trip_update.trip && entity.trip_update.trip.trip_id) {
                    const feedTripId = entity.trip_update.trip.trip_id;
                    // Match using the short trip ID
                    if (feedTripId === shortTripId) {
                        console.log('Found exact match for trip:', shortTripId);
                        vehicleData = entity.trip_update.vehicle;
                        break;
                    }
                }
            }
            if (!vehicleData) {
                const allTripIds = message.entity
                    .filter(e => e.trip_update?.trip?.trip_id)
                    .map(e => e.trip_update.trip.trip_id);
                console.log('No matching trip found. Looking for:', shortTripId);
                console.log('First 5 available trip IDs:', allTripIds.slice(0, 5));
                console.log('Total trip IDs in feed:', allTripIds.length);
            }
        }
        
        console.log('Final vehicleData:', vehicleData);
        return vehicleData;
    } catch (error) {
        console.error('Error fetching GTFS-RT data:', error);
        return null;
    }
}
