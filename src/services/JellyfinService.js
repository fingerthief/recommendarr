import axios from 'axios';
import credentialsService from './CredentialsService';

class JellyfinService {
  constructor() {
    this.baseUrl = '';
    this.apiKey = '';
    this.userId = '';
    // Load credentials when instantiated
    this.loadCredentials();
  }

  /**
   * Load credentials from server-side storage
   */
  async loadCredentials() {
    const credentials = await credentialsService.getCredentials('jellyfin');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.apiKey = credentials.apiKey || '';
      this.userId = credentials.userId || '';
    }
  }

  async configure(baseUrl, apiKey, userId) {
    // Ensure baseUrl doesn't end with a slash
    this.baseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : '';
    this.apiKey = apiKey || '';
    this.userId = userId || '';

    // Store credentials server-side
    await credentialsService.storeCredentials('jellyfin', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      userId: this.userId
    });
  }

  isConfigured() {
    return !!this.baseUrl && !!this.apiKey;
  }
  
  async getUsers() {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        return [];
      }
    }
    
    try {
      const response = await axios.get(`${this.baseUrl}/Users`, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });
      
      return response.data.map(user => ({
        id: user.Id,
        name: user.Name,
        lastLoginDate: user.LastLoginDate,
        hasPassword: user.HasPassword,
        isAdministrator: user.Policy?.IsAdministrator || false
      }));
    } catch (error) {
      console.error('Error fetching Jellyfin users:', error);
      return [];
    }
  }

  async testConnection() {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        return { success: false, message: 'Jellyfin URL and API key are required.' };
      }
    }

    try {
      // First check if we can connect to the server
      const systemResponse = await axios.get(`${this.baseUrl}/System/Info`, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });
      
      if (systemResponse.status !== 200) {
        return { success: false, message: `Error connecting to Jellyfin: ${systemResponse.status}` };
      }
      
      // If userId is provided, verify it's valid
      if (this.userId) {
        try {
          const userResponse = await axios.get(`${this.baseUrl}/Users/${this.userId}`, {
            headers: {
              'X-Emby-Token': this.apiKey
            }
          });
          
          return { 
            success: true, 
            message: `Connected to Jellyfin successfully! User: ${userResponse.data.Name}`
          };
        } catch (userError) {
          // User ID may be invalid
          return { 
            success: false, 
            message: 'Connected to Jellyfin, but the User ID is invalid.'
          };
        }
      }
      
      return { success: true, message: 'Connected to Jellyfin successfully!' };
    } catch (error) {
      return { 
        success: false, 
        message: `Error connecting to Jellyfin: ${error.message || 'Unknown error'}`
      };
    }
  }

  async getRecentlyWatchedMovies(limit = 50, daysAgo = null) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured() || !this.userId) {
      await this.loadCredentials();
      
      if (!this.isConfigured() || !this.userId) {
        return [];
      }
    }

    try {
      // Construct the URL for getting watch history for movies
      const url = `${this.baseUrl}/Users/${this.userId}/Items?IncludeItemTypes=Movie&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Filters=IsPlayed&Limit=${limit}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });

      // Filter by date if daysAgo is specified
      const cutoffDate = daysAgo ? new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) : null;
      
      // Map the response to a standardized format
      const watchedMovies = response.data.Items.map(item => {
        return {
          title: item.Name,
          year: item.ProductionYear,
          viewedAt: new Date(item.UserData.LastPlayedDate),
          ratingKey: item.Id
        };
      });

      // Filter by date if needed
      if (cutoffDate) {
        return watchedMovies.filter(movie => movie.viewedAt > cutoffDate);
      }

      return watchedMovies;
    } catch (error) {
      console.error('Error fetching Jellyfin watched movies:', error);
      return [];
    }
  }

  async getRecentlyWatchedShows(limit = 50, daysAgo = null) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured() || !this.userId) {
      await this.loadCredentials();
      
      if (!this.isConfigured() || !this.userId) {
        return [];
      }
    }

    try {
      // Construct the URL for getting watch history for TV shows
      const url = `${this.baseUrl}/Users/${this.userId}/Items?IncludeItemTypes=Series,Episode&Recursive=true&SortBy=DatePlayed&SortOrder=Descending&Filters=IsPlayed&Limit=${limit}`;
      
      const response = await axios.get(url, {
        headers: {
          'X-Emby-Token': this.apiKey
        }
      });

      // Filter by date if daysAgo is specified
      const cutoffDate = daysAgo ? new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)) : null;
      
      // Process and deduplicate shows
      const showMap = new Map();
      
      response.data.Items.forEach(item => {
        // Handle episode items
        if (item.Type === 'Episode' && item.SeriesName) {
          const seriesId = item.SeriesId;
          if (!showMap.has(seriesId)) {
            showMap.set(seriesId, {
              title: item.SeriesName,
              year: item.SeriesProductionYear,
              viewedAt: new Date(item.UserData.LastPlayedDate),
              ratingKey: seriesId
            });
          } else {
            // Update date if this episode was watched more recently
            const existingDate = showMap.get(seriesId).viewedAt;
            const currentDate = new Date(item.UserData.LastPlayedDate);
            if (currentDate > existingDate) {
              showMap.get(seriesId).viewedAt = currentDate;
            }
          }
        } 
        // Handle series items
        else if (item.Type === 'Series') {
          if (!showMap.has(item.Id) || 
              new Date(item.UserData.LastPlayedDate) > showMap.get(item.Id).viewedAt) {
            showMap.set(item.Id, {
              title: item.Name,
              year: item.ProductionYear,
              viewedAt: new Date(item.UserData.LastPlayedDate),
              ratingKey: item.Id
            });
          }
        }
      });

      // Convert to array and sort by date
      let watchedShows = Array.from(showMap.values());
      watchedShows.sort((a, b) => b.viewedAt - a.viewedAt);

      // Limit results
      watchedShows = watchedShows.slice(0, limit);

      // Filter by date if needed
      if (cutoffDate) {
        return watchedShows.filter(show => show.viewedAt > cutoffDate);
      }

      return watchedShows;
    } catch (error) {
      console.error('Error fetching Jellyfin watched shows:', error);
      return [];
    }
  }
}

// Create a singleton instance
const jellyfinService = new JellyfinService();
export default jellyfinService;