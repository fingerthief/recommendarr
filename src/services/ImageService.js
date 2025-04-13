import sonarrService from './SonarrService';
import radarrService from './RadarrService';
import tmdbService from './TMDBService';

class ImageService {
  constructor() {
    // Cache for posters to avoid duplicate requests
    this.posterCache = new Map();
    // Cache for fallback images to avoid regenerating SVGs
    this.fallbackCache = new Map();
  }

  /**
   * Get a poster URL for a TV show by title
   * @param {string} title - The TV show title
   * @param {boolean} [skipCache=false] - Whether to skip the cache
   * @param {boolean} [useProxy=false] - Whether to use the image proxy
   * @returns {Promise<string|null>} - The poster URL or null if not found
   */
  async getPosterForShow(title, skipCache = false, useProxy = false) {
    // Ensure title is a string
    if (title === null || title === undefined) {
      console.warn('getPosterForShow called with null/undefined title');
      return null;
    }
    
    // Convert to string if it's not already
    if (typeof title !== 'string') {
      title = String(title);
    }
    
    // Clean the title for consistent cache keys
    const cleanTitle = title.replace(/[:.!?]+$/, '').trim();
    const cacheKey = useProxy ? `proxy_${cleanTitle}` : cleanTitle;
    
    // Check cache first unless skipCache is true
    if (!skipCache && this.posterCache.has(cacheKey)) {
      return this.posterCache.get(cacheKey);
    }
    
    // If skipCache is true and we're retrying, clear the cache for this title
    if (skipCache && this.posterCache.has(cacheKey)) {
      this.posterCache.delete(cacheKey);
    }
    
    try {
      let showInfo = null;
      
      // First check if TMDB is already configured before trying to load or use it
      if (tmdbService.isConfiguredSync()) {
        try {
          showInfo = await tmdbService.findSeriesByTitle(title);
          
          // Try simplified title only if TMDB failed but is configured
          if ((!showInfo || !showInfo.images || !showInfo.images.length) && title.includes(':')) {
            const simplifiedTitle = title.split(':')[0].trim();
            showInfo = await tmdbService.findSeriesByTitle(simplifiedTitle);
          }
          
          // Try alphanumeric only if TMDB failed but is configured
          if (!showInfo || !showInfo.images || !showInfo.images.length) {
            const alphanumericTitle = title.replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, ' ');
            if (alphanumericTitle !== title) {
              showInfo = await tmdbService.findSeriesByTitle(alphanumericTitle);
            }
          }
        } catch (tmdbError) {
          console.error(`TMDB search failed for "${title}":`, tmdbError);
          showInfo = null;
        }
      }
      
      // Only try Sonarr if TMDB failed or isn't configured
      if ((!showInfo || !showInfo.images || !showInfo.images.length) && sonarrService.isConfigured()) {
        // Use Sonarr to find the show info
        showInfo = await sonarrService.findSeriesByTitle(title);
        
        // If first attempt fails, try with a simplified title (remove everything after ":")
        if (!showInfo && title.includes(':')) {
          const simplifiedTitle = title.split(':')[0].trim();
          showInfo = await sonarrService.findSeriesByTitle(simplifiedTitle);
        }
        
        // If still no results, try without special characters
        if (!showInfo) {
          const alphanumericTitle = title.replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, ' ');
          if (alphanumericTitle !== title) {
            showInfo = await sonarrService.findSeriesByTitle(alphanumericTitle);
          }
        }
      }
      
      // Return null if we couldn't find anything
      if (!showInfo || !showInfo.images || !showInfo.images.length) {
        return null;
      }
      
      // Find the poster image
      const poster = showInfo.images.find(img => img.coverType === 'poster');
      
      if (!poster) {
        return null;
      }
      
      // Get original URL (either from TMDB or Sonarr)
      const originalUrl = poster.remoteUrl;
      
