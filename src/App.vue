<template>
  <div class="app-container">
    <header class="app-header">
      <img alt="App logo" src="./assets/logo.png" class="logo">
      <h1>Recommendarr</h1>
    </header>
    
    <main>
      <div v-if="!sonarrConnected && !radarrConnected && !plexConnected && !jellyfinConnected">
        <p class="choose-service">Choose a service to connect to:</p>
        <div class="service-buttons">
          <button class="service-button" @click="showSonarrConnect = true">
            Connect to Sonarr
            <small>For TV recommendations</small>
          </button>
          <button class="service-button" @click="showRadarrConnect = true">
            Connect to Radarr
            <small>For movie recommendations</small>
          </button>
          <button class="service-button plex-button" @click="showPlexConnect = true">
            Connect to Plex
            <small>For watch history integration</small>
          </button>
          <button class="service-button jellyfin-button" @click="showJellyfinConnect = true">
            Connect to Jellyfin
            <small>For watch history integration</small>
          </button>
        </div>
      </div>
      
      <!-- User Selection Modal for Jellyfin -->
      <div v-if="showJellyfinUserSelect && jellyfinConnected" class="modal-overlay">
        <div class="jellyfin-user-modal">
          <div class="modal-header">
            <h4>Select Jellyfin User</h4>
            <button class="close-button" @click="closeJellyfinUserSelect">&times;</button>
          </div>
          <div class="modal-body">
            <div v-if="jellyfinUsersLoading" class="loading-users">
              <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
              </div>
              <p>Loading users...</p>
            </div>
            <div v-else-if="jellyfinUsers.length === 0" class="no-users-found">
              <p>No users found. Please check your API key permissions.</p>
            </div>
            <div v-else class="users-list">
              <button 
                v-for="user in jellyfinUsers" 
                :key="user.id"
                class="user-item"
                :class="{ 'selected': user.id === selectedJellyfinUserId }"
                @click="selectJellyfinUser(user)"
              >
                <span class="user-name">{{ user.name }}</span>
                <span v-if="user.isAdministrator" class="user-badge admin">Admin</span>
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="cancel-button" @click="closeJellyfinUserSelect">Cancel</button>
            <button 
              class="apply-button" 
              @click="applyJellyfinUserSelection"
              :disabled="!selectedJellyfinUserId"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
      
      <SonarrConnection v-if="showSonarrConnect && !sonarrConnected" @connected="handleSonarrConnected" @disconnected="handleSonarrDisconnected" />
      <RadarrConnection v-if="showRadarrConnect && !radarrConnected" @connected="handleRadarrConnected" @disconnected="handleRadarrDisconnected" />
      <PlexConnection v-if="showPlexConnect && !plexConnected" @connected="handlePlexConnected" @disconnected="handlePlexDisconnected" @limitChanged="handlePlexLimitChanged" />
      <JellyfinConnection v-if="showJellyfinConnect && !jellyfinConnected" @connected="handleJellyfinConnected" @disconnected="handleJellyfinDisconnected" @limitChanged="handleJellyfinLimitChanged" />
      
      <div v-if="sonarrConnected || radarrConnected || plexConnected || jellyfinConnected">
        <AppNavigation 
          :activeTab="activeTab" 
          @navigate="handleNavigate"
          @logout="handleLogout" 
        />
        
        <div class="content">
          <TVRecommendations 
            v-if="activeTab === 'tv-recommendations'" 
            :series="series"
            :sonarrConfigured="sonarrConnected"
            :recentlyWatchedShows="recentlyWatchedShows"
            :jellyfinRecentlyWatchedShows="jellyfinRecentlyWatchedShows"
            :plexConfigured="plexConnected"
            :jellyfinConfigured="jellyfinConnected"
            @navigate="handleNavigate" 
            @plexHistoryModeChanged="handlePlexHistoryModeChanged"
            @plexOnlyModeChanged="handlePlexOnlyModeChanged"
            @jellyfinHistoryModeChanged="handleJellyfinHistoryModeChanged"
            @jellyfinOnlyModeChanged="handleJellyfinOnlyModeChanged"
            @openJellyfinUserSelect="openJellyfinUserSelect"
          />
          
          <MovieRecommendations 
            v-if="activeTab === 'movie-recommendations'" 
            :movies="movies"
            :radarrConfigured="radarrConnected"
            :recentlyWatchedMovies="recentlyWatchedMovies"
            :jellyfinRecentlyWatchedMovies="jellyfinRecentlyWatchedMovies"
            :plexConfigured="plexConnected"
            :jellyfinConfigured="jellyfinConnected"
            @navigate="handleNavigate" 
            @plexHistoryModeChanged="handlePlexHistoryModeChanged"
            @plexOnlyModeChanged="handlePlexOnlyModeChanged"
            @jellyfinHistoryModeChanged="handleJellyfinHistoryModeChanged"
            @jellyfinOnlyModeChanged="handleJellyfinOnlyModeChanged"
            @openJellyfinUserSelect="openJellyfinUserSelect"
          />
          
          <History
            v-if="activeTab === 'history'"
            :sonarrConfigured="sonarrConnected"
            :radarrConfigured="radarrConnected"
          />
          
          <AISettings
            v-if="activeTab === 'settings'"
            :sonarrConnected="sonarrConnected"
            :radarrConnected="radarrConnected"
            :plexConnected="plexConnected"
            :jellyfinConnected="jellyfinConnected"
            @settings-updated="handleSettingsUpdated"
            @sonarr-settings-updated="handleSonarrSettingsUpdated"
            @radarr-settings-updated="handleRadarrSettingsUpdated"
            @plex-settings-updated="handlePlexSettingsUpdated"
            @jellyfin-settings-updated="handleJellyfinSettingsUpdated"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import SonarrConnection from './components/SonarrConnection.vue'
