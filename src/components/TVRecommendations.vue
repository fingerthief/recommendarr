<template>
  <div class="recommendations">
    <h2>TV Show Recommendations</h2>
    
    <div v-if="!openaiConfigured" class="setup-section">
      <h3 class="setup-title">AI Connection Required</h3>
      <p class="info-message">To generate TV show recommendations, you need to configure an AI service first.</p>
      <p class="setup-details">You can use OpenAI, local models (like Ollama or LM Studio), or any OpenAI-compatible API.</p>
      <button 
        @click="goToSettings" 
        class="action-button settings-button"
      >
        Configure AI Service
      </button>
    </div>
    
    <div v-else>
      <div class="actions">
        <div class="recommendations-settings" :class="{ 'collapsed': loading || recommendations.length > 0 || error || recommendationsRequested }">
          <div class="settings-container">
            <div class="settings-header" v-if="loading || recommendations.length > 0 || error || recommendationsRequested" @click="toggleSettings">
              <h3>Configuration <span class="toggle-icon">{{ settingsExpanded ? '▼' : '▶' }}</span></h3>
              <button 
                v-if="!settingsExpanded"
                @click.stop="getRecommendations" 
                :disabled="loading"
                class="action-button small-action-button"
              >
                <span class="desktop-text">{{ loading ? 'Getting...' : 'Get Recommendations' }}</span>
                <span class="mobile-text">{{ loading ? '...' : 'Get Recs' }}</span>
              </button>
            </div>
            <div class="settings-content" :class="{ 'collapsed': !settingsExpanded && (loading || recommendations.length > 0 || error || recommendationsRequested) }" v-if="true">
              <div class="settings-layout">
              <div class="settings-left">
                <div class="info-section">
                  <h3 class="info-section-title">Current Configuration</h3>
                  <div class="model-info">
                    <div class="model-header">
                      <span class="current-model">Model:</span>
                      <button 
                        @click="fetchModels" 
                        class="fetch-models-button"
                        :disabled="fetchingModels"
                        title="Refresh models from API"
                      >
                        <span v-if="fetchingModels" class="loading-icon">⟳</span>
                        <span v-else>⟳</span>
                      </button>
                    </div>
                    <div class="model-select-container">
                      <select v-model="selectedModel" @change="updateModel" class="model-select">
                        <option value="" disabled>{{ modelOptions.length === 0 ? 'No models available' : 'Select a model' }}</option>
                        <option v-for="model in modelOptions" :key="model.id" :value="model.id">{{ model.id }}</option>
                        <option value="custom">Custom/Other...</option>
                      </select>
                      <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>
                      <div class="model-select-custom" v-if="isCustomModel">
                        <input 
                          type="text" 
                          v-model="customModel" 
                          placeholder="Enter model name" 
                          class="custom-model-input"
                          @blur="updateCustomModel"
                          @keyup.enter="updateCustomModel"
                        />
                      </div>
                    </div>
                    
                    <div class="temperature-control">
                      <label for="temperature-slider">Temperature: <span class="temp-value">{{ temperature.toFixed(1) }}</span></label>
                      <div class="slider-container">
                        <div class="temp-labels">
                          <div class="temp-label-right">Creative</div>
                          <input 
                          type="range" 
                          id="temperature-slider"
                          v-model.number="temperature"
                          min="0" 
                          max="1"
                          step="0.1"
                          class="temp-slider"
                          @change="updateTemperature"
                        />
                        <div class="temp-label-left">Precise</div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="library-mode-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="useSampledLibrary" 
                          @change="saveLibraryModePreference"
                        >
                        Use Sampled Library Mode
                      </label>
                      <div class="setting-description">
                        Samples a subset of your library to reduce token usage while still providing relevant recommendations.
                      </div>
                      
                      <div v-if="useSampledLibrary" class="sample-size-control">
                        <label for="sampleSizeSlider">Sample size: <span class="count-display">{{ sampleSize }}</span></label>
                        <div class="slider-container sample-slider-container">
                          <input 
                            type="range" 
                            id="sampleSizeSlider"
                            v-model.number="sampleSize"
                            min="5" 
                            max="50"
                            class="count-slider"
                            @change="saveSampleSize"
                          >
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="history-info">
                    <span>{{ previousRecommendations.length }} shows in history</span>
                    <button 
                      v-if="previousRecommendations.length > 0" 
                      @click="clearRecommendationHistory" 
                      class="clear-history-button"
                      title="Clear recommendation history"
                    >
                      Clear History
                    </button>
                  </div>
                </div>
                
                <div class="count-selector">
                  <label for="recommendationsSlider">Number of recommendations: <span class="count-display">{{ numRecommendations }}</span></label>
                  <div class="slider-container">
                    <input 
                      type="range" 
                      id="recommendationsSlider"
                      v-model.number="numRecommendations"
                      min="1" 
                      max="50"
                      class="count-slider"
                      @change="saveRecommendationCount"
                    >
                  </div>
                </div>
                
                <div class="count-selector">
                  <label for="columnsSlider">Posters per row: <span class="count-display">{{ columnsCount }}</span></label>
                  <div class="slider-container">
                    <input 
                      type="range" 
                      id="columnsSlider"
                      v-model.number="columnsCount"
                      min="1" 
                      max="4"
                      class="count-slider"
                      @change="saveColumnsCount"
                    >
                  </div>
                </div>
              </div>
              
              <div class="settings-right">
                <div class="genre-selector">
                  <label>Genre preferences:</label>
                  <div class="genre-checkboxes">
                    <div class="genre-checkbox-item" v-for="genre in availableGenres" :key="genre.value">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          :value="genre.value" 
                          v-model="selectedGenres"
                          @change="saveGenrePreference"
                        >
                        {{ genre.label }}
                      </label>
                    </div>
                    <div v-if="selectedGenres.length > 0" class="selected-genres-summary">
                      <div class="selected-genres-count">{{ selectedGenres.length }} genre{{ selectedGenres.length > 1 ? 's' : '' }} selected</div>
                      <button @click="clearGenres" class="clear-genres-button">Clear All</button>
                    </div>
                  </div>
                </div>
                
                <div class="vibe-selector">
                  <label for="customVibe">Specify a vibe/mood:</label>
                  <div class="vibe-input-container">
                    <input 
                      type="text" 
                      id="customVibe" 
                      v-model="customVibe"
                      @change="saveCustomVibe"
                      placeholder="e.g., cozy mysteries, dark comedy, mind-bending, nostalgic 90s feel"
                      class="vibe-input"
                    >
                    <button 
                      v-if="customVibe" 
                      @click="clearCustomVibe" 
                      class="clear-vibe-button"
                      title="Clear vibe"
                    >×</button>
                  </div>
                  <div class="setting-description">
                    Specify the mood or "vibe" you're looking for to guide the recommendations.
                  </div>
                </div>
                
                <div class="language-selector">
                  <label for="languageSelect">Content language:</label>
                  <select 
                    id="languageSelect" 
                    v-model="selectedLanguage"
                    @change="saveLanguagePreference"
                    class="language-select"
                  >
                    <option value="">Any language</option>
                    <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
                      {{ lang.name }}
                    </option>
                  </select>
                  <div class="setting-description">
                    Select a language to focus recommendations on content in that language.
                  </div>
                </div>
                
                <div v-if="plexConfigured" class="plex-options">
                  <label>Plex Watch History:</label>
                  <div class="plex-history-toggle">
                    <label class="toggle-option">
                      <input 
                        type="radio" 
                        v-model="plexHistoryMode" 
                        value="all"
                        @change="savePlexHistoryMode"
                      >
                      All watch history
                    </label>
                    <label class="toggle-option">
                      <input 
                        type="radio" 
                        v-model="plexHistoryMode" 
                        value="recent"
                        @change="savePlexHistoryMode"
                      >
                      Recent (30 days)
                    </label>
                  </div>
                  
                  <div class="plex-only-toggle">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="plexOnlyMode" 
                        @change="savePlexOnlyMode"
                      >
                      Use only Plex history for recommendations (ignore library)
                    </label>
                  </div>
                  
                </div>
                
                <div v-if="jellyfinConfigured" class="jellyfin-options">
                  <label>Jellyfin Watch History:</label>
                  <div class="jellyfin-history-toggle">
                    <label class="toggle-option">
                      <input 
                        type="radio" 
                        v-model="jellyfinHistoryMode" 
                        value="all"
                        @change="saveJellyfinHistoryMode"
                      >
                      All watch history
                    </label>
                    <label class="toggle-option">
                      <input 
                        type="radio" 
                        v-model="jellyfinHistoryMode" 
                        value="recent"
                        @change="saveJellyfinHistoryMode"
                      >
                      Recent (30 days)
                    </label>
                  </div>
                  
                  <div class="jellyfin-only-toggle">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="jellyfinOnlyMode" 
                        @change="saveJellyfinOnlyMode"
                      >
                      Use only Jellyfin history for recommendations (ignore library)
                    </label>
                  </div>
                  
                  <button 
                    class="jellyfin-user-select-button action-button small-button"
                    @click="$emit('openJellyfinUserSelect')"
                  >
                    Change User
                  </button>
                </div>
                
                <div v-if="tautulliConfigured" class="tautulli-options">
                  <label>Tautulli Watch History:</label>
                  <div class="tautulli-history-toggle">
                    <label class="toggle-option">
                      <input 
                        type="radio" 
                        v-model="tautulliHistoryMode" 
                        value="all"
                        @change="saveTautulliHistoryMode"
                      >
                      All watch history
                    </label>
                    <label class="toggle-option">
                      <input 
                        type="radio" 
                        v-model="tautulliHistoryMode" 
                        value="recent"
                        @change="saveTautulliHistoryMode"
                      >
                      Recent (30 days)
                    </label>
                  </div>
                  
                  <div class="tautulli-only-toggle">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox" 
                        v-model="tautulliOnlyMode" 
                        @change="saveTautulliOnlyMode"
                      >
                      Use only Tautulli history for recommendations (ignore library)
                    </label>
                  </div>
                  
                  <button 
                    class="action-button tautulli-user-select-button"
                    @click="$emit('openTautulliUserSelect')"
                    style="padding: 6px 12px; font-size: 13px; background-color: #7c3aed; color: white;"
                  >
                    Change User
                  </button>
                </div>
              </div>
            </div>
            
            <div class="action-button-container">
              <button 
                @click="getRecommendations" 
                :disabled="loading"
                class="action-button fun-button"
              >
                <span class="button-content">
                  <span class="button-icon">📺</span>
                  <span class="button-text">{{ loading ? 'Finding TV Treasures...' : 'Discover TV Treasures!' }}</span>
                  <span class="button-icon">✨</span>
                </span>
                <span class="button-glow"></span>
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <div class="loading-content">
          <p class="loading-message">{{ currentLoadingMessage }}</p>
          <p class="recommendation-counter" :class="{'initializing': recommendations.length === 0}">
            <span v-if="recommendations.length > 0">
              Found {{ recommendations.length }} of {{ numRecommendations }} recommendations
            </span>
            <span v-else>
              Processing initial request...
            </span>
          </p>
        </div>
      </div>
      
      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <div class="action-button-container">
          <button 
            @click="getRecommendations" 
            :disabled="loading"
            class="action-button retry-button"
          >
            Retry
          </button>
        </div>
      </div>
      
      <div v-else-if="recommendations.length > 0" class="recommendation-list" :style="gridStyle">
        <div v-for="(rec, index) in recommendations" :key="index" class="recommendation-card">
          <!-- Clean title for poster lookup -->
          <div class="card-content">
            <div class="poster-container">
              <div 
                class="poster" 
                :style="getPosterStyle(rec.title)"
                :title="rec.title"
              >
                <div v-if="!hasPoster(rec.title)" class="title-fallback">
                  {{ getInitials(rec.title) }}
                </div>
                <button 
                  v-if="isPosterFallback(rec.title)" 
                  class="retry-poster-button" 
                  :class="{ 'loading': loadingPosters.get(cleanTitle(rec.title)) }"
                  @click.stop="retryPoster(rec.title)"
                  title="Retry loading poster"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 12c0 6.075-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1s11 4.925 11 11z"/>
                    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                    <path d="M12 8v4l3 3"/>
                    <path d="M7 6.7l1.5 1.5M17 6.7L15.5 8.2M7 17.3l1.5-1.5M17 17.3l-1.5-1.5"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="details-container">
              <div class="card-header">
                <h3>{{ rec.title }}</h3>
                <div class="card-actions">
                  <div class="like-dislike-buttons">
                    <button 
                      @click="likeRecommendation(rec.title)" 
                      class="action-btn like-btn"
                      :class="{'active': isLiked(rec.title)}"
                      title="Like this recommendation">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                    </button>
                    <button 
                      @click="dislikeRecommendation(rec.title)" 
                      class="action-btn dislike-btn"
                      :class="{'active': isDisliked(rec.title)}"
                      title="Dislike this recommendation">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm10-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                      </svg>
                    </button>
                  </div>
                  <button 
                    @click="requestSeries(rec.title)" 
                    class="request-button compact"
                    :class="{'loading': requestingSeries === rec.title, 'requested': requestStatus[rec.title]?.success}"
                    :disabled="requestingSeries || requestStatus[rec.title]?.success">
                    <span v-if="requestingSeries === rec.title">
                      <div class="small-spinner"></div>
                    </span>
                    <span v-else-if="requestStatus[rec.title]?.success">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                    <span v-else>Add</span>
                  </button>
                </div>
              </div>
              
              <div class="content-container">
                <div v-if="rec.description" class="description">
                  <span class="label">Description:</span>
                  <p>{{ rec.description }}</p>
                </div>
                
                <div v-if="rec.reasoning" class="reasoning">
                  <span class="label">Why you might like it:</span>
                  <p>{{ rec.reasoning }}</p>
                </div>
                
                <div v-if="rec.rating" class="rating">
                  <div class="rating-header">
                    <span class="label">
                      Recommendarr Rating:
                      <span class="info-tooltip" title="This is an experimental AI-generated rating based on various sources and not an official score.">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </span>
                    </span>
                    <div class="rating-score" :class="getScoreClass(rec.rating)">
                      {{ extractScore(rec.rating) }}%
                    </div>
                  </div>
                  <div class="rating-details">
                    {{ extractRatingDetails(rec.rating) }}
                  </div>
                </div>
                
                
                <div v-if="!rec.description && !rec.reasoning" class="full-text">
                  <p>{{ rec.fullText }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="recommendationsRequested" class="no-recommendations">
        <p>No recommendations could be generated. Try again or check your TV show library.</p>
        <div class="action-button-container">
          <button 
            @click="getRecommendations" 
            :disabled="loading"
            class="action-button retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  </div>
    <!-- Season Selection Modal -->
    <div v-if="showSeasonModal && currentSeries" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add "{{ currentSeries.title }}" to Sonarr</h3>
          <button class="modal-close" @click="closeSeasonModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="modal-section">
            <h4>Select seasons to monitor:</h4>
            
            <div class="select-all">
              <label>
                <input 
                  type="checkbox" 
                  :checked="selectedSeasons.length === currentSeries.seasons.length"
                  @click="toggleAllSeasons"
                > 
                Select All Seasons
              </label>
            </div>
            
            <div class="seasons-grid">
              <div 
                v-for="season in currentSeries.seasons" 
                :key="season.seasonNumber"
                class="season-item"
              >
                <label>
                  <input 
                    type="checkbox" 
                    :value="season.seasonNumber"
                    :checked="selectedSeasons.includes(season.seasonNumber)"
                    @click="toggleSeason(season.seasonNumber)"
                  >
                  Season {{ season.seasonNumber }}
                  <span v-if="season.statistics" class="episode-count">
                    ({{ season.statistics.episodeCount }} episodes)
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div class="modal-section">
            <h4>Quality & Storage Settings:</h4>
            
            <div class="loading-indicator" v-if="loadingFolders">
              <div class="small-spinner"></div>
              <span>Loading options...</span>
            </div>
            
            <div class="settings-grid" v-else>
              <div class="setting-item">
                <label for="rootFolder">Save Location:</label>
                <select 
                  id="rootFolder" 
                  v-model="selectedRootFolder"
                  class="setting-select"
                >
                  <option v-for="folder in rootFolders" :key="folder.id" :value="folder.path">
                    {{ folder.path }} ({{ formatFreeSpace(folder.freeSpace) }} free)
                  </option>
                </select>
              </div>
              
              <div class="setting-item">
                <label for="qualityProfile">Quality Profile:</label>
                <select 
                  id="qualityProfile" 
                  v-model="selectedQualityProfile"
                  class="setting-select"
                >
                  <option v-for="profile in qualityProfiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-button" @click="closeSeasonModal">Cancel</button>
          <button 
            class="confirm-button" 
            @click="confirmAddSeries"
            :disabled="!selectedSeasons.length || loadingFolders"
          >
            Add to Sonarr
          </button>
        </div>
      </div>
    </div>
  </template>

<script>
import openAIService from '../services/OpenAIService';
import imageService from '../services/ImageService';
import sonarrService from '../services/SonarrService';
import axios from 'axios';

export default {
  name: 'TVRecommendations',
  components: {
  },
  props: {
    series: {
      type: Array,
      required: true
    },
    sonarrConfigured: {
      type: Boolean,
      required: true
    },
    recentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    jellyfinRecentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    plexConfigured: {
      type: Boolean,
      default: false
    },
    jellyfinConfigured: {
      type: Boolean,
      default: false
    },
    tautulliConfigured: {
      type: Boolean,
      default: false
    },
    tautulliRecentlyWatchedShows: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    gridStyle() {
      // Use a different column count for mobile screens
      const isMobile = window.innerWidth <= 600;
      const effectiveColumnCount = isMobile ? 1 : this.columnsCount;
      
      return {
        gridTemplateColumns: `repeat(${effectiveColumnCount}, 1fr)`
      };
    }
  },
  data() {
    return {
      openaiConfigured: false,
      recommendations: [],
      loading: false,
      error: null,
      recommendationsRequested: false,
      posters: new Map(), // Using a reactive Map for poster URLs
      loadingPosters: new Map(), // Track which posters are being loaded
      numRecommendations: 5, // Default number of recommendations to request
      columnsCount: 2, // Default number of posters per row
      selectedGenres: [], // Multiple genre selections
      customVibe: '', // Custom vibe/mood input from user
      plexHistoryMode: 'all', // 'all' or 'recent'
      plexOnlyMode: false, // Whether to use only Plex history for recommendations
      jellyfinHistoryMode: 'all', // 'all' or 'recent'
      jellyfinOnlyMode: false, // Whether to use only Jellyfin history for recommendations
      tautulliHistoryMode: 'all', // 'all' or 'recent'
      tautulliOnlyMode: false, // Whether to use only Tautulli history for recommendations
      useSampledLibrary: false, // Whether to use sampled library or full library
      sampleSize: 20, // Default sample size when using sampled library
      rootFolders: [], // Available Sonarr root folders
      qualityProfiles: [], // Available Sonarr quality profiles
      selectedRootFolder: null, // Selected root folder for series
      selectedQualityProfile: null, // Selected quality profile for series
      loadingFolders: false, // Loading status for folders
      funLoadingMessages: [
        "Consulting with TV critics from alternate dimensions...",
        "Analyzing your taste in shows (don't worry, we won't judge)...",
        "Sorting through the multiverse for the perfect shows...",
        "Bribing streaming algorithms for insider information...",
        "Converting caffeine into recommendations...",
        "Feeding your watchlist to our recommendation hamsters...",
        "Searching for shows that won't be cancelled after season 1...",
        "Scanning for hidden gems buried under streaming algorithms...",
        "Asking your future self what shows you'll love...",
        "Calculating the perfect binge-watching schedule...",
        "Digging through the golden age of television...",
        "Filtering out shows with disappointing endings...",
        "Picking shows that will make you say 'just one more episode'...",
        "Consulting with the TV psychics for your next obsession...",
        "Brewing a perfect blend of recommendations...",
        "Decoding the secret sauce of great television...",
        "Sending scouts to the corners of the streaming universe...",
        "Finding shows that will make you forget to check your phone...",
        "Extracting hidden patterns from your viewing history...",
        "Teaching the AI to understand the concept of 'binge-worthy'..."
      ],
      currentLoadingMessage: "",  // Current displayed loading message
      loadingMessageInterval: null, // For rotating messages
      availableGenres: [
        { value: 'action', label: 'Action' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'animation', label: 'Animation' },
        { value: 'anime', label: 'Anime' },
        { value: 'comedy', label: 'Comedy' },
        { value: 'crime', label: 'Crime' },
        { value: 'documentary', label: 'Documentary' },
        { value: 'drama', label: 'Drama' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'horror', label: 'Horror' },
        { value: 'mystery', label: 'Mystery' },
        { value: 'niche', label: 'Niche' },
        { value: 'romance', label: 'Romance' },
        { value: 'sci-fi', label: 'Sci-Fi' },
        { value: 'thriller', label: 'Thriller' }
      ],
      availableLanguages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' },
        { code: 'hi', name: 'Hindi' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'tr', name: 'Turkish' },
        { code: 'da', name: 'Danish' },
        { code: 'sv', name: 'Swedish' },
        { code: 'no', name: 'Norwegian' },
        { code: 'fi', name: 'Finnish' },
        { code: 'nl', name: 'Dutch' },
        { code: 'pl', name: 'Polish' }
      ],
      selectedLanguage: '',
      requestingSeries: null, // Track which series is being requested
      requestStatus: {}, // Track request status for each series
      previousRecommendations: [], // Track previous recommendations to avoid duplicates
      likedRecommendations: [], // TV shows that user has liked
      dislikedRecommendations: [], // TV shows that user has disliked
      maxStoredRecommendations: 500, // Maximum number of previous recommendations to store
      showSeasonModal: false, // Control visibility of season selection modal
      currentSeries: null, // Current series being added
      selectedSeasons: [], // Selected seasons for the current series
      selectedModel: '', // Current selected model
      customModel: '', // For custom model input
      isCustomModel: false, // Whether the custom model input is visible
      modelOptions: [], // Available models from API
      fetchingModels: false, // Loading state for fetching models
      fetchError: null, // Error when fetching models
      settingsExpanded: false, // Controls visibility of settings panel
      temperature: 0.5 // AI temperature parameter
    };
  },
  methods: {
    goToSettings() {
      this.$emit('navigate', 'settings');
    },
    
    toggleSettings() {
      this.settingsExpanded = !this.settingsExpanded;
      
      // Add animation classes
      if (this.settingsExpanded) {
        // Animate opening
        const settingsPanel = document.querySelector('.settings-content');
        if (settingsPanel) {
          settingsPanel.style.transition = 'max-height 0.3s ease-in, opacity 0.3s ease-in, transform 0.3s ease-in';
          settingsPanel.style.maxHeight = '2000px';
          settingsPanel.style.opacity = '1';
          settingsPanel.style.transform = 'translateY(0)';
        }
      } else {
        // Animate closing
        const settingsPanel = document.querySelector('.settings-content');
        if (settingsPanel) {
          settingsPanel.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out';
          settingsPanel.style.maxHeight = '0';
          settingsPanel.style.opacity = '0';
          settingsPanel.style.transform = 'translateY(-20px)';
        }
      }
    },
    // Clean title for consistent poster lookup
    cleanTitle(title) {
      return title.replace(/[:.!?]+$/, '').trim();
    },
    
    // Check if we have a poster for this title
    hasPoster(title) {
      const clean = this.cleanTitle(title);
      return this.posters.has(clean);
    },
    
    // Check if poster is a fallback and should have retry button
    isPosterFallback(title) {
      const clean = this.cleanTitle(title);
      const posterUrl = this.posters.get(clean);
      
      // If it's loading, don't show retry button
      if (this.loadingPosters.get(clean)) {
        return false;
      }
      
      // If we have a poster URL and it's an SVG data URL (our fallback)
      return posterUrl && posterUrl.startsWith('data:image/svg+xml;base64,');
    },
    
    // Retry loading a poster for a specific title
    async retryPoster(title) {
      const clean = this.cleanTitle(title);
      
      // Set loading state for this poster
      this.loadingPosters.set(clean, true);
      
      try {
        // Try to get the poster with cache disabled
        const posterUrl = await imageService.getPosterForShow(clean, true);
        
        if (posterUrl) {
          // Update poster in state
          this.posters.set(clean, posterUrl);
        } else {
          // If still no poster, set fallback
          this.posters.set(clean, imageService.getFallbackImageUrl(clean));
        }
      } catch (error) {
        console.error(`Error retrying poster for "${clean}":`, error);
        // Keep fallback in case of error
        this.posters.set(clean, imageService.getFallbackImageUrl(clean));
      } finally {
        // Clear loading state
        this.loadingPosters.delete(clean);
      }
    },
    
    // Get poster style for CSS
    getPosterStyle(title) {
      const clean = this.cleanTitle(title);
      const posterUrl = this.posters.get(clean);
      
      if (posterUrl) {
        return { backgroundImage: `url(${posterUrl})` };
      }
      
      // Generate fallback color
      const hash = this.simpleHash(clean);
      const hue = hash % 360;
      return { backgroundColor: `hsl(${hue}, 70%, 40%)` };
    },
    
    // Get initials for fallback display
    getInitials(title) {
      if (!title) return '';
      
      return title
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0].toUpperCase())
        .slice(0, 2)
        .join('');
    },
    
    // Simple hash function for consistent colors
    simpleHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
    },
    
    // Extract just the numeric score from the rating text
    extractScore(ratingText) {
      if (!ratingText || ratingText === 'N/A') {
        return '??';
      }
      
      // Try to extract score percentage
      const scoreMatch = ratingText.match(/(\d+)%/);
      if (!scoreMatch) {
        return '??';
      }
      
      return scoreMatch[1];
    },
    
    // Extract the details portion of the rating
    extractRatingDetails(ratingText) {
      if (!ratingText || ratingText === 'N/A') {
        return 'No rating information available';
      }
      
      // Find everything after the percentage
      const detailsMatch = ratingText.match(/\d+%\s*-\s*(.*)/);
      if (detailsMatch && detailsMatch[1]) {
        return detailsMatch[1].trim();
      }
      
      return ratingText;
    },
    
    // Determine CSS class for Recommendarr Rating
    getScoreClass(scoreText) {
      if (!scoreText || scoreText === 'N/A') {
        return 'score-unknown';
      }
      
      // Try to extract score percentage
      const scoreMatch = scoreText.match(/(\d+)%/);
      if (!scoreMatch) {
        return 'score-unknown';
      }
      
      const score = parseInt(scoreMatch[1], 10);
      
      // Apply our rating scale
      if (score >= 90) {
        return 'score-certified'; // Excellent
      } else if (score >= 70) {
        return 'score-fresh'; // Good
      } else if (score >= 50) {
        return 'score-rotten'; // Average
      } else {
        return 'score-unknown'; // Below average
      }
    },
    // Save recommendation count to localStorage
    saveRecommendationCount() {
      localStorage.setItem('numRecommendations', this.numRecommendations);
    },
    
    // Save columns count to localStorage
    saveColumnsCount() {
      localStorage.setItem('columnsCount', this.columnsCount);
    },
    
    // Save genre preferences to localStorage when they change
    saveGenrePreference() {
      localStorage.setItem('tvGenrePreferences', JSON.stringify(this.selectedGenres));
    },
    
    // Clear all selected genres
    clearGenres() {
      this.selectedGenres = [];
      this.saveGenrePreference();
    },
    
    // Save custom vibe preference to localStorage
    saveCustomVibe() {
      localStorage.setItem('tvCustomVibe', this.customVibe);
    },
    
    // Clear custom vibe input
    clearCustomVibe() {
      this.customVibe = '';
      this.saveCustomVibe();
    },
    
    // Save language preference to localStorage
    saveLanguagePreference() {
      localStorage.setItem('tvLanguagePreference', this.selectedLanguage);
    },
    
    // Save Plex history mode preference
    savePlexHistoryMode() {
      localStorage.setItem('plexHistoryMode', this.plexHistoryMode);
      this.$emit('plexHistoryModeChanged', this.plexHistoryMode);
    },
    
    // Save Jellyfin history mode preference
    saveJellyfinHistoryMode() {
      localStorage.setItem('jellyfinHistoryMode', this.jellyfinHistoryMode);
      this.$emit('jellyfinHistoryModeChanged', this.jellyfinHistoryMode);
    },
    
    // Save Plex only mode preference
    savePlexOnlyMode() {
      localStorage.setItem('plexOnlyMode', this.plexOnlyMode.toString());
      
      // If enabling Plex only mode, disable Jellyfin only mode
      if (this.plexOnlyMode && this.jellyfinOnlyMode) {
        this.jellyfinOnlyMode = false;
        localStorage.setItem('jellyfinOnlyMode', 'false');
        this.$emit('jellyfinOnlyModeChanged', false);
      }
      
      this.$emit('plexOnlyModeChanged', this.plexOnlyMode);
    },
    
    // Save Jellyfin only mode preference
    saveJellyfinOnlyMode() {
      localStorage.setItem('jellyfinOnlyMode', this.jellyfinOnlyMode.toString());
      
      // If enabling Jellyfin only mode, disable Plex only mode and Tautulli only mode
      if (this.jellyfinOnlyMode) {
        if (this.plexOnlyMode) {
          this.plexOnlyMode = false;
          localStorage.setItem('plexOnlyMode', 'false');
          this.$emit('plexOnlyModeChanged', false);
        }
        if (this.tautulliOnlyMode) {
          this.tautulliOnlyMode = false;
          localStorage.setItem('tautulliOnlyMode', 'false');
          this.$emit('tautulliOnlyModeChanged', false);
        }
      }
      
      this.$emit('jellyfinOnlyModeChanged', this.jellyfinOnlyMode);
    },
    
    // Save Tautulli history mode preference
    saveTautulliHistoryMode() {
      localStorage.setItem('tautulliHistoryMode', this.tautulliHistoryMode);
      this.$emit('tautulliHistoryModeChanged', this.tautulliHistoryMode);
    },
    
    // Save Tautulli only mode preference
    saveTautulliOnlyMode() {
      localStorage.setItem('tautulliOnlyMode', this.tautulliOnlyMode.toString());
      
      // If enabling Tautulli only mode, disable Plex only mode and Jellyfin only mode
      if (this.tautulliOnlyMode) {
        if (this.plexOnlyMode) {
          this.plexOnlyMode = false;
          localStorage.setItem('plexOnlyMode', 'false');
          this.$emit('plexOnlyModeChanged', false);
        }
        if (this.jellyfinOnlyMode) {
          this.jellyfinOnlyMode = false;
          localStorage.setItem('jellyfinOnlyMode', 'false');
          this.$emit('jellyfinOnlyModeChanged', false);
        }
      }
      
      this.$emit('tautulliOnlyModeChanged', this.tautulliOnlyMode);
    },
    
    // Save previous recommendations to localStorage
    savePreviousRecommendations() {
      localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousRecommendations));
    },
    
    // Add current recommendations to the history
    addToRecommendationHistory(newRecommendations) {
      // Extract just the titles for storage
      const titlesToAdd = newRecommendations.map(rec => rec.title);
      
      // Combine with existing recommendations, remove duplicates
      const combinedRecommendations = [...this.previousRecommendations, ...titlesToAdd];
      
      // Keep only unique recommendations
      const uniqueRecommendations = [...new Set(combinedRecommendations)];
      
      // If over the limit, remove oldest recommendations
      if (uniqueRecommendations.length > this.maxStoredRecommendations) {
        this.previousRecommendations = uniqueRecommendations.slice(
          uniqueRecommendations.length - this.maxStoredRecommendations
        );
      } else {
        this.previousRecommendations = uniqueRecommendations;
      }
      
      // Save to localStorage
      this.savePreviousRecommendations();
    },
    
    // Clear recommendation history
    clearRecommendationHistory() {
      // Ask for confirmation
      if (confirm(`Clear your history of ${this.previousRecommendations.length} previously recommended shows?`)) {
        this.previousRecommendations = [];
        this.savePreviousRecommendations();
      }
    },
    
    // Update the model selection
    updateModel() {
      if (this.selectedModel === 'custom') {
        this.isCustomModel = true;
        // If we already have a custom model set, use that as the initial value
        if (openAIService.model && !this.availableModels.includes(openAIService.model)) {
          this.customModel = openAIService.model;
        }
      } else {
        this.isCustomModel = false;
        // Save the selected model
        localStorage.setItem('openaiModel', this.selectedModel);
        openAIService.model = this.selectedModel;
      }
    },
    
    // Update the custom model name
    updateCustomModel() {
      if (this.customModel.trim()) {
        localStorage.setItem('openaiModel', this.customModel);
        openAIService.model = this.customModel;
      }
    },
    
    // Update temperature and save to localStorage
    updateTemperature() {
      // Save to localStorage
      localStorage.setItem('aiTemperature', this.temperature.toString());
      
      // Update in OpenAI service
      openAIService.temperature = this.temperature;
    },
    
    // Save library mode preference to localStorage
    saveLibraryModePreference() {
      localStorage.setItem('useSampledLibrary', this.useSampledLibrary.toString());
      openAIService.useSampledLibrary = this.useSampledLibrary;
    },
    
    // Save sample size to localStorage
    saveSampleSize() {
      localStorage.setItem('librarySampleSize', this.sampleSize.toString());
      openAIService.sampleSize = this.sampleSize;
    },
    
    // Fetch available models from the API
    async fetchModels() {
      if (!openAIService.isConfigured()) {
        this.fetchError = 'API service is not configured. Please set up your API key first.';
        return;
      }
      
      this.fetchingModels = true;
      this.fetchError = null;
      
      try {
        // Use the baseUrl from OpenAIService to build the models endpoint
        const modelsEndpoint = `${openAIService.baseUrl}/models`;
        
        // Set up headers based on the API endpoint
        const headers = {};
        
        // Add authentication header based on the API endpoint
        if (openAIService.baseUrl === 'https://api.anthropic.com/v1') {
          headers['x-api-key'] = openAIService.apiKey;
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          headers['anthropic-version'] = '2023-06-01';
        } else {
          headers['Authorization'] = `Bearer ${openAIService.apiKey}`;
        }
        
        const response = await axios.get(modelsEndpoint, { headers });
        
        if (response.data && response.data.data) {
          // Get the list of models
          this.modelOptions = response.data.data;
          
          // Sort models alphabetically
          this.modelOptions.sort((a, b) => a.id.localeCompare(b.id));
        } else {
          this.fetchError = 'Invalid response format from API';
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        this.fetchError = error.response?.data?.error?.message || 
                         'Failed to fetch models. Check your API key and URL.';
      } finally {
        this.fetchingModels = false;
      }
    },
    
    // Like a TV show recommendation
    likeRecommendation(title) {
      // If it's already liked, remove it from liked list (toggle behavior)
      if (this.isLiked(title)) {
        this.likedRecommendations = this.likedRecommendations.filter(item => item !== title);
      } else {
        // Add to liked list
        this.likedRecommendations.push(title);
        
        // Remove from disliked list if it was there
        if (this.isDisliked(title)) {
          this.dislikedRecommendations = this.dislikedRecommendations.filter(item => item !== title);
        }
      }
      
      // Save to localStorage
      this.saveLikedDislikedLists();
    },
    
    // Dislike a TV show recommendation
    dislikeRecommendation(title) {
      // If it's already disliked, remove it from disliked list (toggle behavior)
      if (this.isDisliked(title)) {
        this.dislikedRecommendations = this.dislikedRecommendations.filter(item => item !== title);
      } else {
        // Add to disliked list
        this.dislikedRecommendations.push(title);
        
        // Remove from liked list if it was there
        if (this.isLiked(title)) {
          this.likedRecommendations = this.likedRecommendations.filter(item => item !== title);
        }
      }
      
      // Save to localStorage
      this.saveLikedDislikedLists();
    },
    
    // Check if a TV show is liked
    isLiked(title) {
      return this.likedRecommendations.includes(title);
    },
    
    // Check if a TV show is disliked
    isDisliked(title) {
      return this.dislikedRecommendations.includes(title);
    },
    
    // Save liked and disliked lists to localStorage
    saveLikedDislikedLists() {
      localStorage.setItem('likedTVRecommendations', JSON.stringify(this.likedRecommendations));
      localStorage.setItem('dislikedTVRecommendations', JSON.stringify(this.dislikedRecommendations));
    },
    
    /**
     * Start the rotating loading message animation
     */
    startLoadingMessages() {
      // Set initial message
      let baseMessage = 'Analyzing your TV show library and generating recommendations...';
      
      if (this.plexOnlyMode) {
        baseMessage = 'Analyzing your Plex watch history...';
      } else if (this.jellyfinOnlyMode) {
        baseMessage = 'Analyzing your Jellyfin watch history...';
      } else if (this.plexConfigured && this.jellyfinConfigured) {
        baseMessage = 'Analyzing your TV show library, Plex and Jellyfin watch history...';
      } else if (this.plexConfigured) {
        baseMessage = 'Analyzing your TV show library and Plex watch history...';
      } else if (this.jellyfinConfigured) {
        baseMessage = 'Analyzing your TV show library and Jellyfin watch history...';
      }
      
      this.currentLoadingMessage = baseMessage;
      
      // Clear any existing interval
      if (this.loadingMessageInterval) {
        clearInterval(this.loadingMessageInterval);
      }
      
      // Start a new interval to rotate through fun messages
      let lastIndex = -1;
      this.loadingMessageInterval = setInterval(() => {
        // Every other time, show the base message
        if (Math.random() > 0.5) {
          this.currentLoadingMessage = baseMessage;
          return;
        }
        
        // Get a random fun message that's different from the last one
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * this.funLoadingMessages.length);
        } while (randomIndex === lastIndex && this.funLoadingMessages.length > 1);
        
        lastIndex = randomIndex;
        this.currentLoadingMessage = this.funLoadingMessages[randomIndex];
      }, 10000); // Change message every 10 seconds
    },
    
    /**
     * Stop the rotating loading message animation
     */
    stopLoadingMessages() {
      if (this.loadingMessageInterval) {
        clearInterval(this.loadingMessageInterval);
        this.loadingMessageInterval = null;
      }
    },
    
    async getRecommendations() {
      // Verify we have a series list and OpenAI is configured
      if (!this.sonarrConfigured) {
        this.error = 'You need to connect to Sonarr first to get recommendations based on your library.';
        return;
      }
      
      if (this.series.length === 0) {
        this.error = 'Your Sonarr library is empty. Add some TV shows to get recommendations.';
        return;
      }
      
      if (!openAIService.isConfigured()) {
        this.error = 'AI service is not configured. Please provide an API key.';
        return;
      }
      
      // Reset recommendations array to ensure counter starts at 0
      this.recommendations = [];
      
      this.loading = true;
      this.error = null;
      this.recommendationsRequested = true;
      this.settingsExpanded = false; // Collapse settings when getting recommendations
      
      // Start the rotating loading messages
      this.startLoadingMessages();
      
      // Scroll to the top of the loading section
      setTimeout(() => {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
          loadingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      // Add a nice closing animation to the settings panel
      const settingsPanel = document.querySelector('.settings-content');
      if (settingsPanel) {
        settingsPanel.style.transition = 'max-height 0.3s ease-out, opacity 0.3s ease-out, transform 0.3s ease-out';
        settingsPanel.style.overflow = 'hidden';
        settingsPanel.style.maxHeight = '0';
        settingsPanel.style.opacity = '0';
        settingsPanel.style.transform = 'translateY(-20px)';
      }
      
      try {
        // Get recommendations from OpenAI based on Sonarr library with user preferences
        // Convert selectedGenres array to a comma-separated string for the API
        const genreString = this.selectedGenres.length > 0 
          ? this.selectedGenres.join(', ')
          : '';
        
        // Get initial recommendations
        this.recommendations = await openAIService.getRecommendations(
          this.series, 
          this.numRecommendations,
          genreString,
          this.previousRecommendations,
          this.likedRecommendations,
          this.dislikedRecommendations,
          this.plexOnlyMode ? this.recentlyWatchedShows : 
            this.jellyfinOnlyMode ? this.jellyfinRecentlyWatchedShows :
            this.tautulliOnlyMode ? this.tautulliRecentlyWatchedShows :
            [...this.recentlyWatchedShows, ...this.jellyfinRecentlyWatchedShows, ...this.tautulliRecentlyWatchedShows],
          this.plexOnlyMode || this.jellyfinOnlyMode || this.tautulliOnlyMode,
          this.customVibe,
          this.selectedLanguage
        );
        
        // Update loading message to include genres if selected
        const loadingMessage = document.querySelector('.loading p');
        if (loadingMessage && this.selectedGenres.length > 0) {
          let source = 'TV library';
          if (this.plexOnlyMode) {
            source = 'Plex watch history';
          } else if (this.jellyfinOnlyMode) {
            source = 'Jellyfin watch history';
          } else if (this.tautulliOnlyMode) {
            source = 'Tautulli watch history';
          } else if (this.plexConfigured || this.jellyfinConfigured || this.tautulliConfigured) {
            source = 'TV library and watch history';
          }
          
          loadingMessage.textContent = `Analyzing your ${source} and generating ${genreString} recommendations...`;
        }
        
        // Filter out shows that are already in the Sonarr library
        if (this.recommendations.length > 0 && !this.plexOnlyMode && !this.jellyfinOnlyMode && !this.tautulliOnlyMode) {
          this.recommendations = await this.filterExistingShows(this.recommendations);
        }
        
        // If we have fewer recommendations than requested after filtering, get more
        if (this.recommendations.length < this.numRecommendations) {
          await this.getAdditionalRecommendations(this.numRecommendations - this.recommendations.length, genreString);
        }
        
        // Add new recommendations to history
        this.addToRecommendationHistory(this.recommendations);
        
        // Fetch posters for each recommendation
        this.fetchPosters();
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        // Provide a more helpful error message based on the error
        if (error.message && error.message.includes('API')) {
          this.error = error.message;
        } else if (error.response && error.response.data && error.response.data.error) {
          this.error = `API Error: ${error.response.data.error.message || 'Unknown API error'}`;
        } else {
          this.error = 'Failed to get recommendations. Please check your AI service settings and try again.';
        }
        this.recommendations = [];
      } finally {
        // Stop the rotating loading messages
        this.stopLoadingMessages();
        this.loading = false;
      }
    },
    
    /**
     * Get additional recommendations when filtering results in fewer than requested
     * @param {number} additionalCount - Number of additional recommendations needed
     * @param {string} genreString - Genre preferences
     * @param {number} [recursionDepth=0] - Current recursion depth to limit excessive API calls
     */
    async getAdditionalRecommendations(additionalCount, genreString, recursionDepth = 0) {
      if (additionalCount <= 0 || recursionDepth >= 5) return;
      
      console.log(`Getting ${additionalCount} additional recommendations after filtering (recursion depth: ${recursionDepth})`);
      
      // Update base message for the message rotator to use
      const baseMessage = `Getting additional recommendations to match your request...`;
      this.currentLoadingMessage = baseMessage;
      
      try {
        // Get additional recommendations
        // Include current recommendations in the exclusion list
        const currentTitles = this.recommendations.map(rec => rec.title);
        const updatedPrevious = [...new Set([...this.previousRecommendations, ...currentTitles])];
        
        // Request more recommendations than we need to account for filtering
        const requestCount = Math.min(additionalCount * 1.5, 20); // Request 50% more, up to 20 max
        
        // Use the new optimized method for additional recommendations
        const additionalRecommendations = await openAIService.getAdditionalTVRecommendations(
          requestCount,
          updatedPrevious,
          genreString,
          this.customVibe,
          this.selectedLanguage
        );
        
        // Filter the additional recommendations
        let filteredAdditional = additionalRecommendations;
        if (filteredAdditional.length > 0 && !this.plexOnlyMode && !this.jellyfinOnlyMode && !this.tautulliOnlyMode) {
          filteredAdditional = await this.filterExistingShows(filteredAdditional);
        }
        
        // Combine with existing recommendations
        this.recommendations = [...this.recommendations, ...filteredAdditional];
        
        // If we still don't have enough and got some results, try again with incremented recursion depth
        if (this.recommendations.length < this.numRecommendations && filteredAdditional.length > 0) {
          // Calculate how many more we need
          const stillNeeded = this.numRecommendations - this.recommendations.length;
          
          // Recursive call with updated exclusion list and incremented recursion depth
          if (stillNeeded > 0) {
            await this.getAdditionalRecommendations(stillNeeded, genreString, recursionDepth + 1);
          }
        }
      } catch (error) {
        console.error('Error getting additional recommendations:', error);
        
        // Count this as one attempt but continue if we're not at the limit
        if (recursionDepth + 1 < 5) {
          console.log(`Retrying after error (recursion depth: ${recursionDepth + 1})`);
          // Calculate how many we still need
          const stillNeeded = this.numRecommendations - this.recommendations.length;
          if (stillNeeded > 0) {
            // Wait a short time before retrying to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.getAdditionalRecommendations(stillNeeded, genreString, recursionDepth + 1);
          }
        }
      }
    },
    
    /**
     * Filter out shows that already exist in the Sonarr library
     * @param {Array} recommendations - The recommended shows
     * @returns {Promise<Array>} - Filtered recommendations
     */
    async filterExistingShows(recommendations) {
      if (!sonarrService.isConfigured() || !this.series.length) {
        return recommendations;
      }
      
      try {
        // Create a normalized map of existing show titles in the library
        const existingShowTitles = new Set(
          this.series.map(show => show.title.toLowerCase())
        );
        
        // Add liked recommendations to the filter set
        const likedRecommendationTitles = new Set(
          this.likedRecommendations.map(title => title.toLowerCase())
        );
        
        // Add disliked recommendations to the filter set
        const dislikedRecommendationTitles = new Set(
          this.dislikedRecommendations.map(title => title.toLowerCase())
        );
        
        // Add previous recommendations to the filter set
        const previousRecommendationTitles = new Set(
          this.previousRecommendations.map(title => title.toLowerCase())
        );
        
        // Filter out recommendations that already exist in the library, liked list, disliked list, or previous recommendations
        const filteredRecommendations = recommendations.filter(rec => {
          const normalizedTitle = rec.title.toLowerCase();
          return !existingShowTitles.has(normalizedTitle) && 
                 !likedRecommendationTitles.has(normalizedTitle) && 
                 !dislikedRecommendationTitles.has(normalizedTitle) && 
                 !previousRecommendationTitles.has(normalizedTitle);
        });
        
        console.log(`Filtered out ${recommendations.length - filteredRecommendations.length} shows that already exist in the library, liked/disliked lists, or recommendation history`);
        return filteredRecommendations;
      } catch (error) {
        console.error('Error filtering existing shows:', error);
        return recommendations; // Return original list on error
      }
    },
    
    /**
     * Fetch posters for each recommendation in parallel
     */
    async fetchPosters() {
      // Reset posters
      this.posters.clear();
      
      // Create requests for all recommendations
      const posterPromises = this.recommendations.map(async (rec) => {
        try {
          // Extract clean title (removing any punctuation at the end)
          const cleanTitle = rec.title.replace(/[:.!?]+$/, '').trim();
          
          const posterUrl = await imageService.getPosterForShow(cleanTitle);
          
          if (posterUrl) {
            // Update posters state using Map methods
            this.posters.set(cleanTitle, posterUrl);
          } else {
            // Set fallback image
            this.posters.set(cleanTitle, imageService.getFallbackImageUrl(cleanTitle));
          }
        } catch (error) {
          console.error(`Error fetching poster for "${rec.title}":`, error);
          // Fallback image
          this.posters.set(rec.title, imageService.getFallbackImageUrl(rec.title));
        }
      });
      
      // Wait for all requests to complete
      await Promise.all(posterPromises);
    },
    
    /**
     * Format bytes to a human-readable size (KB, MB, GB, etc.)
     * @param {number} bytes - The size in bytes
     * @returns {string} - Formatted size string
     */
    formatFreeSpace(bytes) {
      if (bytes === 0) return '0 B';
      
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      
      return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Fetch root folders and quality profiles from Sonarr
     */
    async fetchFolderAndQualityOptions() {
      if (!sonarrService.isConfigured()) {
        return;
      }
      
      this.loadingFolders = true;
      
      try {
        // Fetch both root folders and quality profiles in parallel
        const [rootFolders, qualityProfiles] = await Promise.all([
          sonarrService.getRootFolders(),
          sonarrService.getQualityProfiles()
        ]);
        
        this.rootFolders = rootFolders;
        this.qualityProfiles = qualityProfiles;
        
        // Set default selections
        if (rootFolders.length > 0) {
          this.selectedRootFolder = rootFolders[0].path;
        }
        
        if (qualityProfiles.length > 0) {
          this.selectedQualityProfile = qualityProfiles[0].id;
        }
      } catch (error) {
        console.error('Error fetching Sonarr settings:', error);
      } finally {
        this.loadingFolders = false;
      }
    },

    /**
     * Open season selection modal for a series
     * @param {string} title - The series title to request
     */
    async openSeasonSelector(title) {
      if (!sonarrService.isConfigured()) {
        this.error = 'Sonarr service is not configured.';
        return;
      }
      
      try {
        // Set requesting state for this series
        this.requestingSeries = title;
        
        // Check if series already exists in Sonarr
        const existingSeries = await sonarrService.findSeriesByTitle(title);
        
        if (existingSeries && existingSeries.id) {
          // Series already exists in library
          this.requestStatus[title] = {
            success: true,
            message: 'Series already exists in your Sonarr library',
            alreadyExists: true
          };
          
          this.requestingSeries = null;
          return;
        }
        
        // Look up series info to get seasons
        const seriesInfo = await sonarrService.lookupSeries(title);
        
        // Set current series and seasons for modal
        this.currentSeries = {
          title: title,
          seasons: seriesInfo.seasons
            .filter(season => season.seasonNumber > 0) // Filter out specials (season 0)
            .sort((a, b) => a.seasonNumber - b.seasonNumber) // Sort by season number
        };
        
        // Set all seasons selected by default
        this.selectedSeasons = this.currentSeries.seasons.map(s => s.seasonNumber);
        
        // Fetch root folders and quality profiles
        await this.fetchFolderAndQualityOptions();
        
        // Show modal
        this.showSeasonModal = true;
        
        // Clear requesting state since modal is now open
        this.requestingSeries = null;
        
      } catch (error) {
        console.error(`Error preparing series "${title}" for Sonarr:`, error);
        
        // Store error
        this.requestStatus[title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
        // Clear requesting state
        this.requestingSeries = null;
      }
    },
    
    /**
     * Toggle selection of a season
     * @param {number} seasonNumber - The season number to toggle
     */
    toggleSeason(seasonNumber) {
      const index = this.selectedSeasons.indexOf(seasonNumber);
      if (index === -1) {
        this.selectedSeasons.push(seasonNumber);
      } else {
        this.selectedSeasons.splice(index, 1);
      }
    },
    
    /**
     * Toggle selection of all seasons
     */
    toggleAllSeasons() {
      if (this.selectedSeasons.length === this.currentSeries.seasons.length) {
        // If all are selected, deselect all
        this.selectedSeasons = [];
      } else {
        // Otherwise, select all
        this.selectedSeasons = this.currentSeries.seasons.map(s => s.seasonNumber);
      }
    },
    
    /**
     * Close the season selection modal
     */
    closeSeasonModal() {
      this.showSeasonModal = false;
      this.currentSeries = null;
      this.selectedSeasons = [];
      this.selectedRootFolder = null;
      this.selectedQualityProfile = null;
      this.rootFolders = [];
      this.qualityProfiles = [];
    },
    
    /**
     * Request a series to be added to Sonarr with selected seasons and options
     */
    async confirmAddSeries() {
      if (!this.currentSeries || !this.selectedSeasons.length) {
        return;
      }
      
      try {
        // Set requesting state
        this.requestingSeries = this.currentSeries.title;
        
        // Close modal
        this.showSeasonModal = false;
        
        // Add series to Sonarr with selected seasons and options
        const response = await sonarrService.addSeries(
          this.currentSeries.title, 
          this.selectedSeasons,
          this.selectedQualityProfile,
          this.selectedRootFolder
        );
        
        // Store success response
        this.requestStatus[this.currentSeries.title] = {
          success: true,
          message: 'Successfully added to Sonarr',
          details: response
        };
        
      } catch (error) {
        console.error(`Error adding series "${this.currentSeries.title}" to Sonarr:`, error);
        
        // Store error
        this.requestStatus[this.currentSeries.title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
      } finally {
        // Clear requesting state and current series
        this.requestingSeries = null;
        this.currentSeries = null;
        this.selectedSeasons = [];
        this.selectedRootFolder = null;
        this.selectedQualityProfile = null;
      }
    },
    
    /**
     * Request a series to be added to Sonarr (entry point)
     * @param {string} title - The series title to add
     */
    requestSeries(title) {
      this.openSeasonSelector(title);
    },
    
    /**
     * Handle window resize events to update the grid layout
     */
    handleResize() {
      // Force a re-computation of the gridStyle computed property
      this.$forceUpdate();
    }
  },
  mounted() {
    // Check if OpenAI is already configured
    this.openaiConfigured = openAIService.isConfigured();
    
    // Initialize model selection - start with empty value
    this.selectedModel = '';
    this.customModel = '';
    this.isCustomModel = false;
    
    // Add window resize listener to update grid style when screen size changes
    window.addEventListener('resize', this.handleResize);
    
    // Initialize temperature from localStorage or OpenAIService
    const savedTemp = localStorage.getItem('aiTemperature');
    if (savedTemp) {
      this.temperature = parseFloat(savedTemp);
      // Validate the value is within range
      if (isNaN(this.temperature) || this.temperature < 0) {
        this.temperature = 0;
      } else if (this.temperature > 1) {
        this.temperature = 1;
      }
    } else if (openAIService.temperature) {
      this.temperature = openAIService.temperature;
    }
    
    // Initialize library mode preferences from service
    this.useSampledLibrary = openAIService.useSampledLibrary;
    this.sampleSize = openAIService.sampleSize;
    
    // If there are already recommendations, collapse the settings by default
    if (this.recommendations.length > 0) {
      this.settingsExpanded = false;
    } else {
      this.settingsExpanded = true;
    }
    
    // Fetch models if API is configured
    if (openAIService.isConfigured()) {
      this.fetchModels().then(() => {
        // If models were fetched and openAIService has a model, check if it exists in options
        if (this.modelOptions.length > 0 && openAIService.model) {
          const currentModel = openAIService.model;
          const modelExists = this.modelOptions.some(model => model.id === currentModel);
          
          if (modelExists) {
            // If current model exists in options, select it
            this.selectedModel = currentModel;
            this.isCustomModel = false;
          } else {
            // If not in options but we have a value, set as custom
            this.customModel = currentModel;
            this.selectedModel = 'custom';
            this.isCustomModel = true;
          }
        } else if (this.modelOptions.length > 0) {
          // If no current model but we have options, select first one
          this.selectedModel = this.modelOptions[0].id;
          this.isCustomModel = false;
        }
      });
    }
    
    // Restore saved recommendation count from localStorage (if exists)
    const savedCount = localStorage.getItem('numRecommendations');
    if (savedCount) {
      this.numRecommendations = parseInt(savedCount, 10);
      // Validate the value is within range
      if (isNaN(this.numRecommendations) || this.numRecommendations < 1) {
        this.numRecommendations = 1;
      } else if (this.numRecommendations > 50) {
        this.numRecommendations = 50;
      }
    }
    
    // Restore saved columns count from localStorage (if exists)
    const savedColumnsCount = localStorage.getItem('columnsCount');
    if (savedColumnsCount) {
      this.columnsCount = parseInt(savedColumnsCount, 10);
      // Validate the value is within range
      if (isNaN(this.columnsCount) || this.columnsCount < 1) {
        this.columnsCount = 2; // Default to 2 if invalid
      } else if (this.columnsCount > 4) {
        this.columnsCount = 4;
      }
    }
    
    // Restore saved genre preferences if they exist
    const savedGenres = localStorage.getItem('tvGenrePreferences');
    if (savedGenres) {
      try {
        this.selectedGenres = JSON.parse(savedGenres);
      } catch (error) {
        console.error('Error parsing saved genres:', error);
        this.selectedGenres = [];
      }
    }
    
    // Restore saved custom vibe if it exists
    const savedVibe = localStorage.getItem('tvCustomVibe');
    if (savedVibe) {
      this.customVibe = savedVibe;
    }
    
    // Restore saved language preference if it exists
    const savedLanguage = localStorage.getItem('tvLanguagePreference');
    if (savedLanguage) {
      this.selectedLanguage = savedLanguage;
    }
    
    // Restore saved Plex history mode if it exists
    const savedPlexHistoryMode = localStorage.getItem('plexHistoryMode');
    if (savedPlexHistoryMode) {
      this.plexHistoryMode = savedPlexHistoryMode;
    }
    
    // Restore saved Plex only mode if it exists
    const savedPlexOnlyMode = localStorage.getItem('plexOnlyMode');
    if (savedPlexOnlyMode) {
      this.plexOnlyMode = savedPlexOnlyMode === 'true';
    }
    
    // Load previous TV recommendations from localStorage
    const savedPreviousRecommendations = localStorage.getItem('previousTVRecommendations');
    if (savedPreviousRecommendations) {
      try {
        this.previousRecommendations = JSON.parse(savedPreviousRecommendations);
      } catch (error) {
        console.error('Error parsing previous TV recommendations:', error);
        this.previousRecommendations = [];
      }
    }
    
    // Load liked TV recommendations from localStorage
    const savedLikedRecommendations = localStorage.getItem('likedTVRecommendations');
    if (savedLikedRecommendations) {
      try {
        this.likedRecommendations = JSON.parse(savedLikedRecommendations);
      } catch (error) {
        console.error('Error parsing liked TV recommendations:', error);
        this.likedRecommendations = [];
      }
    }
    
    // Load disliked TV recommendations from localStorage
    const savedDislikedRecommendations = localStorage.getItem('dislikedTVRecommendations');
    if (savedDislikedRecommendations) {
      try {
        this.dislikedRecommendations = JSON.parse(savedDislikedRecommendations);
      } catch (error) {
        console.error('Error parsing disliked TV recommendations:', error);
        this.dislikedRecommendations = [];
      }
    }
  },
  
  // Save state when component is destroyed
  beforeUnmount() {
    this.savePreviousRecommendations();
    this.saveLikedDislikedLists();
    // Remove event listener
    window.removeEventListener('resize', this.handleResize);
    // Clear any running intervals
    this.stopLoadingMessages();
  }
};
</script>

<style scoped>
.recommendations {
  padding: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.setup-section {
  margin-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--card-bg-color);
  padding: 30px;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  max-width: 600px;
  margin: 0 auto 30px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.setup-title {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--header-color);
  font-size: 20px;
  text-align: center;
  transition: color var(--transition-speed);
}

.info-message {
  margin-bottom: 10px;
  font-size: 16px;
  color: var(--text-color);
  opacity: 0.9;
  text-align: center;
  transition: color var(--transition-speed);
}

.setup-details {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text-color);
  opacity: 0.7;
  text-align: center;
  transition: color var(--transition-speed);
}

.settings-button {
  min-width: 200px;
  margin-top: 10px;
  font-size: 15px;
}

.actions {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.recommendations-settings {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
  width: 100%;
  max-width: 1600px;
}

.settings-container {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  width: 100%;
  box-sizing: border-box;
  padding: 20px;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.settings-layout {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.settings-left {
  flex: 0 0 40%;
}

.settings-right {
  flex: 0 0 60%;
}

@media (max-width: 1200px) {
  .settings-left, .settings-right {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }
}

.action-button-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  width: 100%;
}

.settings-header {
  cursor: pointer;
  padding: 12px 15px;
  background-color: var(--card-bg-color);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
  border-radius: 8px 8px 0 0;
}

.settings-header:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.small-action-button {
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 4px;
  min-width: 160px;
}

.retry-button {
  margin-top: 15px;
  background-color: #ff9800;
  color: white;
  font-size: 15px;
  padding: 8px 20px;
  min-width: 120px;
}

.retry-button:hover:not(:disabled) {
  background-color: #f57c00;
}

@media (max-width: 600px) {
  .small-action-button {
    font-size: 12px;
    padding: 4px 8px;
    min-width: 0 !important;
    max-width: 140px !important; 
    width: 140px !important;
    line-height: 1.3;
    overflow: hidden;
  }
  
  .loading {
    padding: 12px;
    gap: 10px;
  }
  
  .loading p {
    font-size: 14px;
    margin: 0;
    flex: 1;
  }
  
  .desktop-text {
    display: none;
  }
  
  .mobile-text {
    display: inline;
  }
  
  .settings-header {
    padding: 8px;
    gap: 5px;
  }
  
  .settings-header h3 {
    font-size: 13px;
  }
}

@media (min-width: 601px) {
  .desktop-text {
    display: inline;
  }
  
  .mobile-text {
    display: none;
  }
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--header-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-icon {
  font-size: 12px;
  transition: transform 0.2s;
}

.collapsed .settings-container {
  border-radius: 8px;
}

.recommendations-settings.collapsed {
  margin-bottom: 25px;
}

.settings-content {
  padding: 20px;
  transition: max-height 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
  max-height: 2000px; /* Large enough to fit all content */
  opacity: 1;
  transform: translateY(0);
  overflow: hidden;
}

.settings-content.collapsed {
  max-height: 0;
  opacity: 0;
  transform: translateY(-20px);
  padding: 0 20px;
}

.info-section {
  background-color: rgba(0, 0, 0, 0.03);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.info-section-title {
  margin: 0 0 10px 0;
  font-size: 15px;
  color: var(--header-color);
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.model-info {
  padding: 6px 0;
  font-size: 14px;
  margin-bottom: 8px;
}

.current-model {
  color: var(--text-color);
  transition: color var(--transition-speed);
  font-weight: 500;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.fetch-models-button {
  background: none;
  border: none;
  color: var(--button-primary-bg);
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.fetch-models-button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.fetch-models-button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.loading-icon {
  display: inline-block;
  animation: spin 1s infinite linear;
}

.fetch-error {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
}

.model-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-select {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
  transition: border-color 0.2s;
}

.model-select:focus {
  border-color: var(--button-primary-bg);
  outline: none;
}

.model-select-custom {
  margin-top: 5px;
}

.custom-model-input {
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
}

.custom-model-input:focus {
  border-color: var(--button-primary-bg);
  outline: none;
}

.temperature-control {
  margin-top: 15px;
}

.temperature-control label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.temp-value {
  font-weight: bold;
  color: #4CAF50;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
}

.temp-slider {
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 5px;
  background: #ddd;
  outline: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.temp-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 5px;
}

.temp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  margin-top: -6px;
}

.temp-slider::-webkit-slider-thumb:hover {
  background: #43a047;
  transform: scale(1.1);
}

.temp-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  border: none;
}

.temp-labels {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  width: 100%;
}

.temp-label-left {
  margin-left: 10px;
  width: 50px;
}

.temp-label-right {
  margin-right: 10px;
  width: 50px;
}

.temp-slider {
  flex: 1;
  margin: 0 10px;
}

.genre-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 15px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: var(--input-bg);
}

.genre-checkbox-item {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal;
  margin: 0;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  cursor: pointer;
}

.selected-genres-summary {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--border-color);
}

.selected-genres-count {
  font-size: 13px;
  color: var(--button-primary-bg);
  font-weight: 500;
}

.clear-genres-button {
  background: none;
  border: none;
  color: #f44336;
  font-size: 13px;
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.clear-genres-button:hover {
  opacity: 1;
  text-decoration: underline;
}

.count-selector, .genre-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.count-selector {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.select-container {
  position: relative;
  width: 100%;
}

select {
  width: 100%;
  padding: 10px;
  appearance: none;
  background-color: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, background-color var(--transition-speed), color var(--transition-speed);
}

select:hover {
  border-color: var(--button-primary-bg);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 10px;
  color: var(--input-text);
}

.count-selector label, .genre-selector label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: color var(--transition-speed);
}

.slider-container {
  width: 100%;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.count-slider {
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 5px;
  background: #ddd;
  outline: none;
  margin: 0;
  padding: 0;
  vertical-align: middle;
}

.count-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  margin-top: -7px; /* Fix vertical alignment */
}

.count-slider::-webkit-slider-thumb:hover {
  background: #43a047;
  transform: scale(1.1);
}

.count-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: background 0.2s, transform 0.2s;
  border: none;
}

.count-slider::-moz-range-thumb:hover {
  background: #43a047;
  transform: scale(1.1);
}

.count-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: #ddd;
  border-radius: 5px;
  margin: 0;
  padding: 0;
}

.count-slider::-moz-range-track {
  width: 100%;
  height: 6px;
  cursor: pointer;
  background: #ddd;
  border-radius: 5px;
  margin: 0;
  padding: 0;
}

.count-display {
  font-size: 16px;
  font-weight: bold;
  min-width: 25px;
  text-align: center;
  color: #4CAF50;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 2px 8px;
  margin-left: 10px;
}

.action-button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  min-width: 200px;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.fun-button {
  position: relative;
  min-width: 300px;
  width: 90%;
  padding: 14px 24px;
  background: linear-gradient(45deg, #673AB7, #9C27B0);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transform-style: preserve-3d;
  transition: all 0.3s ease;
}

.fun-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  background: linear-gradient(45deg, #5E35B1, #8E24AA);
}

.fun-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.99);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.fun-button:disabled {
  opacity: 0.7;
  background: linear-gradient(45deg, #9E9E9E, #757575);
  transform: none;
}

.button-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.button-text {
  font-size: 18px;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.button-icon {
  font-size: 20px;
  display: inline-flex;
  align-items: center;
}

.button-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transform: translateX(-100%);
  z-index: 1;
}

.fun-button:hover .button-glow {
  animation: glow-effect 1.5s infinite;
}

@keyframes glow-effect {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.action-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 15px;
  margin: 15px auto;
  max-width: 1000px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-message {
  margin-bottom: 8px;
  font-size: 16px;
  min-height: 24px;
  transition: opacity 0.4s ease-in-out;
  opacity: 1;
  animation: fadeInOut 10s infinite;
}

.recommendation-counter {
  font-size: 14px;
  color: #4CAF50;
  margin: 5px 0 0 0;
  font-weight: 500;
  background-color: rgba(76, 175, 80, 0.1);
  padding: 4px 12px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-width: 230px;
  text-align: center;
}

.recommendation-counter.initializing {
  color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

@keyframes fadeInOut {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}

.spinner {
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  .spinner {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  padding: 20px;
  color: #f44336;
  text-align: center;
  background-color: rgba(244, 67, 54, 0.05);
  border-radius: 8px;
  margin: 15px auto;
  max-width: 1000px;
  box-shadow: var(--card-shadow);
}

.error p {
  margin-bottom: 15px;
  font-size: 16px;
}

.recommendation-list {
  display: grid;
  gap: 20px;
  margin-top: 20px;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  /* Grid columns controlled by :style binding using the gridStyle computed property */
}

@media (max-width: 400px) {
  .recommendation-list {
    gap: 15px;
    padding: 0 5px;
  }
}

.recommendation-card {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  overflow: visible;
  transition: transform 0.2s ease, box-shadow var(--transition-speed), background-color var(--transition-speed);
  min-height: 275px; /* Use min-height instead of fixed height to allow content to expand */
}

.recommendation-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  flex-direction: row;
  min-height: 100%;
}

@media (max-width: 600px) {
  .card-content {
    flex-direction: column;
  }
}

.poster-container {
  position: relative;
  display: flex;
  justify-content: center;
  flex: 0 0 150px;
  padding: 0;
  width: auto;
  height: 100%;
}

@media (max-width: 600px) {
  .poster-container {
    flex: 0 0 auto;
    width: 100%;
    height: auto;
    margin-bottom: 10px;
  }
}

.poster {
  width: 150px;
  height: 275px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 600px) {
  .poster {
    width: 180px;
    height: 270px;
    border-radius: 4px;
  }
}

.title-fallback {
  color: white;
  font-size: 36px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.retry-poster-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.retry-poster-button:hover {
  opacity: 1;
  transform: scale(1.1);
}

.retry-poster-button svg {
  width: 20px;
  height: 20px;
  stroke: white;
}

@keyframes rotation {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
}

.retry-poster-button.loading svg {
  animation: rotation 1s infinite linear;
}

.details-container {
  flex: 1;
  padding: 15px;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

@media (max-width: 600px) {
  .details-container {
    padding: 12px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

@media (max-width: 600px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .card-actions {
    width: 100%;
    justify-content: space-between;
  }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.like-dislike-buttons {
  display: flex;
  gap: 5px;
}

.action-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-color);
  width: 32px;
  height: 32px;
}

.like-btn:hover {
  background-color: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border-color: #4CAF50;
}

.dislike-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
  color: #F44336;
  border-color: #F44336;
}

.like-btn.active {
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.dislike-btn.active {
  background-color: #F44336;
  color: white;
  border-color: #F44336;
}

.recommendation-card h3 {
  margin: 0 0 5px 0;
  color: var(--header-color);
  overflow: hidden;
  transition: color var(--transition-speed);
  font-size: 18px;
  line-height: 1.3;
}

.content-container {
  flex: 1;
  overflow: visible;
}

.label {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-color);
  opacity: 0.9;
  margin-right: 5px;
  display: flex;
  align-items: center;
}

.info-tooltip {
  display: inline-flex;
  margin-left: 4px;
  color: var(--text-color);
  opacity: 0.6;
  transition: opacity 0.2s;
  position: relative;
}

.info-tooltip:hover {
  opacity: 1;
}

.recommendation-card p {
  margin: 0;
  color: var(--text-color);
  line-height: 1.4;
  transition: color var(--transition-speed);
  font-size: 14px;
}

@media (max-width: 600px) {
  .recommendation-card p {
    font-size: 15px;
  }
}

.description, .reasoning, .rating, .streaming {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rating-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.rating-score {
  font-weight: bold;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  color: #2196F3;
  padding: 4px 10px 4px 8px;
  border-radius: 4px;
  width: fit-content;
  line-height: 1;
  margin-top: 4px;
  vertical-align: middle;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.rating-details {
  font-size: 13px;
  margin-top: 6px;
  color: var(--text-color);
  line-height: 1.4;
  opacity: 0.85;
  padding-left: 2px;
}

.rating-score {
  padding: 4px 12px;
  font-size: 16px;
}

.score-fresh {
  color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
}

.score-certified {
  color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.2);
  font-weight: 700;
}

.score-rotten {
  color: #FF9800;
  background-color: rgba(255, 152, 0, 0.1);
}

.score-unknown {
  color: #838383;
  background-color: rgba(0, 0, 0, 0.05);
}

.history-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 14px;
  color: var(--text-color);
}

.clear-history-button {
  background: none;
  border: none;
  color: #f44336;
  font-size: 13px;
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.library-mode-toggle {
  display: flex;
  flex-direction: column;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.setting-description {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.8;
}

.sample-size-control {
  margin-top: 10px;
  margin-left: 22px;
  padding-top: 10px;
}

.sample-slider-container {
  margin-top: 10px;
}

.clear-history-button:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.modal-header {
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
}

.modal-close:hover {
  opacity: 1;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: 500px;
}

.modal-body h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: var(--text-color);
}

.modal-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.select-all {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.seasons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}

.season-item {
  padding: 5px;
}

.season-item label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}

.season-item input {
  margin-right: 8px;
}

.episode-count {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  margin-left: 5px;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.confirm-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.confirm-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.no-recommendations {
  text-align: center;
  padding: 30px;
  color: var(--text-color);
  opacity: 0.7;
  transition: color var(--transition-speed);
}

.plex-options, .jellyfin-options, .tautulli-options {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.tautulli-options {
  background-color: rgba(124, 58, 237, 0.05); /* Light purple background for Tautulli */
}

.plex-history-toggle, .jellyfin-history-toggle, .tautulli-history-toggle {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0;
  font-size: 14px;
}

.toggle-option input[type="radio"] {
  margin-right: 8px;
  cursor: pointer;
}

.plex-only-toggle, .jellyfin-only-toggle, .tautulli-only-toggle {
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.jellyfin-user-select-button {
  margin-top: 15px;
  width: auto;
  max-width: 200px;
  padding: 8px 16px;
  font-size: 14px;
}

.tautulli-user-select-button {
  margin-top: 15px;
  width: auto;
  max-width: 200px;
  padding: 8px 16px;
  font-size: 14px;
  background-color: #7c3aed; /* Tautulli purple color */
  color: white;
}

.request-button {
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.request-button.compact {
  padding: 5px 10px;
  font-size: 12px;
  min-width: 55px;
  justify-content: center;
}

@media (max-width: 600px) {
  .request-button.compact {
    padding: 8px 12px;
    font-size: 14px;
    min-width: 65px;
  }
}

.request-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.request-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.request-button.loading {
  background-color: #64B5F6;
}

.request-button.requested {
  background-color: #4CAF50;
  cursor: default;
}

.small-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

.mini-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-left-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-sizing: border-box;
}
/* Added styles for quality and root folder selection */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.setting-item label {
  font-weight: 500;
  font-size: 14px;
}

.setting-select {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 14px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 0;
  color: var(--text-color);
  opacity: 0.8;
}

.loading-indicator .small-spinner {
  width: 18px;
  height: 18px;
  border-width: 2px;
}
/* Vibe Selector Styles */
.vibe-selector {
  margin-bottom: 20px;
}

.vibe-selector label {
  display: block;
  margin-bottom: 10px;
  font-weight: 500;
  font-size: 15px;
}

.vibe-input-container {
  position: relative;
  margin-bottom: 8px;
}

.vibe-input {
  width: 100%;
  padding: 10px 30px 10px 10px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
}

.clear-vibe-button {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-color);
  opacity: 0.5;
  cursor: pointer;
  padding: 5px;
}

.clear-vibe-button:hover {
  opacity: 1;
}

.language-selector {
  margin-bottom: 20px;
}

.language-select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  margin-bottom: 8px;
}
</style>