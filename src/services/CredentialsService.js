import axios from 'axios';
import apiService from './ApiService';

/**
 * Service for managing API credentials (stored server-side)
 */
class CredentialsService {
  constructor() {
    this.baseUrl = apiService.baseUrl;
    // Used for migration from localStorage
    this.migrated = {};
  }

  /**
   * Store credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service (sonarr, radarr, etc)
   * @param {Object} credentials - Credentials object to store
   * @returns {Promise<boolean>} - Success status
   */
  async storeCredentials(serviceName, credentials) {
    try {
      // Send credentials to server
      const response = await axios.post(`${this.baseUrl}/credentials/${serviceName}`, credentials);
      return response.data.success;
    } catch (error) {
      console.error(`Error storing credentials for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Retrieve credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Credentials object or null if not found
   */
  async getCredentials(serviceName) {
    try {
      const response = await axios.get(`${this.baseUrl}/credentials/${serviceName}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Service not found - try migrating from localStorage
        return this.migrateFromLocalStorage(serviceName);
      }
      console.error(`Error retrieving credentials for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Delete credentials for a specific service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} - Success status
   */
  async deleteCredentials(serviceName) {
    try {
      const response = await axios.delete(`${this.baseUrl}/credentials/${serviceName}`);
      return response.data.success;
    } catch (error) {
      console.error(`Error deleting credentials for ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * Check if credentials exist for a service
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<boolean>} - Whether credentials exist
   */
  async hasCredentials(serviceName) {
    try {
      const response = await axios.get(`${this.baseUrl}/credentials`);
      return !!response.data.services[serviceName];
    } catch (error) {
      console.error('Error checking credentials:', error);
      return false;
    }
  }

  /**
   * Migrate credentials from localStorage to server-side storage
   * Only used once per service to handle transition
   * 
   * @param {string} serviceName - Name of the service
   * @returns {Promise<Object|null>} - Migrated credentials or null
   * @private
   */
  async migrateFromLocalStorage(serviceName) {
    // Don't try to migrate more than once per service
    if (this.migrated[serviceName]) return null;
    
    try {
      let credentials = {};
      
      // Handle different services
      switch(serviceName) {
        case 'sonarr': {
          const sonarrBaseUrl = localStorage.getItem('sonarrBaseUrl');
          const sonarrApiKey = localStorage.getItem('sonarrApiKey');
          if (sonarrBaseUrl && sonarrApiKey) {
            credentials = { baseUrl: sonarrBaseUrl, apiKey: sonarrApiKey };
          }
          break;
        }
          
        case 'radarr': {
          const radarrBaseUrl = localStorage.getItem('radarrBaseUrl');
          const radarrApiKey = localStorage.getItem('radarrApiKey');
          if (radarrBaseUrl && radarrApiKey) {
            credentials = { baseUrl: radarrBaseUrl, apiKey: radarrApiKey };
          }
          break;
        }
          
        case 'plex': {
          const plexUrl = localStorage.getItem('plexUrl');
          const plexToken = localStorage.getItem('plexToken');
          if (plexUrl && plexToken) {
            credentials = { baseUrl: plexUrl, token: plexToken };
          }
          break;
        }
          
        case 'jellyfin': {
          const jellyfinUrl = localStorage.getItem('jellyfinUrl');
          const jellyfinApiKey = localStorage.getItem('jellyfinApiKey');
          const jellyfinUserId = localStorage.getItem('jellyfinUserId');
          if (jellyfinUrl && jellyfinApiKey) {
            credentials = { 
              baseUrl: jellyfinUrl, 
              apiKey: jellyfinApiKey,
              userId: jellyfinUserId
            };
          }
          break;
        }
          
        case 'openai': {
          const openaiApiUrl = localStorage.getItem('openaiApiUrl');
          const openaiApiKey = localStorage.getItem('openaiApiKey');
          const openaiModel = localStorage.getItem('openaiModel');
          if (openaiApiUrl && openaiApiKey) {
            credentials = { 
              apiUrl: openaiApiUrl, 
              apiKey: openaiApiKey,
              model: openaiModel
            };
          }
          break;
        }
      }
      
      // If we found credentials, store them server-side
      if (Object.keys(credentials).length > 0) {
        await this.storeCredentials(serviceName, credentials);
        this.migrated[serviceName] = true;
        return credentials;
      }
      
      return null;
    } catch (error) {
      console.error(`Error migrating ${serviceName} credentials:`, error);
      return null;
    }
  }
}

// Create singleton instance
const credentialsService = new CredentialsService();

export default credentialsService;