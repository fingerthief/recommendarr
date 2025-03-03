import axios from 'axios';
import credentialsService from './CredentialsService';

class PlexService {
  constructor() {
    this.token = '';
    this.baseUrl = '';
    // Load credentials when instantiated
    this.loadCredentials();
  }

  /**
   * Load credentials from server-side storage
   */
  async loadCredentials() {
    const credentials = await credentialsService.getCredentials('plex');
    if (credentials) {
      this.baseUrl = credentials.baseUrl || '';
      this.token = credentials.token || '';
    }
  }

  /**
   * Configure the Plex service with API details
   * @param {string} baseUrl - The base URL of your Plex instance (e.g., http://localhost:32400)
   * @param {string} token - Your Plex token
   */
  async configure(baseUrl, token) {
    // Normalize the URL by removing trailing slashes
    this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    this.token = token;
    
    // Store credentials server-side
    await credentialsService.storeCredentials('plex', {
      baseUrl: this.baseUrl,
      token: this.token
    });
  }

  /**
   * Check if the service is configured with token and URL
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    return this.token && this.baseUrl;
  }

  /**
   * Test the connection to Plex
   * @returns {Promise<boolean>} - Whether the connection is successful
   */
  async testConnection() {
    try {
      // Try to load credentials again in case they weren't ready during init
      if (!this.isConfigured()) {
        await this.loadCredentials();
        
        if (!this.isConfigured()) {
          throw new Error('Plex service is not configured. Please set baseUrl and token.');
        }
      }

      const response = await axios.get(`${this.baseUrl}/identity`, {
        params: { 
          'X-Plex-Token': this.token 
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error connecting to Plex:', error);
      return false;
    }
  }

  /**
   * Get recently watched movies from Plex
   * @param {number} limit - Maximum number of items to return
   * @param {number} [daysAgo=0] - Only include movies watched within this many days (0 for all)
   * @returns {Promise<Array>} - List of recently watched movies
   */
  async getRecentlyWatchedMovies(limit = 100, daysAgo = 0) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Plex service is not configured. Please set baseUrl and token.');
      }
    }

    try {
      // Build params object
      const params = {
        'X-Plex-Token': this.token,
        'type': 1, // Type 1 is movie
        'sort': 'viewedAt:desc',
        'limit': limit
      };
      
      // Add viewedAt filter if daysAgo is specified
      if (daysAgo > 0) {
        // Calculate timestamp for X days ago (in seconds, Plex API uses seconds not milliseconds)
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const daysAgoInSeconds = daysAgo * 24 * 60 * 60;
        const timestampFilter = nowInSeconds - daysAgoInSeconds;
        
        // Add filter to only include items watched after this timestamp
        params['viewedAt>'] = timestampFilter;
      }
      
      // Get recently watched from the history endpoint
      const response = await axios.get(`${this.baseUrl}/status/sessions/history/all`, {
        params: params
      });

      // Log response type and structure for debugging
      console.log('Plex movie response type:', typeof response.data);
      
      // Try to handle both XML and JSON responses
      let movies = [];
      
      if (typeof response.data === 'object') {
        // Handle JSON response
        console.log('Processing Plex movie response as JSON');
        if (response.data.MediaContainer && response.data.MediaContainer.Metadata) {
          const metadata = response.data.MediaContainer.Metadata;
          console.log(`Found ${metadata.length} movies in Plex JSON response`);
          
          movies = metadata.map(item => {
            // For movies, we need to make sure we're not getting TV episodes
            // Check if this is actually a movie by checking for the absence of grandparentTitle
            // and parentIndex (which would indicate it's part of a TV series)
            const isMovie = !item.grandparentTitle && !item.parentIndex;
            
            if (isMovie) {
              return {
                title: item.title,
                year: item.year,
                viewedAt: item.lastViewedAt || item.viewedAt,
                ratingKey: item.ratingKey
              };
            } else {
              // If this is a TV episode, we'll filter it out later
              return {
                title: null // This will be filtered out
              };
            }
          });
        }
      } else if (typeof response.data === 'string') {
        // Handle XML response
        console.log('Processing Plex movie response as XML');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");
        
        // Look for MediaContainer first
        const mediaContainer = xmlDoc.querySelector('MediaContainer');
        if (mediaContainer) {
          // Try to find Metadata elements
          const metadataNodes = mediaContainer.querySelectorAll('Metadata');
          if (metadataNodes.length > 0) {
            console.log(`Found ${metadataNodes.length} movie Metadata nodes in XML`);
            movies = Array.from(metadataNodes).map(node => {
              // For movies, we need to make sure we're not getting TV episodes
              // Check if this is actually a movie by checking for the absence of grandparentTitle
              const hasGrandparentTitle = node.getAttribute('grandparentTitle');
              const hasParentIndex = node.getAttribute('parentIndex');
              const isMovie = !hasGrandparentTitle && !hasParentIndex;
              
              if (isMovie) {
                return {
                  title: node.getAttribute('title'),
                  year: node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('ratingKey')
                };
              } else {
                // If this is a TV episode, we'll filter it out later
                return {
                  title: null
                };
              }
            });
          } else {
            // Fall back to Video nodes
            const videoNodes = xmlDoc.querySelectorAll('Video');
            console.log(`Found ${videoNodes.length} movie Video nodes in XML`);
            movies = Array.from(videoNodes).map(node => {
              // For movies, check if this is actually a movie by looking for absence of TV show attributes
              const hasGrandparentTitle = node.getAttribute('grandparentTitle');
              const hasParentIndex = node.getAttribute('parentIndex');
              const isMovie = !hasGrandparentTitle && !hasParentIndex;
              
              if (isMovie) {
                return {
                  title: node.getAttribute('title'),
                  year: node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('ratingKey')
                };
              } else {
                // If this is a TV episode, return null title to filter it out
                return {
                  title: null
                };
              }
            });
          }
        }
      }
      
      // Filter out items without titles and remove duplicates
      const validMovies = movies.filter(movie => movie.title);
      const uniqueMovies = validMovies.filter((movie, index, self) => 
        index === self.findIndex((m) => m.title === movie.title)
      );
      
      console.log(`Returning ${uniqueMovies.length} unique recently watched movies`);
      return uniqueMovies;
    } catch (error) {
      console.error('Error fetching recently watched movies from Plex:', error);
      throw error;
    }
  }

