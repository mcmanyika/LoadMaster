import React, { useState, useEffect, useMemo } from "react";
import { UserProfile, CalculatedLoad, Load, Driver, Dispatcher } from "../types";
import { getLoads, getDispatchers, getDrivers } from "../services/loadService";
import {
  analyzeRoutes,
  RouteAnalysis,
  RouteAnalysisFilters,
  getRouteColor,
} from "../services/routeAnalysisService";
import { PlacesAutocomplete } from "./PlacesAutocomplete";
import { supabase } from "../services/supabaseClient";
import {
  Route,
  Filter,
  X,
  TrendingUp,
  DollarSign,
  MapPin,
  Calendar,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Helper functions for scatter chart
const getBubbleSize = (
  amount: number,
  minSize: number = 8,
  maxSize: number = 50,
  minAmount: number = 0,
  maxAmount: number = 5000
): number => {
  // Normalize amount to 0-1 range based on actual data range
  const range = maxAmount - minAmount;
  if (range <= 0) return (minSize + maxSize) / 2; // Default size if no range

  const normalized = (amount - minAmount) / range;
  // Clamp between 0 and 1
  const clamped = Math.max(0, Math.min(1, normalized));
  return minSize + (maxSize - minSize) * clamped;
};

const getBubbleColor = (averageRatePerMile: number): string => {
  if (averageRatePerMile > 2.5) return "#10b981"; // Green - very profitable
  if (averageRatePerMile > 2.0) return "#3b82f6"; // Blue - profitable
  if (averageRatePerMile > 1.5) return "#f59e0b"; // Orange - moderate
  return "#ef4444"; // Red - low profitability
};

interface RouteAnalysisProps {
  user: UserProfile;
  companyId?: string;
}

export const RouteAnalysisComponent: React.FC<RouteAnalysisProps> = ({
  user,
  companyId,
}) => {
  const [routes, setRoutes] = useState<RouteAnalysis[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteAnalysis | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loads, setLoads] = useState<CalculatedLoad[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(["high", "profitable", "moderate", "low"])
  );

  const [filters, setFilters] = useState<RouteAnalysisFilters>({
    pickup: "",
    destination: "",
  });

  const [sortBy, setSortBy] = useState<"loads" | "gross" | "rate" | "profit">(
    "loads"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch loads and calculate - analyze ALL data regardless of company/dispatcher
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch ALL loads without any company or dispatcher filters
      // Use direct Supabase query to bypass service-level filtering
      let loadsData: Load[] = [];
      
      if (supabase) {
        const { data: loadsRaw, error: loadsError } = await supabase
          .from("loads")
          .select(`
            *,
            transporters ( name ),
            drivers ( name )
          `)
          .order('drop_date', { ascending: false });
        
        if (loadsError) {
          console.error("Error fetching all loads:", loadsError);
          throw loadsError;
        }
        
        // Transform to Load format
        loadsData = (loadsRaw || []).map((item: any) => ({
          id: item.id,
          company: item.company,
          gross: item.gross,
          miles: item.miles,
          gasAmount: item.gas_amount,
          gasNotes: item.gas_notes,
          dropDate: item.drop_date,
          dispatcher: item.dispatcher,
          transporterId: item.transporter_id,
          driverId: item.driver_id,
          origin: item.origin,
          destination: item.destination,
          status: item.status,
          rateConfirmationPdfUrl: item.rate_confirmation_pdf_url || undefined,
          driverPayoutStatus: item.driver_payout_status || 'pending',
          companyId: item.company_id
        }));
      } else {
        // Fallback to getLoads if supabase is not available
        loadsData = await getLoads();
      }

      // Extract unique company IDs from loads to fetch dispatchers and drivers
      const uniqueCompanyIds = [
        ...new Set(loadsData.map((load) => load.companyId).filter(Boolean)),
      ];

      // Fetch all dispatchers and drivers from all companies that have loads
      const [allDispatchersData, allDriversData] = await Promise.all([
        // Fetch dispatchers from all companies
        Promise.all(
          uniqueCompanyIds.map((companyId) => getDispatchers(companyId))
        ).then((results) => results.flat()),
        // Fetch drivers from all companies
        Promise.all(
          uniqueCompanyIds.map((companyId) => getDrivers(companyId))
        ).then((results) => results.flat()),
      ]);

      // Also try to get dispatchers and drivers without company filter (if RLS allows)
      let additionalDispatchers: Dispatcher[] = [];
      let additionalDrivers: Driver[] = [];

      try {
        if (supabase) {
          // Try to get all dispatchers
          const { data: allDispatchers } = await supabase
            .from("dispatchers")
            .select("*");
          if (allDispatchers) {
            additionalDispatchers = allDispatchers.map((d: any) => ({
              id: d.id || "",
              name: d.name || "",
              email: d.email || "",
              phone: d.phone || "",
              feePercentage: d.fee_percentage || 12,
              companyId: d.company_id || "",
            }));
          }

          // Try to get all drivers
          const { data: allDrivers } = await supabase
            .from("drivers")
            .select("*");
          if (allDrivers) {
            additionalDrivers = allDrivers.map((d: any) => ({
              id: d.id,
              name: d.name,
              transporterId: d.transporter_id || "",
              phone: d.phone || "",
              email: d.email || "",
              companyId: d.company_id || "",
              payType: d.pay_type || "percentage_of_net",
              payPercentage: d.pay_percentage || 50,
            }));
          }
        }
      } catch (err) {
        console.warn(
          "Could not fetch all dispatchers/drivers directly, using company-specific data:",
          err
        );
      }

      // Combine and deduplicate dispatchers and drivers
      const dispatchersMap = new Map<string, Dispatcher>();
      [...allDispatchersData, ...additionalDispatchers].forEach((d) => {
        if (d.id && !dispatchersMap.has(d.id)) {
          dispatchersMap.set(d.id, d);
        }
      });

      const driversMap = new Map<string, Driver>();
      [...allDriversData, ...additionalDrivers].forEach((d) => {
        if (d.id && !driversMap.has(d.id)) {
          driversMap.set(d.id, d);
        }
      });

      const finalDispatchers = Array.from(dispatchersMap.values());
      const finalDrivers = Array.from(driversMap.values());

      // Create dispatcher fee percentage mapping
      const dispatcherFeeMap = new Map<string, number>();
      finalDispatchers.forEach(dispatcher => {
        dispatcherFeeMap.set(dispatcher.name, dispatcher.feePercentage || 12);
      });

      // Create driver pay configuration mapping
      const driverPayConfigMap = new Map<string, { payType: string, payPercentage: number }>();
      finalDrivers.forEach(driver => {
        driverPayConfigMap.set(driver.id, {
          payType: driver.payType || 'percentage_of_net',
          payPercentage: driver.payPercentage || 50
        });
      });

      // Convert Load[] to CalculatedLoad[] with dispatch fees, driver pay, and net profit
      const calculatedLoads: CalculatedLoad[] = loadsData.map(load => {
        const feePercentage = dispatcherFeeMap.get(load.dispatcher) || 12;
        const dispatchFee = load.gross * (feePercentage / 100);
        
        // Get driver pay configuration
        const driverConfig = load.driverId ? driverPayConfigMap.get(load.driverId) : null;
        const payType = driverConfig?.payType || 'percentage_of_net';
        const payPercentage = driverConfig?.payPercentage || 50;
        
        // Gas expense allocation depends on pay type
        let driverGasShare: number;
        let companyGasShare: number;
        let driverPay: number;
        
        if (payType === 'percentage_of_gross') {
          // Percentage of gross: Owner covers all expenses
          driverGasShare = 0;
          companyGasShare = load.gasAmount || 0;
          driverPay = load.gross * (payPercentage / 100);
        } else {
          // Percentage of net: Shared expenses (50-50)
          driverGasShare = (load.gasAmount || 0) * 0.5;
          companyGasShare = (load.gasAmount || 0) * 0.5;
          driverPay = (load.gross - dispatchFee) * (payPercentage / 100) - driverGasShare;
        }
        
        // Net profit calculation
        const netProfit = load.gross - dispatchFee - driverPay - companyGasShare;
        
        const driverName = load.driverId ? finalDrivers.find(d => d.id === load.driverId)?.name : undefined;
        const transporterName = load.transporterId ? undefined : undefined; // Could be enhanced if needed

        return {
          ...load,
          dispatchFee,
          driverPay,
          netProfit,
          driverName,
          transporterName
        };
      });

      setLoads(calculatedLoads);
      setDrivers(finalDrivers);
      setDispatchers(finalDispatchers);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate processed loads with dispatch fees and driver pay (same logic as App.tsx)
  const processedLoads: CalculatedLoad[] = useMemo(() => {
    const dispatcherFeeMap = new Map<string, number>();
    dispatchers.forEach((dispatcher) => {
      dispatcherFeeMap.set(dispatcher.name, dispatcher.feePercentage || 12);
    });

    const driverPayConfigMap = new Map<
      string,
      { payType: string; payPercentage: number }
    >();
    drivers.forEach((driver) => {
      driverPayConfigMap.set(driver.id, {
        payType: driver.payType || "percentage_of_net",
        payPercentage: driver.payPercentage || 50,
      });
    });

    return loads.map((load) => {
      const feePercentage = dispatcherFeeMap.get(load.dispatcher) || 12;
      const dispatchFee = load.gross * (feePercentage / 100);

      const driverConfig = load.driverId
        ? driverPayConfigMap.get(load.driverId)
        : null;
      const payType = driverConfig?.payType || "percentage_of_net";
      const payPercentage = driverConfig?.payPercentage || 50;

      let driverGasShare: number;
      let companyGasShare: number;
      let driverPay: number;

      if (payType === "percentage_of_gross") {
        driverGasShare = 0;
        companyGasShare = load.gasAmount;
        driverPay = load.gross * (payPercentage / 100);
      } else {
        driverGasShare = load.gasAmount * 0.5;
        companyGasShare = load.gasAmount * 0.5;
        driverPay =
          (load.gross - dispatchFee) * (payPercentage / 100) - driverGasShare;
      }

      const netProfit = load.gross - dispatchFee - driverPay - companyGasShare;

      const driverName = load.driverId
        ? drivers.find((d) => d.id === load.driverId)?.name
        : undefined;

      return {
        ...load,
        dispatchFee,
        driverPay,
        netProfit,
        driverName,
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
            case "gross":
              return b.averageGross - a.averageGross;
            case "rate":
              return b.averageRatePerMile - a.averageRatePerMile;
            case "profit":
              return b.averageNetProfit - a.averageNetProfit;
            case "loads":
            default:
              return b.totalLoads - a.totalLoads;
          }
        });

        setRoutes(sorted);
      } catch (err: any) {
        console.error("Error analyzing routes:", err);
        setError(err.message || "Failed to analyze routes");
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [processedLoads, filters, sortBy]);

  // Reset to page 1 when filters or sortBy change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.pickup, filters.destination, sortBy]);

  // Calculate paginated routes
  const totalPages = Math.ceil(routes.length / itemsPerPage);
  const paginatedRoutes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return routes.slice(startIndex, endIndex);
  }, [routes, currentPage, itemsPerPage]);

  // Toggle category visibility
  const toggleCategory = (category: string) => {
    setActiveCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Prepare chart data from routes
  const chartData = useMemo(() => {
    const locationMap = new Map<
      string,
      {
        name: string;
        totalLoads: number;
        totalGross: number;
        totalNetProfit: number;
        averageGross: number;
        averageNetProfit: number;
        averageRatePerMile: number;
        routes: RouteAnalysis[];
      }
    >();

    routes.forEach((route) => {
      // Extract state from destination (e.g., "Dallas, TX" -> "TX" or "Toronto, ON" -> "ON")
      const destinationParts = route.destination.split(",");
      let stateName = "";

      if (destinationParts.length > 1) {
        // Get the last part which should be the state/province
        stateName = destinationParts[destinationParts.length - 1].trim();
      } else {
        // Fallback: if no comma, try to extract state abbreviation from the end
        const parts = route.destination.trim().split(/\s+/);
        if (parts.length > 1) {
          stateName = parts[parts.length - 1];
        } else {
          stateName = route.destination; // Use full destination if we can't parse
        }
      }

      const stateKey = stateName.toLowerCase();

      if (!locationMap.has(stateKey)) {
        locationMap.set(stateKey, {
          name: stateName,
          totalLoads: 0,
          totalGross: 0,
          totalNetProfit: 0,
          averageGross: 0,
          averageNetProfit: 0,
          averageRatePerMile: 0,
          routes: [],
        });
      }
      const stateData = locationMap.get(stateKey)!;
      stateData.totalLoads += route.totalLoads;
      stateData.totalGross += route.totalGross;
      stateData.totalNetProfit += route.totalNetProfit;
      stateData.routes.push(route);
    });

    // Calculate averages
    locationMap.forEach((data) => {
      if (data.totalLoads > 0) {
        data.averageGross = data.totalGross / data.totalLoads;
        data.averageNetProfit = data.totalNetProfit / data.totalLoads;
        const totalMiles = data.routes.reduce(
          (sum, r) => sum + r.totalMiles,
          0
        );
        const totalGross = data.routes.reduce(
          (sum, r) => sum + r.totalGross,
          0
        );
        data.averageRatePerMile = totalMiles > 0 ? totalGross / totalMiles : 0;
      }
    });

    // Transform to Recharts format
    const points = Array.from(locationMap.values())
      .map((point) => {
        const ratePerMile = point.averageRatePerMile;
        let category = "low";
        if (ratePerMile > 2.5) category = "high";
        else if (ratePerMile > 2.0) category = "profitable";
        else if (ratePerMile > 1.5) category = "moderate";

        return {
          state: point.name,
          averageGross: point.averageGross,
          totalLoads: point.totalLoads,
          averageRatePerMile: ratePerMile,
          averageNetProfit: point.averageNetProfit,
          totalGross: point.totalGross,
          color: getBubbleColor(ratePerMile),
          category: category,
        };
      })
      .filter((point) => activeCategories.has(point.category))
      .sort((a, b) => a.state.localeCompare(b.state)); // Sort by state name alphabetically

    // Calculate size based on actual data range for better proportionality
    if (points.length > 0) {
      const maxGross = Math.max(...points.map((p) => p.averageGross));
      const minGross = Math.min(...points.map((p) => p.averageGross));
      const range = maxGross - minGross;

      return points.map((point) => ({
        ...point,
        size:
          range > 0
            ? getBubbleSize(point.averageGross, 8, 50, minGross, maxGross)
            : 25, // Default size if all values are the same
      }));
    }

    return points;
  }, [routes, activeCategories]);

  const handleRouteClick = (route: RouteAnalysis) => {
    setSelectedRoute(route);
  };

  const handleApplyFilters = () => {
    // Filters are already applied via useEffect dependency
  };

  const handleResetFilters = () => {
    setFilters({
      pickup: "",
      destination: "",
    });
  };

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter
            id="bubbleShadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="bubbleGradient" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="75%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
      </svg>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Route Analysis
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Analyze route profitability and visualize your most common
                routes on the map
              </p>
            </div>
            {!loading && routes.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {routes.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {routes.length === 1 ? "route" : "routes"}
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
                value={filters.pickup || ""}
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
                value={filters.destination || ""}
                onChange={(value) =>
                  setFilters({ ...filters, destination: value })
                }
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
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Routes
              </h2>
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
                <p className="text-slate-600 dark:text-slate-400">
                  Analyzing routes...
                </p>
              </div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No routes found matching your filters</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedRoutes.map((route) => {
                  const color = getRouteColor(route);
                  return (
                    <div
                      key={route.routeId}
                      onClick={() => handleRouteClick(route)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedRoute?.routeId === route.routeId
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {route.origin} → {route.destination}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {route.totalLoads} load
                            {route.totalLoads !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: color }}
                          title={`Rate: $${route.averageRatePerMile.toFixed(
                            2
                          )}/mile`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">
                            Avg Gross
                          </p>
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            ${route.averageGross.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-slate-400">
                            Rate/Mile
                          </p>
                          <p className="font-semibold text-blue-600 dark:text-blue-400">
                            ${route.averageRatePerMile.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, routes.length)}
                      </span>{' '}
                      of <span className="font-medium">{routes.length}</span> routes
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Previous page"
                      >
                        <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Next page"
                      >
                        <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Scatter Chart Visualization */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
              {loading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Updating chart...
                    </p>
                  </div>
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-400">
                      No route data available
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                      {routes.length > 0
                        ? "No destination data found"
                        : "No routes found matching your filters"}
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Average Charges by Destination State
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsChartModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="View fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span className="text-sm">Fullscreen</span>
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={600}>
                    <ScatterChart
                      margin={{ top: 80, right: 40, bottom: 100, left: 80 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-slate-300 dark:stroke-slate-600"
                      />
                      <XAxis
                        type="category"
                        dataKey="state"
                        name="State"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        className="text-slate-600 dark:text-slate-400"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="averageGross"
                        name="Average Gross"
                        label={{
                          value: "Average Charges ($)",
                          angle: -90,
                          position: "left",
                          offset: 15,
                        }}
                        className="text-slate-600 dark:text-slate-400"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                                <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                                  {data.state}
                                </p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Avg Gross:
                                    </span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      ${data.averageGross.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Total Loads:
                                    </span>
                                    <span className="font-semibold">
                                      {data.totalLoads}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Rate/Mile:
                                    </span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                                      ${data.averageRatePerMile.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Total Gross:
                                    </span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      ${data.totalGross.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        content={() => (
                          <div className="flex flex-wrap gap-4 justify-center text-sm">
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("high")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("high")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-green-500 ${
                                  activeCategories.has("high")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                High Profitability (&gt;$2.50/mi)
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("profitable")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("profitable")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-blue-500 ${
                                  activeCategories.has("profitable")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                Profitable ($2.00-$2.50/mi)
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("moderate")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("moderate")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-orange-500 ${
                                  activeCategories.has("moderate")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                Moderate ($1.50-$2.00/mi)
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("low")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("low")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-red-500 ${
                                  activeCategories.has("low")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                Low (&lt;$1.50/mi)
                              </span>
                            </div>
                          </div>
                        )}
                      />
                      <Scatter
                        name="Destinations"
                        data={chartData}
                        fill="#8884d8"
                        shape={(props: any) => {
                          const { cx, cy, payload } = props;
                          const size = payload.size || 20;
                          const index = chartData.findIndex(
                            (d) => d.state === payload.state
                          );
                          return (
                            <g>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={size / 2}
                                fill={payload.color}
                                stroke="#fff"
                                strokeWidth={2}
                                opacity={0.9}
                                filter="url(#bubbleShadow)"
                                style={{
                                  cursor: "pointer",
                                  pointerEvents: "all",
                                }}
                              />
                              <circle
                                cx={cx}
                                cy={cy}
                                r={size / 2}
                                fill="url(#bubbleGradient)"
                                opacity={0.7}
                                style={{ pointerEvents: "none" }}
                              />
                            </g>
                          );
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fullscreen Chart Modal */}
        {isChartModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-white dark:bg-slate-800 flex flex-col"
            onClick={() => setIsChartModalOpen(false)}
          >
            <div
              className="flex-1 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Average Charges by Destination State
                  </h2>
                </div>
                <button
                  onClick={() => setIsChartModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              <div className="flex-1 p-6 overflow-auto">
                {chartData.length > 0 && (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minHeight={600}
                  >
                    <ScatterChart
                      margin={{ top: 80, right: 40, bottom: 100, left: 80 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-slate-300 dark:stroke-slate-600"
                      />
                      <XAxis
                        type="category"
                        dataKey="state"
                        name="State"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        className="text-slate-600 dark:text-slate-400"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="averageGross"
                        name="Average Gross"
                        label={{
                          value: "Average Charges ($)",
                          angle: -90,
                          position: "left",
                          offset: 15,
                        }}
                        className="text-slate-600 dark:text-slate-400"
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
                                <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">
                                  {data.state}
                                </p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Avg Gross:
                                    </span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      ${data.averageGross.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Total Loads:
                                    </span>
                                    <span className="font-semibold">
                                      {data.totalLoads}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Rate/Mile:
                                    </span>
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                                      ${data.averageRatePerMile.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-slate-600 dark:text-slate-400">
                                      Total Gross:
                                    </span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                      ${data.totalGross.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        content={() => (
                          <div className="flex flex-wrap gap-4 justify-center text-sm">
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("high")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("high")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-green-500 ${
                                  activeCategories.has("high")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                High Profitability (&gt;$2.50/mi)
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("profitable")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("profitable")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-blue-500 ${
                                  activeCategories.has("profitable")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                Profitable ($2.00-$2.50/mi)
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("moderate")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("moderate")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-orange-500 ${
                                  activeCategories.has("moderate")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                Moderate ($1.50-$2.00/mi)
                              </span>
                            </div>
                            <div
                              className={`flex items-center gap-2 cursor-pointer transition-opacity ${
                                activeCategories.has("low")
                                  ? "opacity-100"
                                  : "opacity-40"
                              }`}
                              onClick={() => toggleCategory("low")}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-red-500 ${
                                  activeCategories.has("low")
                                    ? ""
                                    : "line-through"
                                }`}
                              ></div>
                              <span className="text-slate-600 dark:text-slate-400">
                                Low (&lt;$1.50/mi)
                              </span>
                            </div>
                          </div>
                        )}
                      />
                      <Scatter
                        name="Destinations"
                        data={chartData}
                        fill="#8884d8"
                        shape={(props: any) => {
                          const { cx, cy, payload } = props;
                          const size = payload.size || 20;
                          const index = chartData.findIndex(
                            (d) => d.state === payload.state
                          );
                          return (
                            <g>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={size / 2}
                                fill={payload.color}
                                stroke="#fff"
                                strokeWidth={2}
                                opacity={0.9}
                                filter="url(#bubbleShadow)"
                                style={{
                                  cursor: "pointer",
                                  pointerEvents: "all",
                                }}
                              />
                              <circle
                                cx={cx}
                                cy={cy}
                                r={size / 2}
                                fill="url(#bubbleGradient)"
                                opacity={0.7}
                                style={{ pointerEvents: "none" }}
                              />
                            </g>
                          );
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
