/**
 * Calculate distance between two locations using Google Maps Distance Matrix API
 * Returns distance in miles
 */
export const calculateDistance = async (
  origin: string,
  destination: string,
  originPlace?: google.maps.places.PlaceResult,
  destinationPlace?: google.maps.places.PlaceResult
): Promise<{ distance: number; error?: string }> => {
  // Check if Google Maps is loaded
  if (!window.google || !window.google.maps) {
    return { distance: 0, error: 'Google Maps API not loaded' };
  }

  try {
    const service = new window.google.maps.DistanceMatrixService();

    // Use coordinates if available, otherwise use address strings
    let originParam: string | google.maps.LatLng;
    let destinationParam: string | google.maps.LatLng;

    if (originPlace?.geometry?.location) {
      originParam = originPlace.geometry.location;
    } else {
      originParam = origin;
    }

    if (destinationPlace?.geometry?.location) {
      destinationParam = destinationPlace.geometry.location;
    } else {
      destinationParam = destination;
    }

    return new Promise((resolve) => {
      service.getDistanceMatrix(
        {
          origins: [originParam],
          destinations: [destinationParam],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        },
        (response, status) => {
          if (status === window.google.maps.DistanceMatrixStatus.OK && response) {
            const element = response.rows[0].elements[0];
            if (element.status === window.google.maps.DistanceMatrixElementStatus.OK) {
              // Distance is returned in meters, convert to miles
              const distanceInMiles = element.distance.value / 1609.34;
              resolve({ distance: Math.round(distanceInMiles) });
            } else {
              resolve({ distance: 0, error: `Could not calculate distance: ${element.status}` });
            }
          } else {
            resolve({ distance: 0, error: `Distance Matrix API error: ${status}` });
          }
        }
      );
    });
  } catch (error: any) {
    console.error('Error calculating distance:', error);
    return { distance: 0, error: error?.message || 'Failed to calculate distance' };
  }
};

