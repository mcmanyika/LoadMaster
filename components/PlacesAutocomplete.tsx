import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
    gm_authFailure?: () => void;
  }
}

export const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'City, ST',
  className = '',
  required = false,
  onPlaceSelect
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load Google Maps API script
  useEffect(() => {
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          setIsLoading(false);
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    // Get API key from environment variable or use a placeholder
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
    
    if (!apiKey) {
      console.warn('Google Places API key not found. Please set VITE_GOOGLE_PLACES_API_KEY in your .env file');
      setError('API key not configured');
      setIsLoading(false);
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        // Check if Google Maps loaded successfully
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          setIsLoading(false);
          setError(null);
        } else {
          setError('Google Maps API loaded but Places library is not available. Please check that the Places API is enabled.');
          setIsLoading(false);
        }
      }, 100);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
      setError('Failed to load Google Maps API. Please enable Maps JavaScript API and Places API in Google Cloud Console.');
      setIsLoading(false);
    };

    // Listen for Google Maps API errors
    window.gm_authFailure = () => {
      setError('API not activated. Please enable Maps JavaScript API and Places API in Google Cloud Console.');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if component unmounts before script loads
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize Autocomplete when API is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      // Verify Google Maps is available
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        setError('Google Maps Places API is not available');
        return;
      }

      // Create Autocomplete instance
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(cities)'], // Restrict to cities
        componentRestrictions: { country: 'us' }, // Restrict to US
        fields: ['formatted_address', 'address_components', 'geometry', 'name']
      });

      autocompleteRef.current = autocomplete;

      // Listen for place selection
      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place.formatted_address) {
          // Try to extract city and state
          let formattedValue = place.formatted_address;
          
          if (place.address_components) {
            const cityComponent = place.address_components.find(
              component => component.types.includes('locality')
            );
            const stateComponent = place.address_components.find(
              component => component.types.includes('administrative_area_level_1')
            );
            
            if (cityComponent && stateComponent) {
              formattedValue = `${cityComponent.long_name}, ${stateComponent.short_name}`;
            } else if (place.name && stateComponent) {
              // Fallback to place name if city component not found
              formattedValue = `${place.name}, ${stateComponent.short_name}`;
            }
          }
          
          onChange(formattedValue);
          
          if (onPlaceSelect) {
            onPlaceSelect(place);
          }
        }
      });

      return () => {
        if (autocompleteRef.current) {
          window.google.maps.event.removeListener(listener);
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error: any) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setError(error?.message || 'Failed to initialize autocomplete');
    }
  }, [isLoaded, onChange, onPlaceSelect]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // If there's an error, fall back to regular input
  if (error && !isLoading) {
    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={className}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
            title="Clear"
          >
            <X size={14} className="text-slate-400" />
          </button>
        )}
        <div className="absolute -bottom-5 left-0 text-xs text-red-500 mt-1">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
        disabled={isLoading}
      />
      {value && !isLoading && !error && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
          title="Clear"
        >
          <X size={14} className="text-slate-400" />
        </button>
      )}
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {error && (
        <div className="absolute -bottom-5 left-0 text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

