import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class RadarrService {
  constructor() {
    this.apiKey = '';
    this.baseUrl = '';
    // Flag to determine if we should use the proxy
    this.useProxy = true;
    // Load credentials when instantiated
    this.loadCredentials();
  }
  
  /**
   * Load credentials from server-side storage
   */
  async loadCredentials() {
    const credentials = await credentialsService.getCredentials('radarr');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.apiKey = credentials.apiKey || '';
    }
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
      // Try to load credentials again in case they weren't ready during init
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Radarr service is not configured. Please set baseUrl and apiKey.');
      }
    }

    // Always include API key in params
    const requestParams = { 
      ...params,
      apiKey: this.apiKey 
    };
    
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      if (this.useProxy) {
        // Log attempt to connect through proxy for debugging
        console.log(`Making ${method} request to Radarr via proxy: ${endpoint}`);
        
        const response = await apiService.proxyRequest({
          url,
          method,
          data,
          params: requestParams
        });
        
        // The proxy returns the data wrapped, we need to unwrap it
        return response.data;
      } else {
        // Direct API request
        console.log(`Making direct ${method} request to Radarr: ${endpoint}`);
        
        const response = await axios({
          url,
          method,
          data,
          params: requestParams,
          timeout: 10000 // 10 second timeout
        });
        
        return response.data;
      }
    } catch (error) {
      console.error(`Error in Radarr API request to ${endpoint}:`, error);
      
      // Enhance the error with more helpful information
      const enhancedError = {
        ...error,
        message: error.message || 'Unknown error',
        endpoint,
        url
      };
      
      throw enhancedError;
    }
  }

  /**
   * Configure the Radarr service with API details
   * @param {string} baseUrl - The base URL of your Radarr instance (e.g., http://localhost:7878)
   * @param {string} apiKey - Your Radarr API key
   */
  async configure(baseUrl, apiKey) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.apiKey = apiKey;
    
    // Store credentials server-side
    await credentialsService.storeCredentials('radarr', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey
    });
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
    try {
      // Search in the existing library
      const libraryData = await this._apiRequest('/api/v3/movie');
      
      // Look for exact match first
      let match = libraryData.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      // If no exact match, try a more flexible search
      if (!match) {
        match = libraryData.find(movie => 
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
    try {
      // First try to search in existing library
      const libraryData = await this._apiRequest('/api/v3/movie');
      
      // Find closest match in library
      const libraryMatch = libraryData.find(movie => 
        movie.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      const cleanTitle = title.trim();
      
      // Use the API request helper with the term as a parameter
      const lookupData = await this._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: cleanTitle });
      
      if (lookupData && lookupData.length > 0) {
        return lookupData[0];
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
    try {
      return await this._apiRequest('/api/v3/qualityprofile');
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
    try {
      return await this._apiRequest('/api/v3/rootfolder');
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
    try {
      // 1. Look up the movie to get details
      const cleanTitle = title.trim();
      const lookupData = await this._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: cleanTitle });
      
      if (!lookupData || lookupData.length === 0) {
        throw new Error(`Movie "${title}" not found in Radarr lookup.`);
      }
      
      const movieData = lookupData[0];
      
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
      return await this._apiRequest('/api/v3/movie', 'POST', payload);
    } catch (error) {
      console.error(`Error adding movie "${title}" to Radarr:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const radarrService = new RadarrService();

export default radarrService;