import axios from 'axios';
import apiService from './ApiService';
import credentialsService from './CredentialsService';

class TautulliService {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.configured = false;
    // Flag to determine if we should use the proxy
    this.useProxy = true;
    
    // Try to load saved credentials
    this.loadCredentials();
  }
  
  /**
   * Load saved credentials from the server
   */
  async loadCredentials() {
    try {
      const credentials = await credentialsService.getCredentials('tautulli');
      if (credentials) {
        this.baseUrl = credentials.baseUrl || '';
        this.apiKey = credentials.apiKey || '';
        this.configured = !!(this.baseUrl && this.apiKey);
        
        // Load recentLimit if available
        if (credentials.recentLimit) {
          localStorage.setItem('tautulliRecentLimit', credentials.recentLimit.toString());
        }
        
        return true;
      }
    } catch (error) {
      console.error('Failed to load Tautulli credentials:', error);
    }
    return false;
  }

  async configure(baseUrl, apiKey, recentLimit = null) {
    // Validate and normalize the base URL
    if (baseUrl) {
      // Make sure the URL starts with http:// or https://
      if (!baseUrl.match(/^https?:\/\//)) {
        baseUrl = 'http://' + baseUrl;
      }
      
      // Remove trailing slashes
      baseUrl = baseUrl.replace(/\/+$/, '');
      
      this.baseUrl = baseUrl;
      this.apiKey = apiKey;
      this.configured = true;
      
      const credentials = {
        baseUrl: this.baseUrl,
        apiKey: this.apiKey
      };
      
      // If recentLimit is provided, store it with the credentials
      if (recentLimit !== null) {
        credentials.recentLimit = recentLimit;
        // Also store in localStorage for client-side access
        localStorage.setItem('tautulliRecentLimit', recentLimit.toString());
      }
      
      // Store credentials on the server
      await credentialsService.storeCredentials('tautulli', credentials);
      
      return true;
    }
    
    return false;
  }
  
  isConfigured() {
    return this.baseUrl && this.apiKey;
  }
  
  async testConnection() {
    if (!this.isConfigured()) {
      return false;
    }
    
    try {
      // Try to get the server info as a basic test
      const response = await this._apiRequest('get_server_info');
      return response.response.result === 'success';
    } catch (error) {
      console.error('Tautulli connection test failed:', error);
      return false;
    }
  }
  
  async _apiRequest(cmd, params = {}) {
    if (!this.isConfigured()) {
      // Try to load credentials again in case they weren't ready during init
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Tautulli service is not configured');
      }
    }
    
    const requestParams = {
      apikey: this.apiKey,
      cmd: cmd,
      ...params
    };
    
    const url = `${this.baseUrl}/api/v2`;
    
    try {
      if (this.useProxy) {
        // Log attempt to connect through proxy for debugging
        console.log(`Making request to Tautulli via proxy: cmd=${cmd}`);
        
        const response = await apiService.proxyRequest({
          url,
          method: 'GET',
          params: requestParams
        });
        
        // The proxy returns the data wrapped, we need to unwrap it
        return response.data;
      } else {
        // Direct API request
        console.log(`Making direct request to Tautulli: cmd=${cmd}`);
        
        const response = await axios.get(url, {
          params: requestParams,
          // Removed timeout to allow slower network connections
        });
        
        return response.data;
      }
    } catch (error) {
      console.error(`Tautulli API error (${cmd}):`, error);
      
      // Enhance the error with more helpful information
      const enhancedError = {
        ...error,
        message: error.message || 'Unknown error',
        cmd,
        url
      };
      
      throw enhancedError;
    }
  }
  
  async getUsers() {
    try {
      const response = await this._apiRequest('get_users');
      return response.response.data;
    } catch (error) {
      console.error('Failed to get Tautulli users:', error);
      return [];
    }
  }
  
  async getWatchHistory(userId = null, mediaType = null, limit = 50, daysAgo = 0) {
    try {
      const params = {
        length: limit
      };
      
      // If userId is provided and not empty string, filter by that user
      if (userId !== null && userId !== undefined && userId !== '') {
        console.log(`Filtering Tautulli history by user_id: ${userId}`);
        params.user_id = userId;
      } else {
        console.log('No user_id filter applied to Tautulli history (showing all users)');
      }
      
      // Filter by media type if provided (movie or episode)
      if (mediaType) {
        params.media_type = mediaType;
      }
      
      // Apply date filter if daysAgo is specified
      if (daysAgo > 0) {
        const today = new Date();
        const past = new Date();
        past.setDate(today.getDate() - daysAgo);
        
        // Convert to YYYY-MM-DD format
        const dateStr = past.toISOString().split('T')[0];
        params.start_date = dateStr;
      }
      
      const response = await this._apiRequest('get_history', params);
      return response.response.data.data;
    } catch (error) {
      console.error('Failed to get Tautulli watch history:', error);
      return [];
    }
  }
  
  async getRecentlyWatchedMovies(limit = 50, daysAgo = 0, userId = null) {
    try {
      const historyData = await this.getWatchHistory(userId, 'movie', limit, daysAgo);
      
      // Process and format the movie data
      return historyData.map(item => ({
        title: item.full_title,
        year: item.year,
        tmdbId: item.grandparent_rating_key || item.rating_key,
        posterPath: item.thumb,
        watched: new Date(item.date).toISOString(),
        progress: item.percent_complete
      }));
    } catch (error) {
      console.error('Failed to get recently watched movies from Tautulli:', error);
      return [];
    }
  }
  
  async getRecentlyWatchedShows(limit = 50, daysAgo = 0, userId = null) {
    try {
      const historyData = await this.getWatchHistory(userId, 'episode', limit, daysAgo);
      
      // Group episodes by show
      const showMap = new Map();
      
      historyData.forEach(item => {
        const showId = item.grandparent_rating_key;
        const showTitle = item.grandparent_title;
        
        if (!showMap.has(showId)) {
          showMap.set(showId, {
            title: showTitle,
            tmdbId: showId,
            posterPath: item.grandparent_thumb,
            episodes: [],
            lastWatched: new Date(item.date).toISOString()
          });
        }
        
        // Add this episode
        showMap.get(showId).episodes.push({
          title: item.full_title,
          season: item.parent_media_index,
          episode: item.media_index,
          watched: new Date(item.date).toISOString(),
          progress: item.percent_complete
        });
        
        // Update last watched if this is more recent
        const episodeDate = new Date(item.date);
        const lastWatchedDate = new Date(showMap.get(showId).lastWatched);
        
        if (episodeDate > lastWatchedDate) {
          showMap.get(showId).lastWatched = episodeDate.toISOString();
        }
      });
      
      // Convert map to array and sort by last watched (most recent first)
      return Array.from(showMap.values()).sort((a, b) => {
        return new Date(b.lastWatched) - new Date(a.lastWatched);
      });
    } catch (error) {
      console.error('Failed to get recently watched shows from Tautulli:', error);
      return [];
    }
  }
}

export default new TautulliService();