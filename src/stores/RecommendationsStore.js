import { reactive } from 'vue';
import apiService from '../services/ApiService';
import openAIService from '../services/OpenAIService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import databaseStorageUtils from '../utils/DatabaseStorageUtils';
import authService from '../services/AuthService';
import imageService from '../services/ImageService';


// Create a reactive state object to hold all recommendation-related data
const state = reactive({
  // Core recommendation data
  recommendations: [],
  previousShowRecommendations: [],
  previousMovieRecommendations: [],
  likedRecommendations: [],
  dislikedRecommendations: [],
  
  // UI state
  loading: false,
  error: null,
  requestingSeries: null,
  requestStatus: {},
  
  // Poster management
  posters: new Map(), // Map of title -> poster URL
  loadingPosters: new Map(), // Map of title -> loading state
  expandedCards: new Set(), // Set of expanded card indices
  tmdbAvailable: false, // Whether TMDB is available
  
  // Configuration
  isMovieMode: false,
  columnsCount: 2,
  numRecommendations: 5,
  
  // TMDB modal state
  showTMDBModal: false,
  selectedMediaId: null,
  selectedMediaTitle: '',
  
  // Recommendation settings
  selectedGenres: [],
  customVibe: '',
  promptStyle: 'vibe',
  selectedLanguage: '',
  
  // User info
  username: '',
  
  // Content libraries
  series: [],
  movies: [],
  
  // Watch history
  recentlyWatchedShows: [],
  recentlyWatchedMovies: [],
  jellyfinRecentlyWatchedShows: [],
  jellyfinRecentlyWatchedMovies: [],
  tautulliRecentlyWatchedShows: [],
  tautulliRecentlyWatchedMovies: [],
  traktRecentlyWatchedShows: [],
  traktRecentlyWatchedMovies: [],
  
  // Service configuration status
  sonarrConfigured: false,
  radarrConfigured: false,
  plexConfigured: false,
  jellyfinConfigured: false,
  tautulliConfigured: false,
  traktConfigured: false,
  
  // History settings
  plexUseHistory: true,
  plexHistoryMode: 'all',
  plexCustomHistoryDays: 30,
  plexOnlyMode: false,
  
  jellyfinUseHistory: true,
  jellyfinHistoryMode: 'all',
  jellyfinCustomHistoryDays: 30,
  jellyfinOnlyMode: false,
  
  tautulliUseHistory: true,
  tautulliHistoryMode: 'all',
  tautulliCustomHistoryDays: 30,
  tautulliOnlyMode: false,
  
  traktUseHistory: true,
  traktHistoryMode: 'all',
  traktCustomHistoryDays: 30,
  traktOnlyMode: false,
  
  // Library settings
  useSampledLibrary: false,
  sampleSize: 20,
  useStructuredOutput: false,
  useCustomPromptOnly: false,
  
  // Recommendation history
  recommendationsRequested: false,
  maxStoredRecommendations: 500
});