  /**
   * Get recently watched TV shows from Plex
   * @param {number} limit - Maximum number of items to return
   * @param {number} [daysAgo=0] - Only include shows watched within this many days (0 for all)
   * @returns {Promise<Array>} - List of recently watched TV shows
   */
  async getRecentlyWatchedShows(limit = 100, daysAgo = 0) {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('Plex service is not configured. Please set baseUrl and token.');
      }
    }

    try {
      // Build params object
      const params = {
        'X-Plex-Token': this.token,
        'type': 4, // Type 4 is TV episode
        'sort': 'viewedAt:desc',
        'limit': limit
      };
      
      // Add viewedAt filter if daysAgo is specified
      if (daysAgo > 0) {
        // Calculate timestamp for X days ago (in seconds, Plex API uses seconds not milliseconds)
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const daysAgoInSeconds = daysAgo * 24 * 60 * 60;
        const timestampFilter = nowInSeconds - daysAgoInSeconds;
        
        // Add filter to only include items watched after this timestamp
        params['viewedAt>'] = timestampFilter;
      }
      
      // Get recently watched from the history endpoint
      const response = await axios.get(`${this.baseUrl}/status/sessions/history/all`, {
        params: params
      });

      // Log response type and structure for debugging
      console.log('Plex TV response type:', typeof response.data);
      
      // Store unique shows with a Map
      const showMap = new Map();
      
      if (typeof response.data === 'object') {
        // Handle JSON response
        console.log('Processing Plex TV response as JSON');
        if (response.data.MediaContainer && response.data.MediaContainer.Metadata) {
          const metadata = response.data.MediaContainer.Metadata;
          console.log(`Found ${metadata.length} episodes in Plex JSON response`);
          
          // Process each episode and extract show information
          metadata.forEach(item => {
            // Always prioritize grandparentTitle for TV shows, since that's the series name
            const showTitle = item.grandparentTitle;
            
            // Only proceed if we have a valid show title
            if (showTitle && !showMap.has(showTitle)) {
              showMap.set(showTitle, {
                title: showTitle,
                year: item.parentYear || item.year,
                viewedAt: item.lastViewedAt || item.viewedAt,
                ratingKey: item.grandparentRatingKey || item.ratingKey
              });
            }
          });
        }
      } else if (typeof response.data === 'string') {
        // Handle XML response
        console.log('Processing Plex TV response as XML');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "text/xml");
        
        // Look for MediaContainer first
        const mediaContainer = xmlDoc.querySelector('MediaContainer');
        if (mediaContainer) {
          // Try to find Metadata elements
          const metadataNodes = mediaContainer.querySelectorAll('Metadata');
          if (metadataNodes.length > 0) {
            console.log(`Found ${metadataNodes.length} episode Metadata nodes in XML`);
            
            // Process each episode metadata node
            Array.from(metadataNodes).forEach(node => {
              // Always prioritize grandparentTitle for TV shows
              const showTitle = node.getAttribute('grandparentTitle');
              
              // Only proceed if we have a valid show title
              if (showTitle && !showMap.has(showTitle)) {
                showMap.set(showTitle, {
                  title: showTitle,
                  year: node.getAttribute('parentYear') || node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('grandparentRatingKey') || node.getAttribute('ratingKey')
                });
              }
            });
          } else {
            // Fall back to Video nodes
            const videoNodes = xmlDoc.querySelectorAll('Video');
            console.log(`Found ${videoNodes.length} episode Video nodes in XML`);
            
            // Process each video node
            Array.from(videoNodes).forEach(node => {
              const showTitle = node.getAttribute('grandparentTitle');
              if (showTitle && !showMap.has(showTitle)) {
                showMap.set(showTitle, {
                  title: showTitle,
                  year: node.getAttribute('parentYear') || node.getAttribute('year'),
                  viewedAt: node.getAttribute('lastViewedAt') || node.getAttribute('viewedAt'),
                  ratingKey: node.getAttribute('grandparentRatingKey')
                });
              }
            });
          }
        }
      }
      
      // Convert the Map to an array
      const shows = Array.from(showMap.values());
      console.log(`Returning ${shows.length} unique recently watched TV shows`);
      return shows;
    } catch (error) {
      console.error('Error fetching recently watched shows from Plex:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const plexService = new PlexService();

export default plexService;