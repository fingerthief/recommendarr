import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class SonarrService {
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
    const credentials = await credentialsService.getCredentials('sonarr');
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
        throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
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
        console.log(`Making ${method} request to Sonarr via proxy: ${endpoint}`);
        
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
        console.log(`Making direct ${method} request to Sonarr: ${endpoint}`);
        
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
      console.error(`Error in Sonarr API request to ${endpoint}:`, error);
      
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
   * Configure the Sonarr service with API details
   * @param {string} baseUrl - The base URL of your Sonarr instance (e.g., http://localhost:8989)
   * @param {string} apiKey - Your Sonarr API key
   */
  async configure(baseUrl, apiKey) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.apiKey = apiKey;
    
    // Store credentials server-side
    await credentialsService.storeCredentials('sonarr', {
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
   * Get all series from Sonarr
   * @returns {Promise<Array>} - List of TV shows
   */
  async getSeries() {
    try {
      return await this._apiRequest('/api/v3/series');
    } catch (error) {
      console.error('Error fetching series from Sonarr:', error);
      throw error;
    }
  }
  
  /**
   * Check if a series already exists in the Sonarr library
   * @param {string} title - The series title to search for
   * @returns {Promise<Object|null>} - Series info if found in library, null otherwise
   */
  async findExistingSeriesByTitle(title) {
    try {
      // Search in the existing library
      const libraryData = await this._apiRequest('/api/v3/series');
      
      // Look for exact match first
      let match = libraryData.find(show => 
        show.title.toLowerCase() === title.toLowerCase()
      );
      
      // If no exact match, try a more flexible search
      if (!match) {
        match = libraryData.find(show => 
          show.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(show.title.toLowerCase())
        );
      }
      
      return match || null;
    } catch (error) {
      console.error(`Error checking if series "${title}" exists in Sonarr:`, error);
      return null;
    }
  }

  /**
   * Search for a series by title in Sonarr
   * @param {string} title - The series title to search for
   * @returns {Promise<Object|null>} - Series info if found, null otherwise
   */
  async findSeriesByTitle(title) {
    try {
      // First try to search in existing library
      const libraryData = await this._apiRequest('/api/v3/series');
      
      // Find closest match in library
      const libraryMatch = libraryData.find(show => 
        show.title.toLowerCase() === title.toLowerCase()
      );
      
      if (libraryMatch) {
        return libraryMatch;
      }
      
      // If not found in library, search lookup
      // Make sure we're not adding any wildcards or special characters
      const cleanTitle = title.trim();
      
      // Use the API request helper with the term as a parameter
      const lookupData = await this._apiRequest('/api/v3/series/lookup', 'GET', null, { term: cleanTitle });
      
      if (lookupData && lookupData.length > 0) {
        return lookupData[0];
      }
      
      return null;
    } catch (error) {
      console.error(`Error searching for series "${title}" in Sonarr:`, error);
      return null;
    }
  }

  /**
   * Test the connection to Sonarr
   * @returns {Promise<boolean>} - Whether the connection is successful
   */
  async testConnection() {
    try {
      console.log('Testing Sonarr connection with URL:', this.baseUrl);
      await this._apiRequest('/api/v3/system/status');
      console.log('Sonarr connection successful');
      return true;
    } catch (error) {
      console.error('Error connecting to Sonarr:', error);
      // Log more detailed diagnostics information
      if (this.useProxy) {
        console.log('Using proxy mode - check server logs for details');
      } else {
        console.log('Using direct connection mode');
      }
      return false;
    }
  }

  /**
   * Get quality profiles from Sonarr
   * @returns {Promise<Array>} - List of quality profiles
   */
  async getQualityProfiles() {
    try {
      return await this._apiRequest('/api/v3/qualityprofile');
    } catch (error) {
      console.error('Error fetching quality profiles from Sonarr:', error);
      throw error;
    }
  }

  /**
   * Get root folders from Sonarr
   * @returns {Promise<Array>} - List of root folders
   */
  async getRootFolders() {
    try {
      return await this._apiRequest('/api/v3/rootfolder');
    } catch (error) {
      console.error('Error fetching root folders from Sonarr:', error);
      throw error;
    }
  }

  /**
   * Look up a series by title in Sonarr API
   * @param {string} title - The title to search for
   * @returns {Promise<Object>} - Series details from the lookup
   */
  async lookupSeries(title) {
    try {
      const cleanTitle = title.trim();
      const lookupData = await this._apiRequest('/api/v3/series/lookup', 'GET', null, { term: cleanTitle });
      
      if (!lookupData || lookupData.length === 0) {
        throw new Error(`Series "${title}" not found in Sonarr lookup.`);
      }
      
      return lookupData[0];
    } catch (error) {
      console.error(`Error looking up series "${title}" in Sonarr:`, error);
      throw error;
    }
  }
  
  /**
   * Add a series to Sonarr
   * @param {string} title - The series title to search for
   * @param {Array} [selectedSeasons] - Array of season numbers to monitor (optional)
   * @param {number} [qualityProfileId] - Quality profile ID to use (optional)
   * @param {string} [rootFolderPath] - Root folder path to use (optional)
   * @returns {Promise<Object>} - The added series object
   */
  async addSeries(title, selectedSeasons = null, qualityProfileId = null, rootFolderPath = null) {
    if (!this.isConfigured()) {
      throw new Error('Sonarr service is not configured. Please set baseUrl and apiKey.');
    }
    
    try {
      // 1. Look up the series to get details
      const seriesData = await this.lookupSeries(title);
      
      // 2. Get quality profiles and root folders if not provided
      const [qualityProfiles, rootFolders] = await Promise.all([
        this.getQualityProfiles(),
        this.getRootFolders()
      ]);
      
      if (!qualityProfiles.length) {
        throw new Error('No quality profiles found in Sonarr.');
      }
      
      if (!rootFolders.length) {
        throw new Error('No root folders found in Sonarr.');
      }
      
      // Use provided values or default to the first available option
      const selectedQualityProfileId = qualityProfileId || qualityProfiles[0].id;
      const selectedRootFolderPath = rootFolderPath || rootFolders[0].path;
      
      // 3. Prepare seasons configuration
      // If specific seasons were selected, only monitor those
      const seasons = seriesData.seasons.map(season => ({
        seasonNumber: season.seasonNumber,
        monitored: selectedSeasons ? selectedSeasons.includes(season.seasonNumber) : true
      }));
      
      // 4. Prepare payload for adding the series
      const payload = {
        title: seriesData.title,
        tvdbId: seriesData.tvdbId,
        qualityProfileId: selectedQualityProfileId,
        rootFolderPath: selectedRootFolderPath,
        monitored: true,
        seasonFolder: true,
        seriesType: 'standard',
        seasons: seasons,
        addOptions: {
          searchForMissingEpisodes: true
        }
      };
      
      // 5. Add the series
      return await this._apiRequest('/api/v3/series', 'POST', payload);
    } catch (error) {
      console.error(`Error adding series "${title}" to Sonarr:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const sonarrService = new SonarrService();

export default sonarrService;