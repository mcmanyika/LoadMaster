import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { UserProfile, CalculatedLoad, Driver, Dispatcher } from '../types';
import { getLoads, getDispatchers, getDrivers } from '../services/loadService';
import { analyzeRoutes, RouteAnalysis, RouteAnalysisFilters, getRouteColor, getRouteStrokeWeight } from '../services/routeAnalysisService';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { supabase } from '../services/supabaseClient';
import { Route, Filter, X, TrendingUp, DollarSign, MapPin, Calendar } from 'lucide-react';

// Helper functions for scatter map
const getScatterPointSize = (totalLoads: number, minSize: number = 20, maxSize: number = 80): number => {
  // Normalize to 0-1 range (assuming max 100 loads for scaling)
  const normalized = Math.min(totalLoads / 100, 1);
  return minSize + (maxSize - minSize) * normalized;
};

const getScatterPointColor = (averageRatePerMile: number): string => {
  if (averageRatePerMile > 2.5) return '#10b981'; // Green - very profitable
  if (averageRatePerMile > 2.0) return '#3b82f6'; // Blue - profitable
  if (averageRatePerMile > 1.5) return '#f59e0b'; // Orange - moderate
  return '#ef4444'; // Red - low profitability
};

interface RouteAnalysisProps {
  user: UserProfile;
  companyId?: string;
}

// Google Maps API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

// Default map center (US center)
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