// Create the store object with methods to interact with the state
const RecommendationsStore = {
  state,
  
  // Initialize the store with data from props or storage
  initialize(props = {}) {
    // Set initial values from props if provided
    if (props.initialMovieMode !== undefined) {
      state.isMovieMode = props.initialMovieMode;
    }
    
    if (props.series) {
      state.series = props.series;
    }
    
    if (props.movies) {
      state.movies = props.movies;
    }
    
    if (props.sonarrConfigured !== undefined) {
      state.sonarrConfigured = props.sonarrConfigured;
    }
    
    if (props.radarrConfigured !== undefined) {
      state.radarrConfigured = props.radarrConfigured;
    }
    
    if (props.plexConfigured !== undefined) {
      state.plexConfigured = props.plexConfigured;
    }
    
    if (props.jellyfinConfigured !== undefined) {
      state.jellyfinConfigured = props.jellyfinConfigured;
    }
    
    if (props.tautulliConfigured !== undefined) {
      state.tautulliConfigured = props.tautulliConfigured;
    }
    
    if (props.traktConfigured !== undefined) {
      state.traktConfigured = props.traktConfigured;
    }
    
    // Set watch history from props
    if (props.recentlyWatchedShows) {
      state.recentlyWatchedShows = props.recentlyWatchedShows;
    }
    
    if (props.recentlyWatchedMovies) {
      state.recentlyWatchedMovies = props.recentlyWatchedMovies;
    }
    
    if (props.jellyfinRecentlyWatchedShows) {
      state.jellyfinRecentlyWatchedShows = props.jellyfinRecentlyWatchedShows;
    }
    
    if (props.jellyfinRecentlyWatchedMovies) {
      state.jellyfinRecentlyWatchedMovies = props.jellyfinRecentlyWatchedMovies;
    }
    
    if (props.tautulliRecentlyWatchedShows) {
      state.tautulliRecentlyWatchedShows = props.tautulliRecentlyWatchedShows;
    }
    
    if (props.tautulliRecentlyWatchedMovies) {
      state.tautulliRecentlyWatchedMovies = props.tautulliRecentlyWatchedMovies;
    }
    
    if (props.traktRecentlyWatchedShows) {
      state.traktRecentlyWatchedShows = props.traktRecentlyWatchedShows;
    }
    
    if (props.traktRecentlyWatchedMovies) {
      state.traktRecentlyWatchedMovies = props.traktRecentlyWatchedMovies;
    }
    
    // Load user info
    const userInfo = authService.getUser();
    if (userInfo && userInfo.username) {
      state.username = userInfo.username;
    }
    
    // Load saved settings
    this.loadSavedSettings();
    
    // Load recommendation history
    this.loadRecommendationHistory();
    
    // Load liked/disliked preferences
    this.loadLikedDislikedPreferences();
  },
  
  // Load saved settings from server or local storage
  async loadSavedSettings() {
    try {
      // Fetch all settings from the server
      const settings = await apiService.getSettings();
      
      if (!settings) {
        console.log('No settings found on server');
        return;
      }
      
      console.log('Loaded settings from server:', settings);
      
      // Load number of recommendations setting
      if (settings.numRecommendations !== undefined) {
        const numRecs = parseInt(settings.numRecommendations, 10);
        if (!isNaN(numRecs) && numRecs >= 1 && numRecs <= 50) {
          state.numRecommendations = numRecs;
        }
      }
      
      // Load columns count setting
      if (settings.columnsCount !== undefined) {
        const columns = parseInt(settings.columnsCount, 10);
        if (!isNaN(columns) && columns >= 1 && columns <= 4) {
          state.columnsCount = columns;
        }
      }
      
      // Temperature setting
      if (settings.aiTemperature !== undefined) {
        const temp = parseFloat(settings.aiTemperature);
        if (!isNaN(temp) && temp >= 0 && temp <= 1) {
          openAIService.temperature = temp;
        }
      }
      
      // Library sampling settings
      if (settings.useSampledLibrary !== undefined) {
        state.useSampledLibrary = settings.useSampledLibrary === true || settings.useSampledLibrary === 'true';
        openAIService.useSampledLibrary = state.useSampledLibrary;
      }
      
      if (settings.librarySampleSize !== undefined) {
        const sampleSize = parseInt(settings.librarySampleSize, 10);
        if (!isNaN(sampleSize) && sampleSize >= 5 && sampleSize <= 1000) {
          state.sampleSize = sampleSize;
          openAIService.sampleSize = state.sampleSize;
        }
      }
      
      // Structured output setting
      if (settings.useStructuredOutput !== undefined) {
        state.useStructuredOutput = settings.useStructuredOutput === true || settings.useStructuredOutput === 'true';
        openAIService.useStructuredOutput = state.useStructuredOutput;
      }
      
      // Load custom prompt only setting
      if (Object.prototype.hasOwnProperty.call(settings, 'useCustomPromptOnly')) {
        state.useCustomPromptOnly = settings.useCustomPromptOnly === true || settings.useCustomPromptOnly === 'true';
        if (typeof openAIService.setUseCustomPromptOnly === 'function') {
          openAIService.setUseCustomPromptOnly(state.useCustomPromptOnly);
        } else {
          openAIService.useCustomPromptOnly = state.useCustomPromptOnly;
        }
      }
      
      // Load prompt style setting
      if (settings.promptStyle) {
        state.promptStyle = settings.promptStyle;
        openAIService.setPromptStyle(state.promptStyle);
      }
      
      // Plex settings
      if (settings.plexHistoryMode) {
        state.plexHistoryMode = settings.plexHistoryMode;
      }
      
      if (settings.plexOnlyMode !== undefined) {
        state.plexOnlyMode = settings.plexOnlyMode;
      }
      
      if (settings.plexUseHistory !== undefined) {
        state.plexUseHistory = settings.plexUseHistory;
      }
      
      if (settings.plexCustomHistoryDays) {
        state.plexCustomHistoryDays = parseInt(settings.plexCustomHistoryDays, 10);
      }
      
      // Jellyfin settings
      if (settings.jellyfinHistoryMode) {
        state.jellyfinHistoryMode = settings.jellyfinHistoryMode;
      }
      
      if (settings.jellyfinOnlyMode !== undefined) {
        state.jellyfinOnlyMode = settings.jellyfinOnlyMode;
      }
      
      if (settings.jellyfinUseHistory !== undefined) {
        state.jellyfinUseHistory = settings.jellyfinUseHistory;
      }
      
      if (settings.jellyfinCustomHistoryDays) {
        state.jellyfinCustomHistoryDays = parseInt(settings.jellyfinCustomHistoryDays, 10);
      }
      
      // Tautulli settings
      if (settings.tautulliHistoryMode) {
        state.tautulliHistoryMode = settings.tautulliHistoryMode;
      }
      
      if (settings.tautulliOnlyMode !== undefined) {
        state.tautulliOnlyMode = settings.tautulliOnlyMode;
      }
      
      if (settings.tautulliUseHistory !== undefined) {
        state.tautulliUseHistory = settings.tautulliUseHistory;
      }
      
      if (settings.tautulliCustomHistoryDays) {
        state.tautulliCustomHistoryDays = parseInt(settings.tautulliCustomHistoryDays, 10);
      }
      
      // Trakt settings
      if (settings.traktHistoryMode) {
        state.traktHistoryMode = settings.traktHistoryMode;
      }
      
      if (settings.traktOnlyMode !== undefined) {
        state.traktOnlyMode = settings.traktOnlyMode;
      }
      
      if (settings.traktUseHistory !== undefined) {
        state.traktUseHistory = settings.traktUseHistory === true || settings.traktUseHistory === 'true';
      }
      
      if (settings.traktCustomHistoryDays) {
        state.traktCustomHistoryDays = parseInt(settings.traktCustomHistoryDays, 10);
      }
      
      // Genre preferences
      if (settings.tvGenrePreferences) {
        state.selectedGenres = settings.tvGenrePreferences;
      }
      
      // Custom vibe
      if (settings.tvCustomVibe) {
        state.customVibe = settings.tvCustomVibe;
      }
      
      // Language preference
      if (settings.tvLanguagePreference) {
        state.selectedLanguage = settings.tvLanguagePreference;
      }
      
      // Content type preference
      if (settings.contentTypePreference) {
        state.isMovieMode = settings.contentTypePreference === 'movies';
      }
      
    } catch (error) {
      console.error('Error loading settings from server:', error);
      
      // Fall back to local storage
      this.loadSettingsFromLocalStorage();
    }
  },
  
  // Load settings from local storage as fallback
  loadSettingsFromLocalStorage() {
    // Load number of recommendations
    const savedCount = databaseStorageUtils.get('numRecommendations');
    if (savedCount !== null) {
      const numRecs = parseInt(savedCount, 10);
      if (!isNaN(numRecs) && numRecs >= 1 && numRecs <= 50) {
        state.numRecommendations = numRecs;
      }
    }
    
    // Load columns count
    const savedColumnsCount = databaseStorageUtils.get('columnsCount');
    if (savedColumnsCount !== null) {
      const columns = parseInt(savedColumnsCount, 10);
      if (!isNaN(columns) && columns >= 1 && columns <= 4) {
        state.columnsCount = columns;
      }
    }
    
    // Load content type preference
    const savedContentType = databaseStorageUtils.get('isMovieMode');
    if (savedContentType !== null) {
      state.isMovieMode = savedContentType === 'true' || savedContentType === true;
    }
    
    // Load genre preferences
    const savedGenres = databaseStorageUtils.getJSON('tvGenrePreferences');
    if (savedGenres) {
      state.selectedGenres = savedGenres;
    }
    
    // Load custom vibe
    const savedVibe = databaseStorageUtils.get('tvCustomVibe');
    if (savedVibe) {
      state.customVibe = savedVibe;
    }
    
    // Load language preference
    const savedLanguage = databaseStorageUtils.get('tvLanguagePreference');
    if (savedLanguage) {
      state.selectedLanguage = savedLanguage;
    }
    
    // Load library sampling settings
    const savedUseSampledLibrary = databaseStorageUtils.get('useSampledLibrary');
    if (savedUseSampledLibrary !== null) {
      state.useSampledLibrary = savedUseSampledLibrary === 'true' || savedUseSampledLibrary === true;
      openAIService.useSampledLibrary = state.useSampledLibrary;
    }
    
    const savedSampleSize = databaseStorageUtils.get('librarySampleSize');
    if (savedSampleSize !== null) {
      const sampleSize = parseInt(savedSampleSize, 10);
      if (!isNaN(sampleSize) && sampleSize >= 5 && sampleSize <= 1000) {
        state.sampleSize = sampleSize;
        openAIService.sampleSize = state.sampleSize;
      }
    }
    
    // Load structured output setting
    const savedStructuredOutput = databaseStorageUtils.get('useStructuredOutput');
    if (savedStructuredOutput !== null) {
      state.useStructuredOutput = savedStructuredOutput === 'true' || savedStructuredOutput === true;
      openAIService.useStructuredOutput = state.useStructuredOutput;
    }
    
    // Load prompt style
    const savedPromptStyle = databaseStorageUtils.get('promptStyle');
    if (savedPromptStyle) {
      state.promptStyle = savedPromptStyle;
      openAIService.setPromptStyle(state.promptStyle);
    }
    
    // Load custom prompt only setting
    const savedCustomPromptOnly = databaseStorageUtils.get('useCustomPromptOnly');
    if (savedCustomPromptOnly !== null) {
      state.useCustomPromptOnly = savedCustomPromptOnly === 'true' || savedCustomPromptOnly === true;
      if (typeof openAIService.setUseCustomPromptOnly === 'function') {
        openAIService.setUseCustomPromptOnly(state.useCustomPromptOnly);
      } else {
        openAIService.useCustomPromptOnly = state.useCustomPromptOnly;
      }
    }
    
    // Load Plex settings
    const savedPlexHistoryMode = databaseStorageUtils.get('plexHistoryMode');
    if (savedPlexHistoryMode) {
      state.plexHistoryMode = savedPlexHistoryMode;
    }
    
    const savedPlexOnlyMode = databaseStorageUtils.get('plexOnlyMode');
    if (savedPlexOnlyMode !== null) {
      state.plexOnlyMode = savedPlexOnlyMode === 'true' || savedPlexOnlyMode === true;
    }
    
    const savedPlexUseHistory = databaseStorageUtils.get('plexUseHistory');
    if (savedPlexUseHistory !== null) {
      state.plexUseHistory = savedPlexUseHistory === 'true' || savedPlexUseHistory === true;
    }
    
    const savedPlexCustomHistoryDays = databaseStorageUtils.get('plexCustomHistoryDays');
    if (savedPlexCustomHistoryDays !== null) {
      state.plexCustomHistoryDays = parseInt(savedPlexCustomHistoryDays, 10);
    }
    
    // Load Jellyfin settings
    const savedJellyfinHistoryMode = databaseStorageUtils.get('jellyfinHistoryMode');
    if (savedJellyfinHistoryMode) {
      state.jellyfinHistoryMode = savedJellyfinHistoryMode;
    }
    
    const savedJellyfinOnlyMode = databaseStorageUtils.get('jellyfinOnlyMode');
    if (savedJellyfinOnlyMode !== null) {
      state.jellyfinOnlyMode = savedJellyfinOnlyMode === 'true' || savedJellyfinOnlyMode === true;
    }
    
    const savedJellyfinUseHistory = databaseStorageUtils.get('jellyfinUseHistory');
    if (savedJellyfinUseHistory !== null) {
      state.jellyfinUseHistory = savedJellyfinUseHistory === 'true' || savedJellyfinUseHistory === true;
    }
    
    const savedJellyfinCustomHistoryDays = databaseStorageUtils.get('jellyfinCustomHistoryDays');
    if (savedJellyfinCustomHistoryDays !== null) {
      state.jellyfinCustomHistoryDays = parseInt(savedJellyfinCustomHistoryDays, 10);
    }
    
    // Load Tautulli settings
    const savedTautulliHistoryMode = databaseStorageUtils.get('tautulliHistoryMode');
    if (savedTautulliHistoryMode) {
      state.tautulliHistoryMode = savedTautulliHistoryMode;
    }
    
    const savedTautulliOnlyMode = databaseStorageUtils.get('tautulliOnlyMode');
    if (savedTautulliOnlyMode !== null) {
      state.tautulliOnlyMode = savedTautulliOnlyMode === 'true' || savedTautulliOnlyMode === true;
    }
    
    const savedTautulliUseHistory = databaseStorageUtils.get('tautulliUseHistory');
    if (savedTautulliUseHistory !== null) {
      state.tautulliUseHistory = savedTautulliUseHistory === 'true' || savedTautulliUseHistory === true;
    }
    
    const savedTautulliCustomHistoryDays = databaseStorageUtils.get('tautulliCustomHistoryDays');
    if (savedTautulliCustomHistoryDays !== null) {
      state.tautulliCustomHistoryDays = parseInt(savedTautulliCustomHistoryDays, 10);
    }
    
    // Load Trakt settings
    const savedTraktHistoryMode = databaseStorageUtils.get('traktHistoryMode');
    if (savedTraktHistoryMode) {
      state.traktHistoryMode = savedTraktHistoryMode;
    }
    
    const savedTraktOnlyMode = databaseStorageUtils.get('traktOnlyMode');
    if (savedTraktOnlyMode !== null) {
      state.traktOnlyMode = savedTraktOnlyMode === 'true' || savedTraktOnlyMode === true;
    }
    
    const savedTraktUseHistory = databaseStorageUtils.get('traktUseHistory');
    if (savedTraktUseHistory !== null) {
      state.traktUseHistory = savedTraktUseHistory === 'true' || savedTraktUseHistory === true;
    }
    
    const savedTraktCustomHistoryDays = databaseStorageUtils.get('traktCustomHistoryDays');
    if (savedTraktCustomHistoryDays !== null) {
      state.traktCustomHistoryDays = parseInt(savedTraktCustomHistoryDays, 10);
    }
  },
  
  // Load recommendation history from server or local storage
  async loadRecommendationHistory() {
    try {
      // Load TV show recommendations
      const tvRecsResponse = await apiService.getRecommendations('tv', state.username) || [];
      if (Array.isArray(tvRecsResponse)) {
        if (tvRecsResponse.length > 0 && typeof tvRecsResponse[0] === 'string') {
          // Simple array of titles
          state.previousShowRecommendations = tvRecsResponse;
        } else if (tvRecsResponse.length > 0) {
          // Full recommendation objects
          const extractedTitles = tvRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
          
          state.previousShowRecommendations = [...new Set(extractedTitles)];
        } else {
          // Empty array
          state.previousShowRecommendations = [];
        }
      }
      
      // Load movie recommendations
      const movieRecsResponse = await apiService.getRecommendations('movie', state.username) || [];
      if (Array.isArray(movieRecsResponse)) {
        if (movieRecsResponse.length > 0 && typeof movieRecsResponse[0] === 'string') {
          // Simple array of titles
          state.previousMovieRecommendations = movieRecsResponse;
        } else if (movieRecsResponse.length > 0) {
          // Full recommendation objects
          const extractedTitles = movieRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
          
          state.previousMovieRecommendations = [...new Set(extractedTitles)];
        } else {
          // Empty array
          state.previousMovieRecommendations = [];
        }
      }
    } catch (error) {
      console.error('Error loading recommendations from server:', error);
      
      // Fall back to local storage
      state.previousShowRecommendations = databaseStorageUtils.getJSON('previousTVRecommendations', []);
      state.previousMovieRecommendations = databaseStorageUtils.getJSON('previousMovieRecommendations', []);
    }
  },
  
  // Load liked/disliked preferences from server or local storage
  async loadLikedDislikedPreferences() {
    try {
      const contentType = state.isMovieMode ? 'movie' : 'tv';
      
      // Load liked content
      const likedContent = await apiService.getPreferences(contentType, 'liked');
      if (Array.isArray(likedContent)) {
        state.likedRecommendations = likedContent;
      }
      
      // Load disliked content
      const dislikedContent = await apiService.getPreferences(contentType, 'disliked');
      if (Array.isArray(dislikedContent)) {
        state.dislikedRecommendations = dislikedContent;
      }
    } catch (error) {
      console.error('Error loading preferences from server:', error);
      
      // Fall back to local storage
      state.likedRecommendations = databaseStorageUtils.getJSON('likedTVRecommendations', []);
      state.dislikedRecommendations = databaseStorageUtils.getJSON('dislikedTVRecommendations', []);
    }
  },
  
  // Toggle content type between TV shows and movies
  async setContentType(isMovie) {
    if (state.isMovieMode === isMovie) return;
    
    state.isMovieMode = isMovie;
    
    // Save preference
    try {
      await apiService.saveSettings({
        contentTypePreference: isMovie ? 'movies' : 'tvshows',
        isMovieMode: isMovie
      });
    } catch (error) {
      console.error('Error saving content type preference:', error);
      // Fallback to local storage
      databaseStorageUtils.set('contentTypePreference', isMovie ? 'movies' : 'tvshows');
      databaseStorageUtils.set('isMovieMode', isMovie);
    }
    
    // Reset recommendations
    state.recommendations = [];
    
    // Reset OpenAI conversation context
    openAIService.resetConversation();
    
    // Load liked/disliked preferences for the new content type
    await this.loadLikedDislikedPreferences();
  },
  
  // Like a recommendation
  async likeRecommendation(title) {
    // If already liked, remove it (toggle behavior)
    if (state.likedRecommendations.includes(title)) {
      state.likedRecommendations = state.likedRecommendations.filter(item => item !== title);
    } else {
      // Add to liked list
      state.likedRecommendations.push(title);
      
      // Remove from disliked list if present
      if (state.dislikedRecommendations.includes(title)) {
        state.dislikedRecommendations = state.dislikedRecommendations.filter(item => item !== title);
      }
    }
    
    // Save to database
    await this.saveLikedDislikedLists();
  },
  
  // Dislike a recommendation
  async dislikeRecommendation(title) {
    // If already disliked, remove it (toggle behavior)
    if (state.dislikedRecommendations.includes(title)) {
      state.dislikedRecommendations = state.dislikedRecommendations.filter(item => item !== title);
    } else {
      // Add to disliked list
      state.dislikedRecommendations.push(title);
      
      // Remove from liked list if present
      if (state.likedRecommendations.includes(title)) {
        state.likedRecommendations = state.likedRecommendations.filter(item => item !== title);
      }
    }
    
    // Save to database
    await this.saveLikedDislikedLists();
  },
  
  // Check if a recommendation is liked
  isLiked(title) {
    return state.likedRecommendations.includes(title);
  },
  
  // Check if a recommendation is disliked
  isDisliked(title) {
    return state.dislikedRecommendations.includes(title);
  },
  
  // Save liked and disliked lists to server
  async saveLikedDislikedLists() {
    try {
      const contentType = state.isMovieMode ? 'movie' : 'tv';
      await apiService.savePreferences(contentType, 'liked', state.likedRecommendations);
      await apiService.savePreferences(contentType, 'disliked', state.dislikedRecommendations);
    } catch (error) {
      console.error('Error saving preferences to server:', error);
      // Fallback to local storage
      databaseStorageUtils.setJSON('likedTVRecommendations', state.likedRecommendations);
      databaseStorageUtils.setJSON('dislikedTVRecommendations', state.dislikedRecommendations);
    }
  },
  
  // Request to add a series to Sonarr or a movie to Radarr
  async requestSeries(title) {
    if (state.isMovieMode) {
      return this.requestMovie(title);
    } else {
      return this.requestTVSeries(title);
    }
  },
  
  // Request to add a TV series to Sonarr
  async requestTVSeries(title) {
    if (!sonarrService.isConfigured()) {
      state.error = 'Sonarr service is not configured.';
      return;
    }
    
    try {
      // Set requesting state
      state.requestingSeries = title;
      
      // Check if series already exists in Sonarr
      const existingSeries = await sonarrService.findSeriesByTitle(title);
      
      if (existingSeries && existingSeries.id) {
        // Series already exists
        state.requestStatus[title] = {
          success: true,
          message: 'Series already exists in your Sonarr library',
          alreadyExists: true
        };
        
        state.requestingSeries = null;
        return existingSeries;
      }
      
      // Return the series info for the modal to handle
      const seriesInfo = await sonarrService.lookupSeries(title);
      state.requestingSeries = null;
      return seriesInfo;
      
    } catch (error) {
      console.error(`Error preparing series "${title}" for Sonarr:`, error);
      
      // Store error
      state.requestStatus[title] = {
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`
      };
      
      // Clear requesting state
      state.requestingSeries = null;
      throw error;
    }
  },
  
  // Request to add a movie to Radarr
  async requestMovie(title) {
    if (!radarrService.isConfigured()) {
      state.error = 'Radarr service is not configured.';
      return;
    }
    
    try {
      // Set requesting state
      state.requestingSeries = title;
      
      // Check if movie already exists in Radarr
      const existingMovie = await radarrService.findExistingMovieByTitle(title);
      
      if (existingMovie) {
        // Movie already exists
        state.requestStatus[title] = {
          success: true,
          message: 'Movie already exists in your Radarr library',
          alreadyExists: true
        };
        
        state.requestingSeries = null;
        return existingMovie;
      }
      
      // Look up movie details
      const lookupData = await radarrService._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: title });
      
      if (!lookupData || lookupData.length === 0) {
        throw new Error(`Movie "${title}" not found in Radarr lookup.`);
      }
      
      // Return the movie info for the modal to handle
      state.requestingSeries = null;
      return lookupData[0];
      
    } catch (error) {
      console.error(`Error preparing movie "${title}" for Radarr:`, error);
      
      // Store error
      state.requestStatus[title] = {
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`
      };
      
      // Clear requesting state
      state.requestingSeries = null;
      throw error;
    }
  },
  
  // Add a series to Sonarr with selected options
  async addSeries(title, selectedSeasons, qualityProfileId, rootFolder, tags = []) {
    if (!sonarrService.isConfigured()) {
      throw new Error('Sonarr service is not configured.');
    }
    
    try {
      // Set requesting state
      state.requestingSeries = title;
      
      // Add series to Sonarr
      const response = await sonarrService.addSeries(
        title,
        selectedSeasons,
        qualityProfileId,
        rootFolder,
        tags
      );
      
      // Store success response
      state.requestStatus[title] = {
        success: true,
        message: 'Successfully added to Sonarr',
        details: response
      };
      
      return response;
    } catch (error) {
      console.error(`Error adding series "${title}" to Sonarr:`, error);
      
      // Store error
      state.requestStatus[title] = {
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`
      };
      
      throw error;
    } finally {
      // Clear requesting state
      state.requestingSeries = null;
    }
  },
  
  // Add a movie to Radarr with selected options
  async addMovie(title, qualityProfileId, rootFolder, tags = []) {
    if (!radarrService.isConfigured()) {
      throw new Error('Radarr service is not configured.');
    }
    
    try {
      // Set requesting state
      state.requestingSeries = title;
      
      // Add movie to Radarr
      const response = await radarrService.addMovie(
        title,
        qualityProfileId,
        rootFolder,
        tags
      );
      
      // Store success response
      state.requestStatus[title] = {
        success: true,
        message: 'Successfully added to Radarr',
        details: response
      };
      
      return response;
    } catch (error) {
      console.error(`Error adding movie "${title}" to Radarr:`, error);
      
      // Store error
      state.requestStatus[title] = {
        success: false,
        message: `Error: ${error.message || 'Unknown error'}`
      };
      
      throw error;
    } finally {
      // Clear requesting state
      state.requestingSeries = null;
    }
  },
  
  // Open TMDB detail modal
  openTMDBDetailModal(recommendation) {
    state.selectedMediaTitle = recommendation.title;
    state.selectedMediaId = null; // We'll search by title
    state.showTMDBModal = true;
  },
  
  // Close TMDB detail modal
  closeTMDBModal() {
    state.showTMDBModal = false;
    state.selectedMediaId = null;
    state.selectedMediaTitle = '';
  },
  
  // Get recommendations from the API
  async getRecommendations() {
    // Check if we have any watch history providers configured
    const hasWatchHistoryProvider = state.plexConfigured || state.jellyfinConfigured || 
                                   state.tautulliConfigured || state.traktConfigured;
    
    // Verify we have content and OpenAI is configured
    const isServiceConfigured = state.isMovieMode ? state.radarrConfigured : state.sonarrConfigured;
    
    // Allow recommendations if either Sonarr/Radarr OR a watch history provider is configured
    if (!isServiceConfigured && !hasWatchHistoryProvider) {
      state.error = `You need to connect to either ${state.isMovieMode ? 'Radarr' : 'Sonarr'} or a watch history provider (Plex, Jellyfin, Tautulli, or Trakt) to get recommendations.`;
      return;
    }
    
    // Reset recommendations array to ensure counter starts at 0
    state.recommendations = [];
    
    state.loading = true;
    state.error = null;
    state.recommendationsRequested = true;
    
    try {
      // Convert selectedGenres array to a comma-separated string for the API
      const genreString = state.selectedGenres.length > 0 
        ? state.selectedGenres.join(', ')
        : '';
      
      // Prepare watch history based on user configuration
      let watchHistory = this.getFilteredWatchHistory();
      
      // Get initial recommendations using the appropriate service method based on mode
      if (state.isMovieMode) {
        state.recommendations = await openAIService.getMovieRecommendations(
          state.movies,
          state.numRecommendations,
          genreString,
          state.previousMovieRecommendations,
          state.likedRecommendations,
          state.dislikedRecommendations,
          watchHistory,
          state.plexOnlyMode || state.jellyfinOnlyMode || state.tautulliOnlyMode || state.traktOnlyMode,
          state.customVibe,
          state.selectedLanguage,
          state.promptStyle,
          state.useCustomPromptOnly
        );
      } else {
        state.recommendations = await openAIService.getRecommendations(
          state.series, 
          state.numRecommendations,
          genreString,
          state.previousShowRecommendations,
          state.likedRecommendations,
          state.dislikedRecommendations,
          watchHistory,
          state.plexOnlyMode || state.jellyfinOnlyMode || state.tautulliOnlyMode || state.traktOnlyMode,
          state.customVibe,
          state.selectedLanguage,
          state.promptStyle,
          state.useCustomPromptOnly
        );
      }
      
      // Filter out content that is already in the library, already recommended, or liked/disliked
      if (state.recommendations.length > 0) {
        state.recommendations = await this.filterExistingContent(state.recommendations);
        
        // Remove any duplicate recommendations
        state.recommendations = this.removeDuplicateRecommendations(state.recommendations);
      }
      
      // If we have fewer recommendations than requested after filtering, get more
      if (state.recommendations.length < state.numRecommendations) {
        await this.getAdditionalRecommendations(state.numRecommendations - state.recommendations.length, genreString);
      }
      
      // Add new recommendations to history
      this.addToRecommendationHistory(state.recommendations);
      
      // Fetch ratings for recommendations
      if (state.recommendations.length > 0) {
        await this.fetchRatingsForRecommendations();
      }
      
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      
      // Provide a more helpful error message based on the error
      if (error.message && error.message.includes('API')) {
        state.error = error.message;
      } else if (error.response && error.response.data && error.response.data.error) {
        const errorMsg = error.response.data.error.message || 'Unknown API error';
        state.error = `API Error: ${errorMsg}`;
      } else {
        state.error = 'Failed to get recommendations. Please check your AI service settings and try again.';
      }
      
      state.recommendations = [];
    } finally {
      state.loading = false;
    }
  },
  
  // Get filtered watch history based on user settings
  getFilteredWatchHistory() {
    let plexHistoryFiltered = [];
    let jellyfinHistoryFiltered = [];
    let tautulliHistoryFiltered = [];
    let traktHistoryFiltered = [];
    
    // Filter Plex history
    if (state.plexUseHistory) {
      const plexHistory = state.isMovieMode ? state.recentlyWatchedMovies : state.recentlyWatchedShows;
      plexHistoryFiltered = this.filterWatchHistory(plexHistory, 'plex');
    }
    
    // Filter Jellyfin history
    if (state.jellyfinUseHistory) {
      const jellyfinHistory = state.isMovieMode ? state.jellyfinRecentlyWatchedMovies : state.jellyfinRecentlyWatchedShows;
      jellyfinHistoryFiltered = this.filterWatchHistory(jellyfinHistory, 'jellyfin');
    }
    
    // Filter Tautulli history
    if (state.tautulliUseHistory) {
      const tautulliHistory = state.isMovieMode ? state.tautulliRecentlyWatchedMovies : state.tautulliRecentlyWatchedShows;
      tautulliHistoryFiltered = this.filterWatchHistory(tautulliHistory, 'tautulli');
    }
    
    // Filter Trakt history
    if (state.traktUseHistory) {
      const traktHistory = state.isMovieMode ? state.traktRecentlyWatchedMovies : state.traktRecentlyWatchedShows;
      traktHistoryFiltered = this.filterWatchHistory(traktHistory, 'trakt');
    }
    
    // Combine histories based on "only mode" settings
    let watchHistory = [];
    
    if (state.plexOnlyMode && state.plexUseHistory) {
      watchHistory = plexHistoryFiltered;
    } else if (state.jellyfinOnlyMode && state.jellyfinUseHistory) {
      watchHistory = jellyfinHistoryFiltered;
    } else if (state.tautulliOnlyMode && state.tautulliUseHistory) {
      watchHistory = tautulliHistoryFiltered;
    } else if (state.traktOnlyMode && state.traktUseHistory) {
      watchHistory = traktHistoryFiltered;
    } else {
      // Combine all enabled histories
      watchHistory = [
        ...plexHistoryFiltered,
        ...jellyfinHistoryFiltered,
        ...tautulliHistoryFiltered,
        ...traktHistoryFiltered
      ];
    }
    
    return watchHistory;
  },
  
  // Filter watch history based on the selected history mode
  filterWatchHistory(historyArray, service) {
    if (!historyArray || !historyArray.length) {
      return [];
    }
    
    // Get the appropriate mode and custom days settings based on service
    let historyMode, customDays;
    
    switch (service) {
      case 'plex':
        historyMode = state.plexHistoryMode;
        customDays = state.plexCustomHistoryDays;
        break;
      case 'jellyfin':
        historyMode = state.jellyfinHistoryMode;
        customDays = state.jellyfinCustomHistoryDays;
        break;
      case 'tautulli':
        historyMode = state.tautulliHistoryMode;
        customDays = state.tautulliCustomHistoryDays;
        break;
      case 'trakt':
        historyMode = state.traktHistoryMode;
        customDays = state.traktCustomHistoryDays;
        break;
      default:
        // Default to 'all' if service is unknown
        return historyArray;
    }
    
    // Return unfiltered array if using 'all' mode
    if (historyMode === 'all') {
      return historyArray;
    }
    
    // Calculate the cut-off date based on mode
    const now = new Date();
    let cutoffDate;
    
    if (historyMode === 'recent') {
      // Recent mode is hardcoded to 30 days
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - 30);
    } else if (historyMode === 'custom') {
      // Custom mode uses user-specified days
      cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - customDays);
    } else {
      // Unknown mode, return original array
      return historyArray;
    }
    
    // Filter history by date
    return historyArray.filter(item => {
      if (!item) return false;
      
      // Handle different property names for watched date
      const watchDateStr = item.lastWatched || item.watched || item.viewedAt;
      if (!watchDateStr) {
        return false;
      }
      
      // Handle both date strings and unix timestamps
      let watchDate;
      if (typeof watchDateStr === 'number' || (typeof watchDateStr === 'string' && !isNaN(parseInt(watchDateStr, 10)))) {
        // Handle Unix timestamps (seconds since epoch)
        const timestamp = parseInt(watchDateStr, 10);
        // Check if timestamp is in seconds (Plex) or milliseconds
        watchDate = timestamp > 9999999999 
          ? new Date(timestamp) // Already in milliseconds
          : new Date(timestamp * 1000); // Convert seconds to milliseconds
      } else {
        // Handle regular date strings
        watchDate = new Date(watchDateStr);
      }
      
      return watchDate >= cutoffDate;
    });
  },
  
  // Get additional recommendations when filtering results in fewer than requested
  async getAdditionalRecommendations(additionalCount, genreString, recursionDepth = 0) {
    if (additionalCount <= 0 || recursionDepth >= 10) return;
    
    try {
      // Get additional recommendations
      // Include current recommendations in the exclusion list
      const currentTitles = state.recommendations.map(rec => rec.title);
      const previousRecsList = state.isMovieMode ? state.previousMovieRecommendations : state.previousShowRecommendations;
      const updatedPrevious = [...new Set([...previousRecsList, ...currentTitles])];
      
      // Request more recommendations than we need to account for filtering
      const requestCount = Math.min(additionalCount * 2, 25); // Request 100% more, up to 25 max
      
      // Use the appropriate method based on content type mode
      let additionalRecommendations;
      if (state.isMovieMode) {
        // Use movie recommendations method
        additionalRecommendations = await openAIService.getAdditionalMovieRecommendations(
          requestCount,
          updatedPrevious,
          genreString,
          state.customVibe,
          state.selectedLanguage,
          state.movies,
          state.likedRecommendations,
          state.dislikedRecommendations
        );
      } else {
        // Use TV show recommendations method
        additionalRecommendations = await openAIService.getAdditionalTVRecommendations(
          requestCount,
          updatedPrevious,
          genreString,
          state.customVibe,
          state.selectedLanguage,
          state.series,
          state.likedRecommendations,
          state.dislikedRecommendations
        );
      }
      
      // Always filter the additional recommendations
      let filteredAdditional = additionalRecommendations;
      if (filteredAdditional.length > 0) {
        filteredAdditional = await this.filterExistingContent(filteredAdditional);
      }
      
      // Combine with existing recommendations
      state.recommendations = [...state.recommendations, ...filteredAdditional];
      
      // Remove any duplicate recommendations after combining
      state.recommendations = this.removeDuplicateRecommendations(state.recommendations);
      
      // If we still don't have enough, try again with incremented recursion depth
      if (state.recommendations.length < state.numRecommendations) {
        // Calculate how many more we need
        const stillNeeded = state.numRecommendations - state.recommendations.length;
        
        // Recursive call with updated exclusion list and incremented recursion depth
        if (stillNeeded > 0) {
          await this.getAdditionalRecommendations(stillNeeded, genreString, recursionDepth + 1);
        }
      }
    } catch (error) {
      console.error('Error getting additional recommendations:', error);
      
      // Count this as one attempt but continue if we're not at the limit
      if (recursionDepth + 1 < 10) {
        // Calculate how many we still need
        const stillNeeded = state.numRecommendations - state.recommendations.length;
        if (stillNeeded > 0) {
          // Wait a short time before retrying to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.getAdditionalRecommendations(stillNeeded, genreString, recursionDepth + 1);
        }
      }
    }
  },
  
  // Fetch ratings data from Sonarr/Radarr for each recommendation
  async fetchRatingsForRecommendations() {
    // Skip if no recommendations or services not configured
    if (!state.recommendations.length) return;
    
    const isRadarrConfigured = state.radarrConfigured;
    const isSonarrConfigured = state.sonarrConfigured;
    
    if ((state.isMovieMode && !isRadarrConfigured) || (!state.isMovieMode && !isSonarrConfigured)) {
      return;
    }
    
    // Process recommendations in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < state.recommendations.length; i += batchSize) {
      const batch = state.recommendations.slice(i, i + batchSize);
      
      // Process each recommendation in the batch in parallel
      await Promise.all(batch.map(async (rec) => {
        try {
          if (state.isMovieMode) {
            // Lookup movie in Radarr
            const movieData = await radarrService.lookupMovie(rec.title);
            if (movieData && movieData.ratings) {
              rec.ratings = movieData.ratings;
            }
          } else {
            // Lookup series in Sonarr
            const seriesData = await sonarrService.lookupSeries(rec.title);
            if (seriesData && seriesData.ratings) {
              // Transform Sonarr ratings to match expected structure
              rec.ratings = {
                imdb: {
                  value: seriesData.ratings.value,
                  votes: seriesData.ratings.votes
                }
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching ratings for "${rec.title}":`, error);
          // Continue with other recommendations even if one fails
        }
      }));
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < state.recommendations.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  },
  
  // Filter out content that already exists in the library or has been previously recommended
  async filterExistingContent(recommendations) {
    try {
      // Create a normalized map of existing titles in the library
      const existingTitles = new Set(
        state.isMovieMode 
          ? state.movies.map(movie => movie.title.toLowerCase())
          : state.series.map(show => show.title.toLowerCase())
      );
      
      // Add liked recommendations to the filter set
      const likedRecommendationTitles = new Set(
        state.likedRecommendations.map(title => title.toLowerCase())
      );
      
      // Add disliked recommendations to the filter set
      const dislikedRecommendationTitles = new Set(
        state.dislikedRecommendations.map(title => title.toLowerCase())
      );
      
      // Add previous recommendations to the filter set
      const previousList = state.isMovieMode ? state.previousMovieRecommendations : state.previousShowRecommendations;
      const previousRecommendationTitles = new Set(
        previousList.map(title => title.toLowerCase())
      );
      
      // Filter out recommendations that already exist in the library, liked list, disliked list, or previous recommendations
      return recommendations.filter(rec => {
        const normalizedTitle = rec.title.toLowerCase();
        
        if (existingTitles.has(normalizedTitle) || 
            likedRecommendationTitles.has(normalizedTitle) || 
            dislikedRecommendationTitles.has(normalizedTitle) || 
            previousRecommendationTitles.has(normalizedTitle)) {
          return false;
        }
        
        // Check for close partial matches as well
        // For library items
        for (const libraryTitle of existingTitles) {
          // Only check substantial titles (avoid false matches with very short titles)
          if (normalizedTitle.length > 4 && libraryTitle.length > 4) {
            // Check if one is a substring of the other
            if (normalizedTitle.includes(libraryTitle) || libraryTitle.includes(normalizedTitle)) {
              return false;
            }
          }
        }
        
        return true;
      });
    } catch (error) {
      console.error(`Error filtering existing ${state.isMovieMode ? 'movies' : 'shows'}:`, error);
      return recommendations; // Return original list on error
    }
  },
  
  // Remove duplicate recommendations based on title
  removeDuplicateRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      return recommendations;
    }
    
    // Use a Map to track unique titles (case-insensitive)
    const uniqueTitles = new Map();
    
    // Filter the recommendations array to keep only the first occurrence of each title
    return recommendations.filter(rec => {
      if (!rec || !rec.title) return false;
      
      const normalizedTitle = rec.title.toLowerCase();
      
      if (uniqueTitles.has(normalizedTitle)) {
        return false;
      }
      
      uniqueTitles.set(normalizedTitle, true);
      return true;
    });
  },
  
  // Add current recommendations to the history
  async addToRecommendationHistory(newRecommendations) {
    // Extract just the titles for the title-only history array
    const titlesToAdd = newRecommendations.map(rec => rec.title);
    
    // Reference to the correct history array based on mode
    const historyArray = state.isMovieMode ? 
      state.previousMovieRecommendations : state.previousShowRecommendations;
    
    // Combine with existing recommendations, remove duplicates
    const combinedRecommendations = [...historyArray, ...titlesToAdd];
    
    // Keep only unique recommendations (as strings)
    const uniqueRecommendations = [...new Set(combinedRecommendations)];
    
    // If over the limit, remove oldest recommendations
    if (uniqueRecommendations.length > state.maxStoredRecommendations) {
      if (state.isMovieMode) {
        state.previousMovieRecommendations = uniqueRecommendations.slice(
          uniqueRecommendations.length - state.maxStoredRecommendations
        );
      } else {
        state.previousShowRecommendations = uniqueRecommendations.slice(
          uniqueRecommendations.length - state.maxStoredRecommendations
        );
      }
    } else {
      if (state.isMovieMode) {
        state.previousMovieRecommendations = uniqueRecommendations;
      } else {
        state.previousShowRecommendations = uniqueRecommendations;
      }
    }
    
    // Save to server
    try {
      if (state.isMovieMode) {
        await apiService.saveRecommendations('movie', state.previousMovieRecommendations, state.username);
        databaseStorageUtils.setJSON('previousMovieRecommendations', state.previousMovieRecommendations);
        databaseStorageUtils.setJSON('currentMovieRecommendations', newRecommendations);
      } else {
        // Ensure all items are valid strings before saving
        const sanitizedRecommendations = state.previousShowRecommendations
          .filter(item => item !== null && item !== undefined)
          .map(item => String(item));
          
        await apiService.saveRecommendations('tv', sanitizedRecommendations, state.username);
        databaseStorageUtils.setJSON('previousTVRecommendations', sanitizedRecommendations);
        databaseStorageUtils.setJSON('currentTVRecommendations', newRecommendations);
      }
    } catch (error) {
      console.error('Error saving recommendation history to server:', error);
      
      // Fallback to local storage
      if (state.isMovieMode) {
        databaseStorageUtils.setJSON('previousMovieRecommendations', state.previousMovieRecommendations);
        databaseStorageUtils.setJSON('currentMovieRecommendations', newRecommendations);
      } else {
        // Ensure all items are valid strings before saving to local storage
        const sanitizedRecommendations = state.previousShowRecommendations
          .filter(item => item !== null && item !== undefined)
          .map(item => String(item));
          
        databaseStorageUtils.setJSON('previousTVRecommendations', sanitizedRecommendations);
        databaseStorageUtils.setJSON('currentTVRecommendations', newRecommendations);
      }
    }
  },
  
  // Clear recommendation history
  async clearRecommendationHistory() {
    if (state.isMovieMode) {
      // Clear movie history
      state.previousMovieRecommendations = [];
      
      // Clear from local storage
      databaseStorageUtils.remove('previousMovieRecommendations');
      
      // Clear from server
      try {
        await apiService.saveRecommendations('movie', [], state.username);
      } catch (error) {
        console.error('Failed to clear movie history from server:', error);
      }
    } else {
      // Clear TV history
      state.previousShowRecommendations = [];
      
      // Clear from local storage
      databaseStorageUtils.remove('previousTVRecommendations');
      
      // Clear from server
      try {
        await apiService.saveRecommendations('tv', [], state.username);
      } catch (error) {
        console.error('Failed to clear TV history from server:', error);
      }
    }
  },
  
  // Poster management methods
  
  // Clean title for consistent poster lookup
  cleanTitle(title) {
    return title.replace(/[:.!?]+$/, '').trim();
  },
  
  // Check if we have a poster for this title
  hasPoster(title) {
    const clean = this.cleanTitle(title);
    return state.posters.has(clean);
  },
  
  // Check if poster is a fallback and should have retry button
  isPosterFallback(title) {
    const clean = this.cleanTitle(title);
    const posterUrl = state.posters.get(clean);
    return posterUrl && posterUrl.includes('fallback');
  },
  
  // Retry loading a poster for a specific title
  async retryPoster(title) {
    const clean = this.cleanTitle(title);
    
    // Set loading state
    state.loadingPosters.set(clean, true);
    
    try {
      // Try to get a real poster
      const posterUrl = state.isMovieMode
        ? await imageService.getPosterForMovie(clean)
        : await imageService.getPosterForShow(clean);
      
      if (posterUrl) {
        state.posters.set(clean, posterUrl);
      }
    } catch (error) {
      console.error('Error retrying poster:', error);
    } finally {
      // Clear loading state
      state.loadingPosters.set(clean, false);
    }
  },
  
  // Get poster style for CSS
  getPosterStyle(title) {
    const clean = this.cleanTitle(title);
    const posterUrl = state.posters.get(clean);
    
    if (posterUrl) {
      return {
        'background-image': `url(${posterUrl})`,
        'background-size': 'cover',
        'background-position': 'center'
      };
    }
    
    return {
      'background-color': 'var(--card-bg-color)'
    };
  },
  
  // Get initials for fallback display
  getInitials(title) {
    if (!title) return '';
    
    return title
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },
  
  // Toggle card expansion in compact mode
  toggleCardExpansion(index) {
    if (state.expandedCards.has(index)) {
      state.expandedCards.delete(index);
    } else {
      state.expandedCards.add(index);
    }
  },
  
  // Check TMDB availability
  async checkTMDBAvailability() {
    try {
      console.log('Checking TMDB availability...');
      // Direct check assuming the imageService has this method
      const isAvailable = await imageService.isTMDBAvailable();
      console.log('TMDB availability result:', isAvailable);
      state.tmdbAvailable = !!isAvailable;
    } catch (error) {
      console.error('Error checking TMDB availability:', error);
      state.tmdbAvailable = false;
    }
    console.log('TMDB availability set to:', state.tmdbAvailable);
  },
  
  // Fetch posters for all recommendations
  async fetchPosters() {
    // Clear existing loading states
    state.loadingPosters.clear();
    
    // Create requests for all recommendations
    const posterPromises = state.recommendations.map(async (rec) => {
      try {
        // Extract clean title (removing any punctuation at the end)
        const cleanTitle = this.cleanTitle(rec.title);
        
        // Use the appropriate poster fetching method based on content type
        const posterUrl = state.isMovieMode 
          ? await imageService.getPosterForMovie(cleanTitle)
          : await imageService.getPosterForShow(cleanTitle);
        
        if (posterUrl) {
          // Update posters state using Map methods
          state.posters.set(cleanTitle, posterUrl);
        } else {
          // Set fallback image
          state.posters.set(cleanTitle, imageService.getFallbackImageUrl(cleanTitle));
        }
      } catch (error) {
        console.error(`Error fetching poster for "${rec.title}":`, error);
        // Fallback image
        state.posters.set(rec.title, imageService.getFallbackImageUrl(rec.title));
      }
    });
    
    // Wait for all requests to complete
    await Promise.all(posterPromises);
  }
};

export default RecommendationsStore;
