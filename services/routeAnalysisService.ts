import { CalculatedLoad } from '../types';

export interface RouteAnalysis {
  routeId: string; // Normalized "origin-destination" key
  origin: string;
  destination: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  totalLoads: number;
  totalGross: number;
  totalMiles: number;
  totalNetProfit: number;
  averageGross: number;
  averageMiles: number;
  averageNetProfit: number;
  averageRatePerMile: number;
  bestLoad: CalculatedLoad | null; // Highest gross
  worstLoad: CalculatedLoad | null; // Lowest gross
  loads: CalculatedLoad[];
  dateRange: {
    earliest: string;
    latest: string;
  };
}

export interface RouteAnalysisFilters {
  startDate?: string;
  endDate?: string;
  minLoads?: number; // Only show routes with at least X loads
  companyId?: string;
  pickup?: string; // Origin/pickup location filter
  destination?: string; // Destination location filter
}

/**
 * Normalize a location string for consistent route grouping
 */
const normalizeLocation = (location: string): string => {
  return location.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Create a route key from origin and destination
 */
const createRouteKey = (origin: string, destination: string): string => {
  return `${normalizeLocation(origin)}-${normalizeLocation(destination)}`;
};

/**
 * Geocode a location using Google Maps Geocoding API
 * Results are cached in sessionStorage to avoid repeated API calls
 */
const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | undefined> => {
  // Check cache first
  const cacheKey = `geocode_${normalizeLocation(location)}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // Invalid cache, continue to geocode
    }
  }

  // Check if Google Maps is loaded
  if (!window.google || !window.google.maps) {
    console.warn('Google Maps API not loaded, cannot geocode location:', location);
    return undefined;
  }

  try {
    const geocoder = new window.google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address: location }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const location = results[0].geometry.location;
          const coords = {
            lat: location.lat(),
            lng: location.lng()
          };
          
          // Cache the result
          sessionStorage.setItem(cacheKey, JSON.stringify(coords));
          resolve(coords);
        } else {
          console.warn(`Geocoding failed for "${location}": ${status}`);
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('Error geocoding location:', location, error);
    return undefined;
  }
};

/**
 * Analyze loads and group them by route
 * Calculates statistics for each route
 */
export const analyzeRoutes = async (
  loads: CalculatedLoad[],
  filters?: RouteAnalysisFilters
): Promise<RouteAnalysis[]> => {
  // Filter loads by pickup and destination if provided
  let filteredLoads = loads;
  
  if (filters?.pickup) {
    const pickupLower = normalizeLocation(filters.pickup);
    filteredLoads = filteredLoads.filter(load => 
      normalizeLocation(load.origin).includes(pickupLower) || 
      pickupLower.includes(normalizeLocation(load.origin))
    );
  }
  
  if (filters?.destination) {
    const destinationLower = normalizeLocation(filters.destination);
    filteredLoads = filteredLoads.filter(load => 
      normalizeLocation(load.destination).includes(destinationLower) || 
      destinationLower.includes(normalizeLocation(load.destination))
    );
  }

  // Group loads by route
  const routeMap = new Map<string, CalculatedLoad[]>();
  
  filteredLoads.forEach(load => {
    const routeKey = createRouteKey(load.origin, load.destination);
    if (!routeMap.has(routeKey)) {
      routeMap.set(routeKey, []);
    }
    routeMap.get(routeKey)!.push(load);
  });

  // Calculate statistics for each route
  const analyses: RouteAnalysis[] = [];
  
  for (const [routeKey, routeLoads] of routeMap.entries()) {
    
    const totalGross = routeLoads.reduce((sum, l) => sum + l.gross, 0);
    const totalMiles = routeLoads.reduce((sum, l) => sum + l.miles, 0);
    const totalNetProfit = routeLoads.reduce((sum, l) => sum + l.netProfit, 0);
    
    // Find best and worst loads
    const bestLoad = routeLoads.reduce((best, current) => 
      current.gross > best.gross ? current : best
    );
    const worstLoad = routeLoads.reduce((worst, current) => 
      current.gross < worst.gross ? current : worst
    );
    
    // Find date range
    const sortedByDate = [...routeLoads].sort((a, b) => 
      new Date(a.dropDate).getTime() - new Date(b.dropDate).getTime()
    );
    
    const analysis: RouteAnalysis = {
      routeId: routeKey,
      origin: routeLoads[0].origin,
      destination: routeLoads[0].destination,
      totalLoads: routeLoads.length,
      totalGross,
      totalMiles,
      totalNetProfit,
      averageGross: totalGross / routeLoads.length,
      averageMiles: totalMiles / routeLoads.length,
      averageNetProfit: totalNetProfit / routeLoads.length,
      averageRatePerMile: totalMiles > 0 ? totalGross / totalMiles : 0,
      bestLoad,
      worstLoad,
      loads: routeLoads,
      dateRange: {
        earliest: sortedByDate[0].dropDate,
        latest: sortedByDate[sortedByDate.length - 1].dropDate
      }
    };
    
    // Geocode locations (async, but we'll await all)
    analysis.originCoords = await geocodeLocation(analysis.origin);
    analysis.destinationCoords = await geocodeLocation(analysis.destination);
    
    analyses.push(analysis);
  }
  
  // Sort by total loads (most frequent first)
  return analyses.sort((a, b) => b.totalLoads - a.totalLoads);
};

/**
 * Get route color based on profitability (rate per mile)
 */
export const getRouteColor = (route: RouteAnalysis): string => {
  const ratePerMile = route.averageRatePerMile;
  if (ratePerMile > 2.5) return '#10b981'; // Green - very profitable
  if (ratePerMile > 2.0) return '#3b82f6'; // Blue - profitable
  if (ratePerMile > 1.5) return '#f59e0b'; // Orange - moderate
  return '#ef4444'; // Red - low profitability
};

/**
 * Get route stroke weight based on number of loads
 */
export const getRouteStrokeWeight = (totalLoads: number): number => {
  return Math.min(totalLoads * 2, 10); // Max 10px
};

