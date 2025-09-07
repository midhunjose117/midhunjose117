const axios = require('axios');

class TravelService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  async estimateTravelTime(bufferMinutes, destination, startTime, mode = 'driving') {
    try {
      if (!this.googleMapsApiKey) {
        console.warn('Google Maps API key not configured');
        return {
          estimated: 0,
          buffer: bufferMinutes,
          mode: mode
        };
      }

      // For now, return a mock estimation
      // In production, you would use Google Maps Distance Matrix API
      const mockTravelTime = this.getMockTravelTime(destination, mode);
      
      return {
        estimated: mockTravelTime,
        buffer: bufferMinutes,
        mode: mode,
        departureTime: startTime
      };
    } catch (error) {
      console.error('Error estimating travel time:', error);
      return {
        estimated: 0,
        buffer: bufferMinutes,
        mode: mode
      };
    }
  }

  async getDirections(origin, destination, mode = 'driving') {
    try {
      if (!this.googleMapsApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: origin,
          destination: destination,
          mode: mode,
          key: this.googleMapsApiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting directions:', error);
      throw new Error('Failed to get directions');
    }
  }

  async getDistanceMatrix(origins, destinations, mode = 'driving') {
    try {
      if (!this.googleMapsApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/distancematrix/json`, {
        params: {
          origins: origins.join('|'),
          destinations: destinations.join('|'),
          mode: mode,
          key: this.googleMapsApiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting distance matrix:', error);
      throw new Error('Failed to get distance matrix');
    }
  }

  async optimizeRoute(waypoints, startLocation, endLocation) {
    try {
      if (!this.googleMapsApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: startLocation,
          destination: endLocation,
          waypoints: waypoints.join('|'),
          optimize: true,
          key: this.googleMapsApiKey
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error optimizing route:', error);
      throw new Error('Failed to optimize route');
    }
  }

  getMockTravelTime(destination, mode) {
    // Mock travel time estimation based on mode
    const baseTime = {
      driving: 20,
      walking: 10,
      transit: 30,
      cycling: 15
    };

    // Add some randomness based on destination
    const randomFactor = Math.random() * 0.5 + 0.75; // 0.75 to 1.25
    return Math.round(baseTime[mode] * randomFactor);
  }

  async getTrafficConditions(location, time) {
    try {
      if (!this.googleMapsApiKey) {
        return { level: 'unknown', description: 'Traffic data unavailable' };
      }

      // This would use Google Maps Traffic API in production
      // For now, return mock data
      const trafficLevels = ['light', 'moderate', 'heavy', 'severe'];
      const randomLevel = trafficLevels[Math.floor(Math.random() * trafficLevels.length)];

      return {
        level: randomLevel,
        description: `Traffic is ${randomLevel}`,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error getting traffic conditions:', error);
      return { level: 'unknown', description: 'Traffic data unavailable' };
    }
  }

  calculateOptimalDepartureTime(eventStartTime, travelTime, bufferMinutes) {
    const departureTime = new Date(eventStartTime);
    departureTime.setMinutes(departureTime.getMinutes() - travelTime - bufferMinutes);
    return departureTime;
  }

  async suggestOptimalTravelMode(origin, destination, preferences) {
    try {
      const modes = ['driving', 'walking', 'transit', 'cycling'];
      const suggestions = [];

      for (const mode of modes) {
        const travelTime = await this.estimateTravelTime(0, destination, new Date(), mode);
        const cost = this.estimateTravelCost(mode, travelTime.estimated);
        
        suggestions.push({
          mode,
          estimatedTime: travelTime.estimated,
          cost,
          ecoFriendly: ['walking', 'cycling', 'transit'].includes(mode),
          suitable: this.isModeSuitable(mode, preferences, travelTime.estimated)
        });
      }

      return suggestions.sort((a, b) => {
        // Sort by suitability, then by time
        if (a.suitable !== b.suitable) {
          return b.suitable - a.suitable;
        }
        return a.estimatedTime - b.estimatedTime;
      });
    } catch (error) {
      console.error('Error suggesting travel modes:', error);
      return [];
    }
  }

  estimateTravelCost(mode, timeMinutes) {
    const costs = {
      driving: timeMinutes * 0.5, // $0.50 per minute (gas, parking, etc.)
      walking: 0,
      transit: 2.5, // Fixed transit fare
      cycling: 0
    };

    return costs[mode] || 0;
  }

  isModeSuitable(mode, preferences, timeMinutes) {
    const maxTimes = {
      walking: 15,
      cycling: 30,
      transit: 60,
      driving: 120
    };

    return timeMinutes <= maxTimes[mode];
  }
}

module.exports = new TravelService();