      // Return either direct URL or proxied URL based on useProxy flag
      if (useProxy) {
        // Create a proxied URL to avoid CORS and network issues
        const apiBaseUrl = process.env.VUE_APP_API_URL || window.location.origin + '/api';
        const proxiedUrl = `${apiBaseUrl}/image-proxy?url=${encodeURIComponent(originalUrl)}`;
        
        // Store in cache for future requests
        this.posterCache.set(cacheKey, proxiedUrl);
        return proxiedUrl;
      } else {
        // Use direct URL for recommendations page
        this.posterCache.set(cacheKey, originalUrl);
        return originalUrl;
      }
    } catch (error) {
      console.error(`Error fetching poster for "${title}":`, error);
      return null;
    }
  }
  
  /**
   * Get a poster URL for a movie by title
   * @param {string} title - The movie title
   * @param {boolean} [skipCache=false] - Whether to skip the cache
   * @param {boolean} [useProxy=false] - Whether to use the image proxy
   * @returns {Promise<string|null>} - The poster URL or null if not found
   */
  async getPosterForMovie(title, skipCache = false, useProxy = false) {
    // Ensure title is a string
    if (title === null || title === undefined) {
      console.warn('getPosterForMovie called with null/undefined title');
      return null;
    }
    
    // Convert to string if it's not already
    if (typeof title !== 'string') {
      title = String(title);
    }
    
    // Clean the title for consistent cache keys
    const cleanTitle = title.replace(/[:.!?]+$/, '').trim();
    const cacheKey = useProxy ? `proxy_movie_${cleanTitle}` : `movie_${cleanTitle}`;
    
    // Check cache first unless skipCache is true
    if (!skipCache && this.posterCache.has(cacheKey)) {
      return this.posterCache.get(cacheKey);
    }
    
    // If skipCache is true and we're retrying, clear the cache for this title
    if (skipCache && this.posterCache.has(cacheKey)) {
      this.posterCache.delete(cacheKey);
    }
    
    try {
      let movieInfo = null;
      
      // First check if TMDB is already configured before trying to load or use it
      if (tmdbService.isConfiguredSync()) {
        try {
          movieInfo = await tmdbService.findMovieByTitle(title);
          
          // Try simplified title only if TMDB failed but is configured
          if ((!movieInfo || !movieInfo.images || !movieInfo.images.length) && title.includes(':')) {
            const simplifiedTitle = title.split(':')[0].trim();
            movieInfo = await tmdbService.findMovieByTitle(simplifiedTitle);
          }
          
          // Try alphanumeric only if TMDB failed but is configured
          if (!movieInfo || !movieInfo.images || !movieInfo.images.length) {
            const alphanumericTitle = title.replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, ' ');
            if (alphanumericTitle !== title) {
              movieInfo = await tmdbService.findMovieByTitle(alphanumericTitle);
            }
          }
        } catch (tmdbError) {
          console.error(`TMDB search failed for "${title}":`, tmdbError);
          movieInfo = null;
        }
      }
      
      // Only try Radarr if TMDB failed or isn't configured
      if ((!movieInfo || !movieInfo.images || !movieInfo.images.length) && radarrService.isConfigured()) {
        // Use Radarr to find the movie info
        movieInfo = await radarrService.findMovieByTitle(title);
        
        // If first attempt fails, try with a simplified title (remove everything after ":")
        if (!movieInfo && title.includes(':')) {
          const simplifiedTitle = title.split(':')[0].trim();
          movieInfo = await radarrService.findMovieByTitle(simplifiedTitle);
        }
        
        // If still no results, try without special characters
        if (!movieInfo) {
          const alphanumericTitle = title.replace(/[^\w\s]/g, ' ').trim().replace(/\s+/g, ' ');
          if (alphanumericTitle !== title) {
            movieInfo = await radarrService.findMovieByTitle(alphanumericTitle);
          }
        }
      }
      
      // Return null if we couldn't find anything
      if (!movieInfo || !movieInfo.images || !movieInfo.images.length) {
        return null;
      }
      
      // Find the poster image
      const poster = movieInfo.images.find(img => img.coverType === 'poster');
      
      if (!poster) {
        return null;
      }
      
      // Get original URL (either from TMDB or Radarr)
      const originalUrl = poster.remoteUrl;
      
      // Return either direct URL or proxied URL based on useProxy flag
      if (useProxy) {
        // Create a proxied URL to avoid CORS and network issues
        const apiBaseUrl = process.env.VUE_APP_API_URL || window.location.origin + '/api';
        const proxiedUrl = `${apiBaseUrl}/image-proxy?url=${encodeURIComponent(originalUrl)}`;
        
        // Store in cache for future requests
        this.posterCache.set(cacheKey, proxiedUrl);
        return proxiedUrl;
      } else {
        // Use direct URL for recommendations page
        this.posterCache.set(cacheKey, originalUrl);
        return originalUrl;
      }
    } catch (error) {
      console.error(`Error fetching movie poster for "${title}":`, error);
      return null;
    }
  }
  
  /**
   * Get a fallback image URL for when no poster is available
   * @param {string} title - The TV show title (used for generating a color)
   * @returns {string} - A fallback image URL or data URL
   */
  getFallbackImageUrl(title) {
    // Ensure title is a string
    if (title === null || title === undefined) {
      title = 'Unknown';
    }
    
    // Convert to string if it's not already
    if (typeof title !== 'string') {
      title = String(title);
    }
    
    // Use clean title for consistent cache keys
    const cleanTitle = title.replace(/[:.!?]+$/, '').trim();
    
    // Check cache first
    if (this.fallbackCache.has(cleanTitle)) {
      return this.fallbackCache.get(cleanTitle);
    }
    
    // Generate a consistent color based on the title
    const hash = this.simpleHash(cleanTitle);
    const hue = hash % 360;
    const background = `hsl(${hue}, 70%, 40%)`;
    
    // Get initials (up to 2 characters)
    const initials = this.getInitials(cleanTitle);
    
    // Create a simple SVG with the initials
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
        <rect width="300" height="450" fill="${background}" />
        <text x="150" y="225" fill="white" font-family="Arial" font-size="120" text-anchor="middle" dominant-baseline="middle">
          ${initials}
        </text>
      </svg>
    `;
    
    // Convert SVG to a data URL
    const dataUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
    
    // Cache the result
    this.fallbackCache.set(cleanTitle, dataUrl);
    
    return dataUrl;
  }
  
  /**
   * Simple hash function for strings
   * @param {string} str - The string to hash
   * @returns {number} - A numeric hash
   */
  simpleHash(str) {
    // Ensure input is a string
    if (typeof str !== 'string') {
      str = String(str || '');
    }
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Get initials from a title (up to 2 characters)
   * @param {string} title - The title to get initials from
   * @returns {string} - The initials
   */
  getInitials(title) {
    // Handle null/undefined cases
    if (title === null || title === undefined) {
      return '?';
    }
    
    // Ensure input is a string
    if (typeof title !== 'string') {
      title = String(title);
    }
    
    if (!title || title.trim() === '') return '?';
    
    return title
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .slice(0, 2)
      .join('');
  }
  
  /**
   * Check if TMDB is available for poster retrieval
   * @returns {boolean} - Whether TMDB is configured
   */
  isTMDBAvailable() {
    return tmdbService.isConfigured();
  }
}

// Create a singleton instance
const imageService = new ImageService();

export default imageService;