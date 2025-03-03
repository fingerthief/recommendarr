import axios from 'axios';
import apiService from './ApiService';

class RadarrService {
  constructor() {
    // Try to restore from localStorage on initialization
    this.apiKey = localStorage.getItem('radarrApiKey') || '';
    this.baseUrl = localStorage.getItem('radarrBaseUrl') || '';
    // Flag to determine if we should use the proxy
    this.useProxy = true;
  }
  
  /**
   * Helper method to make API requests through proxy if enabled
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request body
   * @param {Object} params - URL parameters
   * @returns {Promise<Object>} - Response data
   * @private
   */
  async _apiRequest(endpoint, method = 'GET', data = null, params = {}) {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }

    // Always include API key in params
    const requestParams = { 
      ...params,
      apiKey: this.apiKey 
    };
    
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      if (this.useProxy) {
        const response = await apiService.proxyRequest({
          url,
          method,
          data,
          params: requestParams
        });
        return response.data;
      } else {
        const response = await axios({
          url,
          method,
          data,
          params: requestParams
        });
        return response.data;
      }
    } catch (error) {
      console.error(`Error in Radarr API request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Configure the Radarr service with API details
   * @param {string} baseUrl - The base URL of your Radarr instance (e.g., http://localhost:7878)
   * @param {string} apiKey - Your Radarr API key
   */
  configure(baseUrl, apiKey) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.apiKey = apiKey;
    
    // Save to localStorage for persistence
    if (baseUrl) localStorage.setItem('radarrBaseUrl', this.baseUrl);
    if (apiKey) localStorage.setItem('radarrApiKey', this.apiKey);
  }

  /**
   * Check if the service is configured with API key and URL
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return this.apiKey && this.baseUrl;
  }

  /**
   * Get all movies from Radarr
   * @returns {Promise<Array>} - List of movies
   */
  async getMovies() {
    try {
      return await this._apiRequest('/api/v3/movie');
    } catch (error) {
      console.error('Error fetching movies from Radarr:', error);
      throw error;
    }
  }
  
  /**
   * Check if a movie already exists in the Radarr library
   * @param {string} title - The movie title to search for
   * @returns {Promise<Object|null>} - Movie info if found in library, null otherwise
   */
  async findExistingMovieByTitle(title) {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // Search in the existing library
      const libraryResponse = await axios.get(`${this.baseUrl}/api/v3/movie`, {
        params: { apiKey: this.apiKey }
      });
      
      // Look for exact match first
      let match = libraryResponse.data.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      // If no exact match, try a more flexible search
      if (!match) {
        match = libraryResponse.data.find(movie => 
          movie.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(movie.title.toLowerCase())
        );
      }
      
      return match || null;
    } catch (error) {
      console.error(`Error checking if movie "${title}" exists in Radarr:`, error);
      return null;
    }
  }

  /**
   * Search for a movie by title in Radarr
   * @param {string} title - The movie title to search for
   * @returns {Promise<Object|null>} - Movie info if found, null otherwise
   */
  async findMovieByTitle(title) {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // First try to search in existing library
      const libraryResponse = await axios.get(`${this.baseUrl}/api/v3/movie`, {
        params: { apiKey: this.apiKey }
      });
      
      // Find closest match in library
      const libraryMatch = libraryResponse.data.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      // Radarr's API doesn't need wildcards - it does its own fuzzy matching
      const cleanTitle = title.trim();
      const encodedTitle = encodeURIComponent(cleanTitle);
      const lookupUrl = `${this.baseUrl}/api/v3/movie/lookup?apiKey=${this.apiKey}&term=${encodedTitle}`;
      const lookupResponse = await axios.get(lookupUrl);
      
      if (lookupResponse.data && lookupResponse.data.length > 0) {
        return lookupResponse.data[0];
      }
      
      return null;
    } catch (error) {
      console.error(`Error searching for movie "${title}" in Radarr:`, error);
      return null;
    }
  }

  /**
   * Test the connection to Radarr
   * @returns {Promise<boolean>} - Whether the connection is successful
   */
  async testConnection() {
    try {
      await this._apiRequest('/api/v3/system/status');
      return true;
    } catch (error) {
      console.error('Error connecting to Radarr:', error);
      return false;
    }
  }

  /**
   * Get quality profiles from Radarr
   * @returns {Promise<Array>} - List of quality profiles
   */
  async getQualityProfiles() {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/qualityprofile`, {
        params: { apiKey: this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching quality profiles from Radarr:', error);
      throw error;
    }
  }

  /**
   * Get root folders from Radarr
   * @returns {Promise<Array>} - List of root folders
   */
  async getRootFolders() {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/rootfolder`, {
        params: { apiKey: this.apiKey }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching root folders from Radarr:', error);
      throw error;
    }
  }

  /**
   * Add a movie to Radarr
   * @param {string} title - The movie title to search for
   * @param {number} [qualityProfileId] - Quality profile ID to use (optional)
   * @param {string} [rootFolderPath] - Root folder path to use (optional)
   * @returns {Promise<Object>} - The added movie object
   */
  async addMovie(title, qualityProfileId = null, rootFolderPath = null) {
    if (!this.isConfigured()) {
      throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // 1. Look up the movie to get details
      const cleanTitle = title.trim();
      const encodedTitle = encodeURIComponent(cleanTitle);
      const lookupUrl = `${this.baseUrl}/api/v3/movie/lookup?apiKey=${this.apiKey}&term=${encodedTitle}`;
      const lookupResponse = await axios.get(lookupUrl);
      
      if (!lookupResponse.data || lookupResponse.data.length === 0) {
        throw new Error(`Movie "${title}" not found in Radarr lookup.`);
      }
      
      const movieData = lookupResponse.data[0];
      
      // 2. Get quality profiles and root folders if not provided
      const [qualityProfiles, rootFolders] = await Promise.all([
        this.getQualityProfiles(),
        this.getRootFolders()
      ]);
      
      if (!qualityProfiles.length) {
        throw new Error('No quality profiles found in Radarr.');
      }
      
      if (!rootFolders.length) {
        throw new Error('No root folders found in Radarr.');
      }
      
      // Use provided values or default to the first available option
      const selectedQualityProfileId = qualityProfileId || qualityProfiles[0].id;
      const selectedRootFolderPath = rootFolderPath || rootFolders[0].path;
      
      // 3. Prepare payload for adding the movie
      const payload = {
        title: movieData.title,
        tmdbId: movieData.tmdbId,
        year: movieData.year,
        qualityProfileId: selectedQualityProfileId,
        rootFolderPath: selectedRootFolderPath,
        monitored: true,
        addOptions: {
          searchForMovie: true
        }
      };
      
      // 4. Add the movie
      const response = await axios.post(`${this.baseUrl}/api/v3/movie`, payload, {
        params: { apiKey: this.apiKey }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error adding movie "${title}" to Radarr:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const radarrService = new RadarrService();

export default radarrService;