export const RouteAnalysisComponent: React.FC<RouteAnalysisProps> = ({ user, companyId }) => {
  const [routes, setRoutes] = useState<RouteAnalysis[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteAnalysis | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loads, setLoads] = useState<CalculatedLoad[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const [filters, setFilters] = useState<RouteAnalysisFilters>({
    pickup: '',
    destination: ''
  });
  
  const [sortBy, setSortBy] = useState<'loads' | 'gross' | 'rate' | 'profit'>('loads');

  // Check if Google Maps is already loaded (from PlacesAutocomplete)
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogleMaps()) {
      return;
    }

    // Wait for Google Maps to load (it might be loading from PlacesAutocomplete)
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 100);

    // If not loaded after 5 seconds, try to load it
    const timeout = setTimeout(() => {
      if (!checkGoogleMaps() && GOOGLE_MAPS_API_KEY) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geocoding`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setTimeout(() => {
            if (window.google && window.google.maps) {
              setIsMapLoaded(true);
            }
          }, 100);
        };
        document.head.appendChild(script);
      }
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Fetch loads and calculate - analyze ALL data regardless of company/dispatcher
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL loads without any company or dispatcher filters
      const loadsData = await getLoads();
      
      // Extract unique company IDs from loads to fetch dispatchers and drivers
      const uniqueCompanyIds = [...new Set(loadsData.map(load => load.companyId).filter(Boolean))];
      
      // Fetch all dispatchers and drivers from all companies that have loads
      const [allDispatchersData, allDriversData] = await Promise.all([
        // Fetch dispatchers from all companies
        Promise.all(
          uniqueCompanyIds.map(companyId => getDispatchers(companyId))
        ).then(results => results.flat()),
        // Fetch drivers from all companies
        Promise.all(
          uniqueCompanyIds.map(companyId => getDrivers(companyId))
        ).then(results => results.flat())
      ]);
      
      // Also try to get dispatchers and drivers without company filter (if RLS allows)
      let additionalDispatchers: Dispatcher[] = [];
      let additionalDrivers: Driver[] = [];
      
      try {
        if (supabase) {
          // Try to get all dispatchers
          const { data: allDispatchers } = await supabase
            .from('dispatchers')
            .select('*');
          if (allDispatchers) {
            additionalDispatchers = allDispatchers.map((d: any) => ({
              id: d.id || '',
              name: d.name || '',
              email: d.email || '',
              phone: d.phone || '',
              feePercentage: d.fee_percentage || 12,
              companyId: d.company_id || ''
            }));
          }
          
          // Try to get all drivers
          const { data: allDrivers } = await supabase
            .from('drivers')
            .select('*');
          if (allDrivers) {
            additionalDrivers = allDrivers.map((d: any) => ({
              id: d.id,
              name: d.name,
              transporterId: d.transporter_id || '',
              phone: d.phone || '',
              email: d.email || '',
              companyId: d.company_id || '',
              payType: d.pay_type || 'percentage_of_net',
              payPercentage: d.pay_percentage || 50
            }));
          }
        }
      } catch (err) {
        console.warn('Could not fetch all dispatchers/drivers directly, using company-specific data:', err);
      }
      
      // Combine and deduplicate dispatchers and drivers
      const dispatchersMap = new Map<string, Dispatcher>();
      [...allDispatchersData, ...additionalDispatchers].forEach(d => {
        if (d.id && !dispatchersMap.has(d.id)) {
          dispatchersMap.set(d.id, d);
        }
      });
      
      const driversMap = new Map<string, Driver>();
      [...allDriversData, ...additionalDrivers].forEach(d => {
        if (d.id && !driversMap.has(d.id)) {
          driversMap.set(d.id, d);
        }
      });
      
      setLoads(loadsData);
      setDrivers(Array.from(driversMap.values()));
      setDispatchers(Array.from(dispatchersMap.values()));
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate processed loads with dispatch fees and driver pay (same logic as App.tsx)
  const processedLoads: CalculatedLoad[] = useMemo(() => {
    const dispatcherFeeMap = new Map<string, number>();
    dispatchers.forEach(dispatcher => {
      dispatcherFeeMap.set(dispatcher.name, dispatcher.feePercentage || 12);
    });

    const driverPayConfigMap = new Map<string, { payType: string, payPercentage: number }>();
    drivers.forEach(driver => {
      driverPayConfigMap.set(driver.id, {
        payType: driver.payType || 'percentage_of_net',
        payPercentage: driver.payPercentage || 50
      });
    });

    return loads.map(load => {
      const feePercentage = dispatcherFeeMap.get(load.dispatcher) || 12;
      const dispatchFee = load.gross * (feePercentage / 100);
      
      const driverConfig = load.driverId ? driverPayConfigMap.get(load.driverId) : null;
      const payType = driverConfig?.payType || 'percentage_of_net';
      const payPercentage = driverConfig?.payPercentage || 50;
      
      let driverGasShare: number;
      let companyGasShare: number;
      let driverPay: number;
      
      if (payType === 'percentage_of_gross') {
        driverGasShare = 0;
        companyGasShare = load.gasAmount;
        driverPay = load.gross * (payPercentage / 100);
      } else {
        driverGasShare = load.gasAmount * 0.5;
        companyGasShare = load.gasAmount * 0.5;
        driverPay = (load.gross - dispatchFee) * (payPercentage / 100) - driverGasShare;
      }
      
      const netProfit = load.gross - dispatchFee - driverPay - companyGasShare;
      
      const driverName = load.driverId ? drivers.find(d => d.id === load.driverId)?.name : undefined;

      return {
        ...load,
        dispatchFee,
        driverPay,
        netProfit,
        driverName
      };
    });
  }, [loads, dispatchers, drivers]);

  // Analyze routes when loads change or filters change
  useEffect(() => {
    if (processedLoads.length === 0) {
      setRoutes([]);
      return;
    }

    const analyze = async () => {
      setLoading(true);
      try {
        const analyzedRoutes = await analyzeRoutes(processedLoads, filters);
        
        // Sort routes
        const sorted = [...analyzedRoutes].sort((a, b) => {
          switch (sortBy) {
            case 'gross':
              return b.averageGross - a.averageGross;
            case 'rate':
              return b.averageRatePerMile - a.averageRatePerMile;
            case 'profit':
              return b.averageNetProfit - a.averageNetProfit;
            case 'loads':
            default:
              return b.totalLoads - a.totalLoads;
          }
        });
        
        setRoutes(sorted);
        
        // Auto-fit bounds to show all filtered routes
        if (sorted.length > 0 && window.google && window.google.maps) {
          const routesWithCoords = sorted.filter(r => r.originCoords && r.destinationCoords);
          if (routesWithCoords.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            routesWithCoords.forEach(route => {
              bounds.extend(route.originCoords!);
              bounds.extend(route.destinationCoords!);
            });
            
            // Set map center and zoom to fit bounds
            const center = bounds.getCenter();
            setMapCenter({ lat: center.lat(), lng: center.lng() });
            
            // Calculate appropriate zoom level
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const latDiff = ne.lat() - sw.lat();
            const lngDiff = ne.lng() - sw.lng();
            const maxDiff = Math.max(latDiff, lngDiff);
            
            let zoom = 4;
            if (maxDiff < 0.1) zoom = 8;
            else if (maxDiff < 0.5) zoom = 6;
            else if (maxDiff < 2) zoom = 5;
            else zoom = 4;
            
            setMapZoom(zoom);
          } else if (sorted[0].originCoords) {
            // Fallback: center on first route
            setMapCenter(sorted[0].originCoords);
            setMapZoom(5);
          }
        }
      } catch (err: any) {
        console.error('Error analyzing routes:', err);
        setError(err.message || 'Failed to analyze routes');
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [processedLoads, filters, sortBy]);

  // Aggregate locations for scatter map
  const scatterPoints = useMemo(() => {
    const locationMap = new Map<string, {
      name: string;
      coords: { lat: number; lng: number };
      totalLoads: number;
      totalGross: number;
      totalNetProfit: number;
      averageGross: number;
      averageNetProfit: number;
      averageRatePerMile: number;
      routes: RouteAnalysis[];
    }>();

    routes.forEach(route => {
      if (!route.destinationCoords) return;

      // Only process destinations
      const destKey = `${route.destinationCoords.lat},${route.destinationCoords.lng}`;
      if (!locationMap.has(destKey)) {
        locationMap.set(destKey, {
          name: route.destination,
          coords: route.destinationCoords,
          totalLoads: 0,
          totalGross: 0,
          totalNetProfit: 0,
          averageGross: 0,
          averageNetProfit: 0,
          averageRatePerMile: 0,
          routes: []
        });
      }
      const destData = locationMap.get(destKey)!;
      destData.totalLoads += route.totalLoads;
      destData.totalGross += route.totalGross;
      destData.totalNetProfit += route.totalNetProfit;
      destData.routes.push(route);
    });

    // Calculate averages
    locationMap.forEach((data) => {
      if (data.totalLoads > 0) {
        data.averageGross = data.totalGross / data.totalLoads;
        data.averageNetProfit = data.totalNetProfit / data.totalLoads;
        // Calculate average rate per mile from all routes
        const totalMiles = data.routes.reduce((sum, r) => sum + r.totalMiles, 0);
        const totalGross = data.routes.reduce((sum, r) => sum + r.totalGross, 0);
        data.averageRatePerMile = totalMiles > 0 ? totalGross / totalMiles : 0;
      }
    });

    const points = Array.from(locationMap.values()).filter(p => p.coords && p.coords.lat && p.coords.lng);
    console.log('Scatter points calculated:', points.length, 'from', routes.length, 'routes');
    if (points.length === 0 && routes.length > 0) {
      const routesWithCoords = routes.filter(r => r.originCoords && r.destinationCoords);
      console.warn('No scatter points created. Routes with coords:', routesWithCoords.length, 'out of', routes.length);
    }
    return points;
  }, [routes]);

  // Update map bounds when routes change (after filtering)
  useEffect(() => {
    if (mapRef.current && scatterPoints.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      scatterPoints.forEach(point => {
        bounds.extend(point.coords);
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [scatterPoints]);

  const handleRouteClick = (route: RouteAnalysis) => {
    setSelectedRoute(route);
    if (route.originCoords && route.destinationCoords && mapRef.current && window.google && window.google.maps) {
      // Create bounds to fit both origin and destination
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(route.originCoords);
      bounds.extend(route.destinationCoords);
      
      // Fit bounds with padding for better view
      mapRef.current.fitBounds(bounds, { padding: 100 });
      
      // Update center and zoom state for consistency
      const center = bounds.getCenter();
      setMapCenter({ lat: center.lat(), lng: center.lng() });
      
      // Calculate zoom level based on distance
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latDiff = ne.lat() - sw.lat();
      const lngDiff = ne.lng() - sw.lng();
      const maxDiff = Math.max(latDiff, lngDiff);
      
      let zoom = 6;
      if (maxDiff < 0.1) zoom = 10;
      else if (maxDiff < 0.5) zoom = 8;
      else if (maxDiff < 2) zoom = 7;
      else zoom = 6;
      
      setMapZoom(zoom);
    } else if (route.originCoords) {
      // Fallback if no destination coords
      setMapCenter(route.originCoords);
      setMapZoom(8);
    }
  };

  const handleApplyFilters = () => {
    // Filters are already applied via useEffect dependency
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-300">
            Google Maps API key not configured. Please set VITE_GOOGLE_PLACES_API_KEY in your .env file.
          </p>
        </div>
      </div>
    );
  }

  if (!isMapLoaded) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Route Analysis</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Analyze route profitability and visualize your most common routes on the map
            </p>
          </div>
          {!loading && routes.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">Showing</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{routes.length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {routes.length === 1 ? 'route' : 'routes'}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Pickup (Origin)
            </label>
            <PlacesAutocomplete
              value={filters.pickup || ''}
              onChange={(value) => setFilters({ ...filters, pickup: value })}
              placeholder="City, ST/Province"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination
            </label>
            <PlacesAutocomplete
              value={filters.destination || ''}
              onChange={(value) => setFilters({ ...filters, destination: value })}
              placeholder="City, ST/Province"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Route List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Routes</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="loads">Sort by Loads</option>
              <option value="gross">Sort by Avg Gross</option>
              <option value="rate">Sort by Rate/Mile</option>
              <option value="profit">Sort by Net Profit</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Analyzing routes...</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8 text-slate-600 dark:text-slate-400">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No routes found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {routes.map((route) => {
                const color = getRouteColor(route);
                return (
                  <div
                    key={route.routeId}
                    onClick={() => handleRouteClick(route)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedRoute?.routeId === route.routeId
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {route.origin} → {route.destination}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {route.totalLoads} load{route.totalLoads !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: color }}
                        title={`Rate: $${route.averageRatePerMile.toFixed(2)}/mile`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Avg Gross</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          ${route.averageGross.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Rate/Mile</p>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          ${route.averageRatePerMile.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Map Visualization */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600 dark:text-slate-400">Updating map...</p>
                </div>
              </div>
            )}
            {!loading && routes.length === 0 && (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">No routes found matching your filters</p>
                </div>
              </div>
            )}
            {!loading && isMapLoaded && window.google && (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '600px' }}
                center={mapCenter}
                zoom={mapZoom}
                options={{
                  mapTypeControl: true,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
                onLoad={(map) => {
                  mapRef.current = map;
                  // Fit bounds to all scatter points when map loads
                  if (scatterPoints.length > 0 && window.google && window.google.maps) {
                    const bounds = new window.google.maps.LatLngBounds();
                    scatterPoints.forEach(point => {
                      bounds.extend(point.coords);
                    });
                    map.fitBounds(bounds);
                  }
                }}
              >
              {/* Scatter Points */}
              {scatterPoints.length > 0 ? scatterPoints.map((point, index) => {
                if (!point.coords || !point.coords.lat || !point.coords.lng) {
                  return null;
                }
                const pointSize = getScatterPointSize(point.totalLoads);
                const pointColor = getScatterPointColor(point.averageRatePerMile);
                const isSelected = selectedRoute && point.routes.some(r => r.routeId === selectedRoute.routeId);
                
                return (
                  <React.Fragment key={`scatter-${index}`}>
                    <Marker
                      position={point.coords}
                      icon={{
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                          <svg width="${pointSize}" height="${pointSize}" viewBox="0 0 ${pointSize} ${pointSize}" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="${pointSize/2}" cy="${pointSize/2}" r="${pointSize/2 - 2}" fill="${pointColor}" stroke="#fff" stroke-width="3" opacity="0.8"/>
                          </svg>
                        `),
                        scaledSize: new window.google.maps.Size(pointSize, pointSize),
                        anchor: new window.google.maps.Point(pointSize/2, pointSize/2),
                      }}
                      onClick={() => {
                        // Select the first route from this location
                        if (point.routes.length > 0) {
                          handleRouteClick(point.routes[0]);
                        }
                        setSelectedPointIndex(index);
                      }}
                      zIndex={isSelected ? 1000 : 100}
                    />
                    {selectedPointIndex === index && (
                      <InfoWindow
                        position={point.coords}
                        onCloseClick={() => {
                          setSelectedPointIndex(null);
                          setSelectedRoute(null);
                        }}
                      >
                        <div className="p-2 min-w-[200px]">
                          <h3 className="font-bold text-slate-900 mb-2">{point.name}</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Total Loads:</span>
                              <span className="font-semibold">{point.totalLoads}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Total Gross:</span>
                              <span className="font-semibold text-green-600">
                                ${point.totalGross.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Avg Gross:</span>
                              <span className="font-semibold text-green-600">
                                ${point.averageGross.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Rate/Mile:</span>
                              <span className="font-semibold text-blue-600">
                                ${point.averageRatePerMile.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Avg Net Profit:</span>
                              <span className="font-semibold text-emerald-600">
                                ${point.averageNetProfit.toFixed(2)}
                              </span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-200">
                              <p className="text-xs text-slate-500">
                                {point.routes.length} {point.routes.length === 1 ? 'route' : 'routes'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </React.Fragment>
                );
              }).filter(Boolean) : (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, pointerEvents: 'none' }}>
                  <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-400">No location data available</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                      {routes.length > 0 ? `Found ${routes.length} routes, but geocoding may be in progress...` : 'No routes found'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Optional: Show connections between frequently connected locations */}
              {selectedRoute && selectedRoute.originCoords && selectedRoute.destinationCoords && (
                <Polyline
                  path={[selectedRoute.originCoords, selectedRoute.destinationCoords]}
                  options={{
                    strokeColor: getRouteColor(selectedRoute),
                    strokeWeight: getRouteStrokeWeight(selectedRoute.totalLoads),
                    strokeOpacity: 0.6,
                    zIndex: 50,
                  }}
                />
              )}
              </GoogleMap>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