import RadarrConnection from './components/RadarrConnection.vue'
import PlexConnection from './components/PlexConnection.vue'
import JellyfinConnection from './components/JellyfinConnection.vue'
import AppNavigation from './components/Navigation.vue'
import TVRecommendations from './components/TVRecommendations.vue'
import MovieRecommendations from './components/MovieRecommendations.vue'
import History from './components/History.vue'
import AISettings from './components/AISettings.vue'
import sonarrService from './services/SonarrService'
import radarrService from './services/RadarrService'
import plexService from './services/PlexService'
import jellyfinService from './services/JellyfinService'
import credentialsService from './services/CredentialsService'

export default {
  name: 'App',
  components: {
    SonarrConnection,
    RadarrConnection,
    PlexConnection,
    JellyfinConnection,
    AppNavigation,
    TVRecommendations,
    MovieRecommendations,
    History,
    AISettings
  },
  data() {
    return {
      sonarrConnected: false,
      radarrConnected: false,
      plexConnected: false,
      jellyfinConnected: false,
      showSonarrConnect: false,
      showRadarrConnect: false,
      showPlexConnect: false,
      showJellyfinConnect: false,
      showJellyfinUserSelect: false,
      jellyfinUsers: [],
      jellyfinUsersLoading: false,
      selectedJellyfinUserId: '',
      activeTab: 'tv-recommendations',
      series: [],
      movies: [],
      recentlyWatchedMovies: [],
      recentlyWatchedShows: [],
      jellyfinRecentlyWatchedMovies: [],
      jellyfinRecentlyWatchedShows: [],
      plexRecentLimit: 100,
      jellyfinRecentLimit: 100,
      plexHistoryMode: 'all', // 'all' or 'recent'
      jellyfinHistoryMode: 'all', // 'all' or 'recent'
      plexOnlyMode: false, // Whether to use only Plex history for recommendations
      jellyfinOnlyMode: false // Whether to use only Jellyfin history for recommendations
    }
  },
  async created() {
    // Check if services have credentials stored server-side
    await this.checkStoredCredentials();
    
    // Check if Sonarr is already configured on startup
    if (sonarrService.isConfigured()) {
      this.checkSonarrConnection();
    }
    
    // Check if Radarr is already configured on startup
    if (radarrService.isConfigured()) {
      this.checkRadarrConnection();
    }
    
    // Check if Plex is already configured on startup
    if (plexService.isConfigured()) {
      this.checkPlexConnection();
    }
    
    // Check if Jellyfin is already configured on startup
    if (jellyfinService.isConfigured()) {
      this.checkJellyfinConnection();
    }
    
    // Load Plex recent limit from localStorage if available
    const savedPlexLimit = localStorage.getItem('plexRecentLimit');
    if (savedPlexLimit) {
      this.plexRecentLimit = parseInt(savedPlexLimit, 10);
    }
    
    // Load Jellyfin recent limit from localStorage if available
    const savedJellyfinLimit = localStorage.getItem('jellyfinRecentLimit');
    if (savedJellyfinLimit) {
      this.jellyfinRecentLimit = parseInt(savedJellyfinLimit, 10);
    }
    
    // Load Plex history mode from localStorage if available
    const savedPlexHistoryMode = localStorage.getItem('plexHistoryMode');
    if (savedPlexHistoryMode) {
      this.plexHistoryMode = savedPlexHistoryMode;
    }
    
    // Load Jellyfin history mode from localStorage if available
    const savedJellyfinHistoryMode = localStorage.getItem('jellyfinHistoryMode');
    if (savedJellyfinHistoryMode) {
      this.jellyfinHistoryMode = savedJellyfinHistoryMode;
    }
    
    // Load Plex only mode from localStorage if available
    const savedPlexOnlyMode = localStorage.getItem('plexOnlyMode');
    if (savedPlexOnlyMode) {
      this.plexOnlyMode = savedPlexOnlyMode === 'true';
    }
    
    // Load Jellyfin only mode from localStorage if available
    const savedJellyfinOnlyMode = localStorage.getItem('jellyfinOnlyMode');
    if (savedJellyfinOnlyMode) {
      this.jellyfinOnlyMode = savedJellyfinOnlyMode === 'true';
    }
  },
  methods: {
    // Check if we have credentials stored server-side
    async checkStoredCredentials() {
      try {
        // Get all services status from the server
        const hasAnyService = await Promise.all([
          credentialsService.hasCredentials('sonarr'),
          credentialsService.hasCredentials('radarr'),
          credentialsService.hasCredentials('plex'),
          credentialsService.hasCredentials('jellyfin')
        ]);
        
        // If any service has credentials, set up the appropriate services
        if (hasAnyService.some(result => result === true)) {
          // Try to configure services with stored credentials
          await Promise.all([
            this.configureServiceFromCredentials('sonarr'),
            this.configureServiceFromCredentials('radarr'),
            this.configureServiceFromCredentials('plex'),
            this.configureServiceFromCredentials('jellyfin')
          ]);
        }
      } catch (error) {
        console.error('Error checking for stored credentials:', error);
      }
    },
    
    // Configure a service from stored server-side credentials
    async configureServiceFromCredentials(serviceName) {
      try {
        // Get credentials for this service
        const credentials = await credentialsService.getCredentials(serviceName);
        if (!credentials) return;
        
        // Configure the appropriate service
        switch(serviceName) {
          case 'sonarr':
            if (credentials.baseUrl && credentials.apiKey) {
              await sonarrService.configure(credentials.baseUrl, credentials.apiKey);
              const success = await sonarrService.testConnection();
              if (success) {
                this.sonarrConnected = true;
                this.fetchSeriesData();
              }
            }
            break;
            
          case 'radarr':
            if (credentials.baseUrl && credentials.apiKey) {
              await radarrService.configure(credentials.baseUrl, credentials.apiKey);
              const success = await radarrService.testConnection();
              if (success) {
                this.radarrConnected = true;
                this.fetchMoviesData();
              }
            }
            break;
            
          case 'plex':
            if (credentials.baseUrl && credentials.token) {
              await plexService.configure(credentials.baseUrl, credentials.token);
              const success = await plexService.testConnection();
              if (success) {
                this.plexConnected = true;
                this.fetchPlexData();
              }
            }
            break;
            
          case 'jellyfin':
            if (credentials.baseUrl && credentials.apiKey && credentials.userId) {
              await jellyfinService.configure(credentials.baseUrl, credentials.apiKey, credentials.userId);
              const result = await jellyfinService.testConnection();
              if (result.success) {
                this.jellyfinConnected = true;
                this.fetchJellyfinData();
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Error configuring ${serviceName} from stored credentials:`, error);
      }
    },
    
    // Handler methods for disconnection events from connection components
    async handleSonarrDisconnected() {
      this.sonarrConnected = false;
      this.showSonarrConnect = false; // Don't show connect modal
      this.series = [];
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('sonarr');
      
      // If we're on the TV recommendations tab and no longer have Sonarr connected,
      // switch to movie recommendations if Radarr is available
      if (this.activeTab === 'tv-recommendations' && this.radarrConnected) {
        this.activeTab = 'movie-recommendations';
      }
    },
    
    async handleRadarrDisconnected() {
      this.radarrConnected = false;
      this.showRadarrConnect = false; // Don't show connect modal
      this.movies = [];
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('radarrBaseUrl');
      localStorage.removeItem('radarrApiKey');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('radarr');
      
      // If we're on the movie recommendations tab and no longer have Radarr connected,
      // switch to TV recommendations if Sonarr is available
      if (this.activeTab === 'movie-recommendations' && this.sonarrConnected) {
        this.activeTab = 'tv-recommendations';
      }
    },
    
    async handlePlexDisconnected() {
      this.plexConnected = false;
      this.showPlexConnect = false; // Don't show connect modal
      this.recentlyWatchedMovies = [];
      this.recentlyWatchedShows = [];
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('plexBaseUrl');
      localStorage.removeItem('plexToken');
      localStorage.removeItem('plexRecentLimit');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('plex');
    },
    
    async handleJellyfinDisconnected() {
      this.jellyfinConnected = false;
      this.showJellyfinConnect = false; // Don't show connect modal
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      
      // Clean up localStorage (for backwards compatibility)
      localStorage.removeItem('jellyfinBaseUrl');
      localStorage.removeItem('jellyfinApiKey');
      localStorage.removeItem('jellyfinUserId');
      localStorage.removeItem('jellyfinRecentLimit');
      
      // Delete credentials from server
      await credentialsService.deleteCredentials('jellyfin');
    },
    
    async openJellyfinUserSelect() {
      this.showJellyfinUserSelect = true;
      this.jellyfinUsersLoading = true;
      this.jellyfinUsers = [];
      this.selectedJellyfinUserId = jellyfinService.userId;
      
      try {
        this.jellyfinUsers = await jellyfinService.getUsers();
      } catch (error) {
        console.error('Error fetching Jellyfin users:', error);
      } finally {
        this.jellyfinUsersLoading = false;
      }
    },
    
    closeJellyfinUserSelect() {
      this.showJellyfinUserSelect = false;
    },
    
    selectJellyfinUser(user) {
      this.selectedJellyfinUserId = user.id;
    },
    
    async applyJellyfinUserSelection() {
      if (!this.selectedJellyfinUserId) return;
      
      // Save current history limit to ensure it persists across user changes
      localStorage.setItem('jellyfinHistoryLimit', this.jellyfinRecentLimit.toString());
      
      // Update the Jellyfin service with the new user ID
      jellyfinService.configure(
        jellyfinService.baseUrl,
        jellyfinService.apiKey,
        this.selectedJellyfinUserId
      );
      
      // Close the modal
      this.showJellyfinUserSelect = false;
      
      // Fetch updated watch history
      this.fetchJellyfinData();
    },
    
    async checkSonarrConnection() {
      try {
        const success = await sonarrService.testConnection();
        if (success) {
          this.sonarrConnected = true;
          this.fetchSeriesData();
          if (this.activeTab === 'movie-recommendations' && !this.radarrConnected) {
            this.activeTab = 'tv-recommendations';
          }
        }
      } catch (error) {
        console.error('Failed to connect with stored Sonarr credentials:', error);
      }
    },
    
    async checkRadarrConnection() {
      try {
        const success = await radarrService.testConnection();
        if (success) {
          this.radarrConnected = true;
          this.fetchMoviesData();
          if (this.activeTab === 'tv-recommendations' && !this.sonarrConnected) {
            this.activeTab = 'movie-recommendations';
          }
        }
      } catch (error) {
        console.error('Failed to connect with stored Radarr credentials:', error);
      }
    },
    
    async checkPlexConnection() {
      try {
        const success = await plexService.testConnection();
        if (success) {
          this.plexConnected = true;
          this.fetchPlexData();
        }
      } catch (error) {
        console.error('Failed to connect with stored Plex credentials:', error);
      }
    },
    
    async checkJellyfinConnection() {
      try {
        const result = await jellyfinService.testConnection();
        if (result.success) {
          this.jellyfinConnected = true;
          this.fetchJellyfinData();
        }
      } catch (error) {
        console.error('Failed to connect with stored Jellyfin credentials:', error);
      }
    },
    
    handleSonarrConnected() {
      this.sonarrConnected = true;
      this.showSonarrConnect = false;
      this.fetchSeriesData();
      this.activeTab = 'tv-recommendations';
    },
    
    handleRadarrConnected() {
      this.radarrConnected = true;
      this.showRadarrConnect = false;
      this.fetchMoviesData();
      this.activeTab = 'movie-recommendations';
    },
    
    handlePlexConnected() {
      this.plexConnected = true;
      this.showPlexConnect = false;
      this.fetchPlexData();
    },
    
    handleJellyfinConnected() {
      this.jellyfinConnected = true;
      this.showJellyfinConnect = false;
      this.fetchJellyfinData();
    },
    
    handlePlexLimitChanged(limit) {
      this.plexRecentLimit = limit;
      this.fetchPlexData();
    },
    
    handleJellyfinLimitChanged(limit) {
      this.jellyfinRecentLimit = limit;
      this.fetchJellyfinData();
    },
    
    handlePlexHistoryModeChanged(mode) {
      this.plexHistoryMode = mode;
      this.fetchPlexData();
    },
    
    handleJellyfinHistoryModeChanged(mode) {
      this.jellyfinHistoryMode = mode;
      this.fetchJellyfinData();
    },
    
    handlePlexOnlyModeChanged(enabled) {
      this.plexOnlyMode = enabled;
    },
    
    handleJellyfinOnlyModeChanged(enabled) {
      this.jellyfinOnlyMode = enabled;
    },
    handleNavigate(tab) {
      this.activeTab = tab;
      
      // If we're switching to TV recommendations, ensure we have series data
      if (tab === 'tv-recommendations' && this.series.length === 0 && this.sonarrConnected) {
        this.fetchSeriesData();
      }
      
      // If we're switching to movie recommendations, ensure we have movies data
      if (tab === 'movie-recommendations' && this.movies.length === 0 && this.radarrConnected) {
        this.fetchMoviesData();
      }
    },
    async fetchSeriesData() {
      try {
        this.series = await sonarrService.getSeries();
      } catch (error) {
        console.error('Failed to fetch series data for recommendations:', error);
      }
    },
    
    async fetchMoviesData() {
      try {
        this.movies = await radarrService.getMovies();
      } catch (error) {
        console.error('Failed to fetch movies data for recommendations:', error);
      }
    },
    
    async fetchPlexData() {
      if (!plexService.isConfigured()) {
        return;
      }
      
      try {
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.plexHistoryMode === 'recent' ? 30 : 0;
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          plexService.getRecentlyWatchedMovies(this.plexRecentLimit, daysAgo),
          plexService.getRecentlyWatchedShows(this.plexRecentLimit, daysAgo)
        ]);
        
        this.recentlyWatchedMovies = moviesResponse;
        this.recentlyWatchedShows = showsResponse;
        
        console.log('Fetched Plex watch history:', {
          movies: this.recentlyWatchedMovies,
          shows: this.recentlyWatchedShows
        });
      } catch (error) {
        console.error('Failed to fetch Plex watch history:', error);
      }
    },
    
    async fetchJellyfinData() {
      if (!jellyfinService.isConfigured()) {
        return;
      }
      
      try {
        // Determine if we should apply a days filter based on the history mode
        const daysAgo = this.jellyfinHistoryMode === 'recent' ? 30 : 0;
        
        // Fetch both shows and movies in parallel for efficiency
        const [moviesResponse, showsResponse] = await Promise.all([
          jellyfinService.getRecentlyWatchedMovies(this.jellyfinRecentLimit, daysAgo),
          jellyfinService.getRecentlyWatchedShows(this.jellyfinRecentLimit, daysAgo)
        ]);
        
        this.jellyfinRecentlyWatchedMovies = moviesResponse;
        this.jellyfinRecentlyWatchedShows = showsResponse;
        
        console.log('Fetched Jellyfin watch history:', {
          movies: this.jellyfinRecentlyWatchedMovies,
          shows: this.jellyfinRecentlyWatchedShows
        });
      } catch (error) {
        console.error('Failed to fetch Jellyfin watch history:', error);
      }
    },
    handleSettingsUpdated() {
      // When AI settings are updated, show a brief notification or just stay on the settings page
      console.log('AI settings updated successfully');
    },
    
    async handleSonarrSettingsUpdated() {
      // Check if Sonarr service is configured in memory
      if (sonarrService.isConfigured()) {
        // Check the Sonarr connection with the new settings
        this.checkSonarrConnection();
        console.log('Sonarr settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('sonarr');
      } catch (error) {
        console.error('Error loading Sonarr credentials:', error);
        this.sonarrConnected = false;
      }
    },
    
    async handleRadarrSettingsUpdated() {
      // Check if Radarr service is configured in memory
      if (radarrService.isConfigured()) {
        // Check the Radarr connection with the new settings
        this.checkRadarrConnection();
        console.log('Radarr settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('radarr');
      } catch (error) {
        console.error('Error loading Radarr credentials:', error);
        this.radarrConnected = false;
      }
    },
    
    async handlePlexSettingsUpdated() {
      // Check if Plex service is configured in memory
      if (plexService.isConfigured()) {
        // Check the Plex connection with the new settings
        this.checkPlexConnection();
        console.log('Plex settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('plex');
      } catch (error) {
        console.error('Error loading Plex credentials:', error);
        this.plexConnected = false;
      }
    },
    
    async handleJellyfinSettingsUpdated() {
      // Check if Jellyfin service is configured in memory
      if (jellyfinService.isConfigured()) {
        // Check the Jellyfin connection with the new settings
        this.checkJellyfinConnection();
        console.log('Jellyfin settings updated, testing connection');
        return;
      }
      
      // If not in memory, check server storage
      try {
        await this.configureServiceFromCredentials('jellyfin');
      } catch (error) {
        console.error('Error loading Jellyfin credentials:', error);
        this.jellyfinConnected = false;
      }
    },
    async handleLogout() {
      // Clear all stored credentials from localStorage (for backwards compatibility)
      localStorage.removeItem('sonarrBaseUrl');
      localStorage.removeItem('sonarrApiKey');
      localStorage.removeItem('radarrBaseUrl');
      localStorage.removeItem('radarrApiKey');
      localStorage.removeItem('plexBaseUrl');
      localStorage.removeItem('plexToken');
      localStorage.removeItem('jellyfinBaseUrl');
      localStorage.removeItem('jellyfinApiKey');
      localStorage.removeItem('jellyfinUserId');
      localStorage.removeItem('openaiApiKey');
      localStorage.removeItem('openaiModel');
      
      // Delete all credentials from server
      try {
        await Promise.all([
          credentialsService.deleteCredentials('sonarr'),
          credentialsService.deleteCredentials('radarr'),
          credentialsService.deleteCredentials('plex'),
          credentialsService.deleteCredentials('jellyfin'),
          credentialsService.deleteCredentials('openai')
        ]);
      } catch (error) {
        console.error('Error deleting server-side credentials:', error);
      }
      
      // Reset service configurations
      sonarrService.configure('', '');
      radarrService.configure('', '');
      plexService.configure('', '');
      jellyfinService.configure('', '', '');
      
      // Reset UI state
      this.sonarrConnected = false;
      this.radarrConnected = false;
      this.plexConnected = false;
      this.jellyfinConnected = false;
      this.series = [];
      this.movies = [];
      this.recentlyWatchedMovies = [];
      this.recentlyWatchedShows = [];
      this.jellyfinRecentlyWatchedMovies = [];
      this.jellyfinRecentlyWatchedShows = [];
      this.showSonarrConnect = false;
      this.showRadarrConnect = false;
      this.showPlexConnect = false;
      this.showJellyfinConnect = false;
      this.activeTab = 'tv-recommendations';
    }
  }
}
</script>

<style>
:root {
  /* Light theme (default) */
  --bg-color: #f5f5f5;
  --main-bg-color: #ffffff;
  --text-color: #2c3e50;
  --header-color: #2c3e50;
  --border-color: #ddd;
  --card-bg-color: #ffffff;
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  --nav-bg-color: #2c3e50;
  --nav-text-color: #ccc;
  --nav-active-bg: rgba(255, 255, 255, 0.2);
  --nav-hover-bg: rgba(255, 255, 255, 0.1);
  --nav-active-text: #ffffff;
  --input-bg: #ffffff;
  --input-border: #ddd;
  --input-text: #333;
  --button-primary-bg: #4CAF50;
  --button-primary-text: white;
  --button-secondary-bg: #f0f0f0;
  --button-secondary-text: #333;
  
  /* Transition for theme changes */
  --transition-speed: 0.3s;
}

body.dark-theme {
  /* Dark theme */
  --bg-color: #1a1a1a;
  --main-bg-color: #2a2a2a;
  --text-color: #e0e0e0;
  --header-color: #e0e0e0;
  --border-color: #444;
  --card-bg-color: #333;
  --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  --nav-bg-color: #222;
  --nav-text-color: #aaa;
  --nav-active-bg: rgba(255, 255, 255, 0.15);
  --nav-hover-bg: rgba(255, 255, 255, 0.05);
  --nav-active-text: #ffffff;
  --input-bg: #3a3a3a;
  --input-border: #555;
  --input-text: #e0e0e0;
  --button-primary-bg: #388E3C;
  --button-primary-text: white;
  --button-secondary-bg: #444;
  --button-secondary-text: #e0e0e0;
}

body {
  margin: 0;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--text-color);
}

.app-container {
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 10px;
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .app-container {
    padding: 20px;
  }
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  padding: 20px 0 0 0;
}

@media (min-width: 480px) {
  .app-header {
    margin-bottom: 30px;
  }
}

.logo {
  height: 40px;
  margin-right: 10px;
  transition: filter var(--transition-speed);
}

@media (min-width: 480px) {
  .logo {
    height: 60px;
    margin-right: 15px;
  }
}

body.dark-theme .logo {
  filter: brightness(0.9);
}

h1 {
  margin: 0;
  font-size: 22px;
  color: var(--header-color);
  transition: color var(--transition-speed);
  font-weight: 600;
}

@media (min-width: 480px) {
  h1 {
    font-size: 28px;
  }
}

main {
  background-color: var(--main-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.content {
  min-height: 400px;
}

.choose-service {
  text-align: center;
  margin: 30px 0 20px;
  font-size: 18px;
  color: var(--text-color);
}

.service-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.service-button {
  background-color: var(--card-bg-color);
  border: 2px solid var(--button-primary-bg);
  border-radius: 8px;
  padding: 15px;
  color: var(--text-color);
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
  flex: 1;
  max-width: 250px;
}

@media (min-width: 480px) {
  .service-button {
    padding: 20px 30px;
    font-size: 16px;
  }
}

.service-button:hover {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.service-button.plex-button {
  border-color: #CC7B19; /* Plex orange color */
}

.service-button.plex-button:hover {
  background-color: #CC7B19;
}

.service-button.jellyfin-button {
  border-color: #AA5CC3; /* Jellyfin purple color */
}

.service-button.jellyfin-button:hover {
  background-color: #AA5CC3;
}

.service-button small {
  font-weight: normal;
  opacity: 0.8;
  margin-top: 5px;
  font-size: 12px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.jellyfin-user-modal {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 60vh;
}

.loading-users {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.no-users-found {
  text-align: center;
  padding: 20px;
  color: var(--text-color);
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);
}

.user-item:hover {
  border-color: var(--button-primary-bg);
  background-color: var(--button-secondary-bg);
}

.user-item.selected {
  border-color: var(--button-primary-bg);
  background-color: rgba(76, 175, 80, 0.1);
}

.user-name {
  font-weight: 500;
  color: var(--text-color);
}

.user-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: bold;
}

.user-badge.admin {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.apply-button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 500;
}

.apply-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  background-color: var(--button-secondary-bg);
  border: 1px solid var(--border-color);
  color: var(--button-secondary-text);
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}
</style>
