<template>
  <div class="recommendations">
    <div class="recommendation-header">
      <h2>{{ isMovieMode ? 'Movie Recommendations' : 'TV Show Recommendations' }}</h2>
      <div class="content-type-selector">
        <button 
          class="content-type-button" 
          :class="{ 'active': !isMovieMode }"
          @click="setContentType(false)"
        >
          <span class="button-icon">📺</span>
          <span>TV Shows</span>
        </button>
        <button 
          class="content-type-button" 
          :class="{ 'active': isMovieMode }"
          @click="setContentType(true)"
        >
          <span class="button-icon">🎬</span>
          <span>Movies</span>
        </button>
      </div>
    </div>
    
    <div v-if="!openaiConfigured" class="setup-section">
      <h3 class="setup-title">AI Connection Required</h3>
      <p class="info-message">To generate {{ isMovieMode ? 'movie' : 'TV show' }} recommendations, you need to configure an AI service first.</p>
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
                      <div v-if="fetchError" class="fetch-error" @click="goToSettings">{{ fetchError }} <span class="error-link">Click to configure API settings</span></div>
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
                      <div class="slider-header">
                        <label for="temperature-slider">Temperature</label>
                        <span class="slider-value">{{ temperature.toFixed(1) }}</span>
                      </div>
                      <div class="modern-slider-container">
                        <div class="slider-labels">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                        <div class="slider-track-container">
                          <input 
                            type="range" 
                            id="temperature-slider"
                            v-model.number="temperature"
                            min="0" 
                            max="1"
                            step="0.1"
                            class="modern-slider"
                            @change="updateTemperature"
                          />
                          <div class="slider-track" :style="{ width: `${temperature * 100}%` }"></div>
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
                        <div class="slider-header">
                          <label for="sampleSizeSlider">Sample size</label>
                          <span class="slider-value">{{ sampleSize }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="sampleSizeSlider"
                              v-model.number="sampleSize"
                              min="5" 
                              max="1000"
                              class="modern-slider"
                              @change="saveSampleSize"
                            >
                            <div class="slider-track"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>5</span>
                            <span>1000</span>
                          </div>
                        </div>
                      </div>

                      <div class="experimental-toggle">
                        <label class="checkbox-label">
                          <input 
                            type="checkbox" 
                            v-model="useStructuredOutput" 
                            @change="saveStructuredOutputPreference"
                          >
                          Use Structured Output (Experimental)
                        </label>
                        <div class="setting-description">
                          Uses OpenAI's JSON schema feature for more reliable and consistent recommendations.
                          <span class="experimental-badge">BETA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="history-info">
                    <span>{{ previousRecommendations.length }} {{ isMovieMode ? 'movies' : 'shows' }} in history</span>
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
                  <div class="slider-header">
                    <label for="recommendationsSlider">Number of recommendations</label>
                    <span class="slider-value">{{ numRecommendations }}</span>
                  </div>
                  <div class="modern-slider-container">
                    <div class="slider-track-container">
                      <input 
                        type="range" 
                        id="recommendationsSlider"
                        v-model.number="numRecommendations"
                        min="1" 
                        max="50"
                        class="modern-slider"
                        @change="saveRecommendationCount"
                      >
                      <div class="slider-track" :style="{ width: `${(numRecommendations - 1) / 49 * 100}%` }"></div>
                    </div>
                    <div class="slider-range-labels">
                      <span>1</span>
                      <span>50</span>
                    </div>
                  </div>
                </div>
                
                <div class="count-selector">
                  <div class="slider-header">
                    <label for="columnsSlider">Posters per row</label>
                    <span class="slider-value">{{ columnsCount }}</span>
                  </div>
                  <div class="modern-slider-container">
                    <div class="slider-track-container">
                      <input 
                        type="range" 
                        id="columnsSlider"
                        v-model.number="columnsCount"
                        min="1" 
                        max="4"
                        class="modern-slider"
                        @change="saveColumnsCount"
                      >
                      <div class="slider-track" :style="{ width: `${(columnsCount - 1) / 3 * 100}%` }"></div>
                    </div>
                    <div class="slider-range-labels">
                      <span>1</span>
                      <span>4</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="settings-right">
                <div class="genre-selector">
                  <div class="section-header">
                    <label>Genre preferences</label>
                    <span v-if="selectedGenres.length > 0" class="genre-badge">{{ selectedGenres.length }}</span>
                  </div>
                  <div class="genre-tags-container">
                    <div 
                      v-for="genre in availableGenres" 
                      :key="genre.value"
                      :class="['genre-tag', {'selected': selectedGenres.includes(genre.value)}]"
                      @click="toggleGenre(genre.value)"
                    >
                      {{ genre.label }}
                    </div>
                    <button 
                      v-if="selectedGenres.length > 0" 
                      @click="clearGenres" 
                      class="clear-all-button"
                      title="Clear all selected genres"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                
                <div class="vibe-selector">
                  <div class="section-header">
                    <label for="customVibe">Vibe/mood or custom prompt</label>
                    <button 
                      v-if="customVibe" 
                      @click="clearCustomVibe" 
                      class="clear-prompt-button"
                      title="Clear prompt"
                    >
                      Clear
                    </button>
                  </div>
                  <div class="vibe-input-container">
                    <textarea 
                      id="customVibe" 
                      v-model="customVibe"
                      @change="saveCustomVibe"
                      @input="this.recommendationsRequested = false"
                      placeholder="e.g., cozy mysteries, dark comedy, mind-bending, nostalgic 90s feel..."
                      class="vibe-input"
                      rows="2"
                    ></textarea>
                  </div>
                  <div class="setting-tip">
                    <svg class="tip-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M10 14V10M10 6H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>Guide the AI with specific themes, styles, or preferences</span>
                  </div>
                </div>
                
                <div class="language-selector">
                  <div class="section-header">
                    <label for="languageSelect">Content language</label>
                    <span v-if="selectedLanguage" class="language-badge">{{ getLanguageName(selectedLanguage) }}</span>
                  </div>
                  <div class="select-wrapper">
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
                    <svg class="select-arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                  <div class="setting-tip">
                    <svg class="tip-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5"/>
                      <path d="M10 14V10M10 6H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <span>Focus recommendations on content in a specific language</span>
                  </div>
                </div>
                
                <div v-if="plexConfigured" class="plex-options">
                  <div class="service-header">
                    <label>Plex Watch History:</label>
                    <div class="service-controls">
                      <label class="toggle-switch">
                        <input 
                          type="checkbox" 
                          v-model="plexUseHistory" 
                          @change="savePlexUseHistory"
                        >
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">{{ plexUseHistory ? 'Include' : 'Exclude' }}</span>
                      </label>
                    </div>
                  </div>
                  
                  <div v-if="plexUseHistory" class="service-settings">
                    <div class="plex-history-toggle">
                      <div class="history-selection">
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
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="plexHistoryMode" 
                            value="custom"
                            @change="savePlexHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="plexHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="plexDaysSlider">Days of history</label>
                          <span class="slider-value">{{ plexCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="plexDaysSlider"
                              v-model.number="plexCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="savePlexCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(plexCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="plex-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="plexOnlyMode" 
                          @change="savePlexOnlyMode"
                          :disabled="!plexUseHistory"
                        >
                        Use only Plex history for recommendations (ignore library)
                      </label>
                    </div>
                  </div>
                </div>
                
                <div v-if="jellyfinConfigured" class="jellyfin-options">
                  <div class="service-header">
                    <label>Jellyfin Watch History:</label>
                    <div class="service-controls">
                      <label class="toggle-switch">
                        <input 
                          type="checkbox" 
                          v-model="jellyfinUseHistory" 
                          @change="saveJellyfinUseHistory"
                        >
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">{{ jellyfinUseHistory ? 'Include' : 'Exclude' }}</span>
                      </label>
                    </div>
                  </div>
                  
                  <div v-if="jellyfinUseHistory" class="service-settings">
                    <div class="jellyfin-history-toggle">
                      <div class="history-selection">
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
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="jellyfinHistoryMode" 
                            value="custom"
                            @change="saveJellyfinHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="jellyfinHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="jellyfinDaysSlider">Days of history</label>
                          <span class="slider-value">{{ jellyfinCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="jellyfinDaysSlider"
                              v-model.number="jellyfinCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="saveJellyfinCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(jellyfinCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="jellyfin-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="jellyfinOnlyMode" 
                          @change="saveJellyfinOnlyMode"
                          :disabled="!jellyfinUseHistory"
                        >
                        Use only Jellyfin history for recommendations (ignore library)
                      </label>
                    </div>
                    
                    <button 
                      class="action-button jellyfin-user-select-button"
                      @click="$emit('openJellyfinUserSelect')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #34A853; color: white;"
                    >
                      Change User
                    </button>
                  </div>
                </div>
                
                <div v-if="tautulliConfigured" class="tautulli-options">
                  <div class="service-header">
                    <label>Tautulli Watch History:</label>
                    <div class="service-controls">
                      <label class="toggle-switch">
                        <input 
                          type="checkbox" 
                          v-model="tautulliUseHistory" 
                          @change="saveTautulliUseHistory"
                        >
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">{{ tautulliUseHistory ? 'Include' : 'Exclude' }}</span>
                      </label>
                    </div>
                  </div>
                  
                  <div v-if="tautulliUseHistory" class="service-settings">
                    <div class="tautulli-history-toggle">
                      <div class="history-selection">
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
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="tautulliHistoryMode" 
                            value="custom"
                            @change="saveTautulliHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="tautulliHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="tautulliDaysSlider">Days of history</label>
                          <span class="slider-value">{{ tautulliCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="tautulliDaysSlider"
                              v-model.number="tautulliCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="saveTautulliCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(tautulliCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="tautulli-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="tautulliOnlyMode" 
                          @change="saveTautulliOnlyMode"
                          :disabled="!tautulliUseHistory"
                        >
                        Use only Tautulli history for recommendations (ignore library)
                      </label>
                    </div>
                    
                    <button 
                      class="action-button tautulli-user-select-button"
                      @click="$emit('openTautulliUserSelect')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #34A853; color: white;"
                    >
                      Change User
                    </button>
                  </div>
                </div>
                
                <div v-if="traktConfigured" class="trakt-options">
                  <div class="service-header">
                    <label>Trakt Watch History:</label>
                    <div class="service-controls">
                      <label class="toggle-switch">
                        <input 
                          type="checkbox" 
                          v-model="traktUseHistory" 
                          @change="saveTraktUseHistory"
                        >
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">{{ traktUseHistory ? 'Include' : 'Exclude' }}</span>
                      </label>
                    </div>
                  </div>
                  
                  <div v-if="traktUseHistory" class="service-settings">
                    <div class="trakt-history-toggle">
                      <div class="history-selection">
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="traktHistoryMode" 
                            value="all"
                            @change="saveTraktHistoryMode"
                          >
                          All watch history
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="traktHistoryMode" 
                            value="recent"
                            @change="saveTraktHistoryMode"
                          >
                          Recent (30 days)
                        </label>
                        <label class="toggle-option">
                          <input 
                            type="radio" 
                            v-model="traktHistoryMode" 
                            value="custom"
                            @change="saveTraktHistoryMode"
                          >
                          Custom period
                        </label>
                      </div>
                      
                      <div v-if="traktHistoryMode === 'custom'" class="days-slider-container">
                        <div class="slider-header">
                          <label for="traktDaysSlider">Days of history</label>
                          <span class="slider-value">{{ traktCustomHistoryDays }}</span>
                        </div>
                        <div class="modern-slider-container">
                          <div class="slider-track-container">
                            <input 
                              type="range" 
                              id="traktDaysSlider"
                              v-model.number="traktCustomHistoryDays"
                              min="1" 
                              max="365"
                              class="modern-slider"
                              @change="saveTraktCustomHistoryDays"
                            >
                            <div class="slider-track" :style="{ width: `${(traktCustomHistoryDays - 1) / 364 * 100}%` }"></div>
                          </div>
                          <div class="slider-range-labels">
                            <span>1</span>
                            <span>365</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="trakt-only-toggle">
                      <label class="checkbox-label">
                        <input 
                          type="checkbox" 
                          v-model="traktOnlyMode" 
                          @change="saveTraktOnlyMode"
                          :disabled="!traktUseHistory"
                        >
                        Use only Trakt history for recommendations (ignore library)
                      </label>
                    </div>
                    
                    <button 
                      class="action-button trakt-refresh-button"
                      @click="$emit('refreshTraktHistory')"
                      style="padding: 6px 12px; font-size: 13px; background-color: #ED2224; color: white; margin-top: 15px;"
                    >
                      Refresh Trakt History
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="action-button-container">
              <button 
                @click="getRecommendations" 
                :disabled="loading"
                class="action-button discover-button"
              >
                <div class="discover-button-inner">
                  <span class="button-icon">{{ isMovieMode ? '🎬' : '📺' }}</span>
                  <span class="button-text">
                    {{ loading 
                      ? (isMovieMode ? 'Finding Recommendations...' : 'Finding Recommendations...') 
                      : (isMovieMode ? 'Discover Recommendations' : 'Discover Recommendations') 
                    }}
                  </span>
                  <svg class="arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="button-shine"></div>
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
          <button 
            v-if="error.includes('API key') || error.includes('API service') || error.includes('not configured')"
            @click="goToSettings" 
            class="action-button settings-button"
          >
            Configure API Settings
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
                    :disabled="requestingSeries || requestStatus[rec.title]?.success"
                    :title="isMovieMode ? 'Add to Radarr' : 'Add to Sonarr'">
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
    <!-- Season Selection Modal for TV Shows -->
    <div v-if="showSeasonModal && currentSeries" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add "{{ currentSeries.title }}" to Sonarr</h3>
          <button class="modal-close" @click="closeSeasonModal">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="currentSeries.showSeasonWarning" class="modal-warning">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              No season information was found for this series. This may be due to a temporary Sonarr API issue.
              If you proceed, all seasons of this show will be added and monitored. You can proceed or cancel and try again later.
            </div>
          </div>
          
          <div class="modal-section" v-if="!currentSeries.showSeasonWarning && currentSeries.seasons.length > 0">
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
            :disabled="(!selectedSeasons.length && !currentSeries.showSeasonWarning) || loadingFolders"
          >
            {{ currentSeries.showSeasonWarning ? 'Add All Seasons to Sonarr' : 'Add to Sonarr' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Movie Confirmation Modal -->
    <div v-if="showMovieModal && currentMovie" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add "{{ currentMovie.title }}" to Radarr</h3>
          <button class="modal-close" @click="closeMovieModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="modal-section">
            <p>You're about to add "{{ currentMovie.title }}" to your Radarr library. Radarr will search for this movie and download it if available.</p>
          </div>
          
          <div class="modal-section">
            <h4>Quality & Storage Settings:</h4>
            
            <div class="loading-indicator" v-if="loadingMovieFolders">
              <div class="small-spinner"></div>
              <span>Loading options...</span>
            </div>
            
            <div class="settings-grid" v-else>
              <div class="setting-item">
                <label for="movieRootFolder">Save Location:</label>
                <select 
                  id="movieRootFolder" 
                  v-model="selectedMovieRootFolder"
                  class="setting-select"
                >
                  <option v-for="folder in movieRootFolders" :key="folder.id" :value="folder.path">
                    {{ folder.path }} ({{ formatFreeSpace(folder.freeSpace) }} free)
                  </option>
                </select>
              </div>
              
              <div class="setting-item">
                <label for="movieQualityProfile">Quality Profile:</label>
                <select 
                  id="movieQualityProfile" 
                  v-model="selectedMovieQualityProfile"
                  class="setting-select"
                >
                  <option v-for="profile in movieQualityProfiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-button" @click="closeMovieModal">Cancel</button>
          <button 
            class="confirm-button" 
            @click="confirmAddMovie"
            :disabled="loadingMovieFolders"
          >
            Add to Radarr
          </button>
        </div>
      </div>
    </div>
  </template>

<script>
import openAIService from '../services/OpenAIService';
import imageService from '../services/ImageService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import apiService from '../services/ApiService';
import axios from 'axios';

export default {
  name: 'TVRecommendations',
  components: {
  },
  props: {
    initialMovieMode: {
      type: Boolean,
      default: false
    },
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
    },
    movies: {
      type: Array,
      default: () => []
    },
    radarrConfigured: {
      type: Boolean,
      default: false
    },
    recentlyWatchedMovies: {
      type: Array,
      default: () => []
    },
    jellyfinRecentlyWatchedMovies: {
      type: Array,
      default: () => []
    },
    tautulliRecentlyWatchedMovies: {
      type: Array,
      default: () => []
    },
    traktConfigured: {
      type: Boolean,
      default: false
    },
    traktRecentlyWatchedShows: {
      type: Array,
      default: () => []
    },
    traktRecentlyWatchedMovies: {
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
    },
    
    // Computed property to get the current active history based on mode
    currentHistory() {
      return this.isMovieMode ? this.previousMovieRecommendations : this.previousShowRecommendations;
    },
    
    // Computed property to get movie watch history from all sources
    allMovieWatchHistory() {
      return [
        ...(this.recentlyWatchedMovies || []),
        ...(this.jellyfinRecentlyWatchedMovies || []),
        ...(this.tautulliRecentlyWatchedMovies || [])
      ];
    },
    
    // Computed property to get TV watch history from all sources
    allTVWatchHistory() {
      return [
        ...(this.recentlyWatchedShows || []),
        ...(this.jellyfinRecentlyWatchedShows || []),
        ...(this.tautulliRecentlyWatchedShows || [])
      ];
    }
  },
  watch: {
    // Watch for changes to radarrConfigured prop (for example when saving credentials)
    radarrConfigured: {
      handler(newValue, oldValue) {
        console.log('RequestRecommendations: radarrConfigured prop changed:', newValue);
        // Only fetch if the value actually changed from false to true
        // and we don't already have movies data
        if (newValue && !oldValue && this.isMovieMode) {
          // If radarrConfigured became true while in movie mode, try to load movies
          console.log('Radarr is now configured and we are in movie mode, checking movies data');
          if ((!this.movies || this.movies.length === 0) && 
              (!this.localMovies || this.localMovies.length === 0)) {
            console.log('Movies array is empty, trying to fetch from radarr service');
            radarrService.getMovies().then(moviesData => {
              if (moviesData && moviesData.length > 0) {
                console.log(`Successfully loaded ${moviesData.length} movies`);
                // Update localMovies instead of directly mutating the prop
                this.localMovies = moviesData;
              }
            }).catch(err => {
              console.error('Error fetching movies after radarrConfigured changed:', err);
            });
          } else {
            console.log('Skipping fetch as we already have movies data:', 
                        this.localMovies?.length || 0, 'local movies,',
                        this.movies?.length || 0, 'prop movies');
          }
        }
      },
      immediate: false // Changed to false to prevent double loading on mount
    },
    
    // Watch for changes to movies prop to update localMovies
    movies: {
      handler(newValue) {
        console.log('Movies prop changed, updating localMovies');
        this.localMovies = [...newValue];
      },
      immediate: true
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
      isMovieMode: this.initialMovieMode || false, // Toggle between TV shows (false) and movies (true)
      selectedGenres: [], // Multiple genre selections
      customVibe: '', // Custom vibe/mood input from user
      plexHistoryMode: 'all', // 'all', 'recent', or 'custom'
      plexOnlyMode: false, // Whether to use only Plex history for recommendations
      plexUseHistory: true, // Whether to include Plex watch history at all
      plexCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      
      jellyfinHistoryMode: 'all', // 'all', 'recent', or 'custom'
      jellyfinOnlyMode: false, // Whether to use only Jellyfin history for recommendations
      jellyfinUseHistory: true, // Whether to include Jellyfin watch history at all
      jellyfinCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      
      tautulliHistoryMode: 'all', // 'all', 'recent', or 'custom'
      tautulliOnlyMode: false, // Whether to use only Tautulli history for recommendations
      tautulliUseHistory: true, // Whether to include Tautulli watch history at all
      tautulliCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      
      traktHistoryMode: 'all', // 'all', 'recent', or 'custom'
      traktOnlyMode: false, // Whether to use only Trakt history for recommendations
      traktUseHistory: true, // Whether to include Trakt watch history at all
      traktCustomHistoryDays: 30, // Custom number of days for history when using 'custom' mode
      localMovies: [], // Local copy of movies prop to avoid direct mutation
      useSampledLibrary: false, // Whether to use sampled library or full library
      sampleSize: 20, // Default sample size when using sampled library
      useStructuredOutput: true, // Whether to use OpenAI's structured output feature
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
      previousShowRecommendations: [], // Track previous TV show recommendations
      previousMovieRecommendations: [], // Track previous movie recommendations
      previousRecommendations: [], // Current mode's previous recommendations
      likedRecommendations: [], // TV shows that user has liked
      dislikedRecommendations: [], // TV shows that user has disliked
      maxStoredRecommendations: 500, // Maximum number of previous recommendations to store
      showSeasonModal: false, // Control visibility of season selection modal
      currentSeries: null, // Current series being added
      selectedSeasons: [], // Selected seasons for the current series
      
      // Movie modal
      showMovieModal: false, // Control visibility of movie confirmation modal
      currentMovie: null, // Current movie being added
      movieRootFolders: [], // Available Radarr root folders
      movieQualityProfiles: [], // Available Radarr quality profiles
      selectedMovieRootFolder: null, // Selected root folder for movie
      selectedMovieQualityProfile: null, // Selected quality profile for movie
      loadingMovieFolders: false, // Loading status for movie folders
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
      this.$emit('navigate', 'settings', 'ai');
    },
    
    // Set content type and save preference
    async setContentType(isMovie) {
      // Only proceed if the mode actually changed
      if (this.isMovieMode !== isMovie) {
        this.isMovieMode = isMovie;
        await this.saveContentTypePreference();
      }
    },
    
    // Save content type preference (TV or Movies)
    async saveContentTypePreference() {
      try {
        await apiService.saveSettings({
          contentTypePreference: this.isMovieMode ? 'movies' : 'tvshows',
          isMovieMode: this.isMovieMode
        });
      } catch (error) {
        console.error('Error saving content type preference to server:', error);
        // Fallback to localStorage
        localStorage.setItem('contentTypePreference', this.isMovieMode ? 'movies' : 'tvshows');
        localStorage.setItem('isMovieMode', this.isMovieMode.toString());
      }
      
      // Update the current recommendations list based on mode
      this.previousRecommendations = this.isMovieMode ? 
        this.previousMovieRecommendations : this.previousShowRecommendations;
      
      // Reset recommendations when switching modes
      this.recommendations = [];
      
      // Clear openai conversation/context to ensure fresh recommendations
      openAIService.resetConversation();
      console.log('Content type switched, conversation history cleared');
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
        // Try to get the poster with cache disabled based on content type
        const posterUrl = this.isMovieMode
          ? await imageService.getPosterForMovie(clean, true)
          : await imageService.getPosterForShow(clean, true);
        
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
      
      // Try to extract score percentage with various patterns
      // First try to match a standard percentage pattern like "85%"
      let scoreMatch = ratingText.match(/(\d+)%/);
      
      // If that doesn't work, try to match a pattern like "85/100"
      if (!scoreMatch) {
        scoreMatch = ratingText.match(/(\d+)\s*\/\s*100/);
      }
      
      // If that doesn't work, try to match a pattern like "8.5/10" and convert to percentage
      if (!scoreMatch) {
        const decimalMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*\/\s*10/);
        if (decimalMatch) {
          const decimal = parseFloat(decimalMatch[1]);
          return Math.round(decimal * 10).toString();
        }
      }
      
      // If that doesn't work, look for just a number followed by any text
      if (!scoreMatch) {
        scoreMatch = ratingText.match(/(\d+)/);
      }
      
      // If we find any match, return the first capture group
      if (scoreMatch) {
        return scoreMatch[1];
      }
      
      // If no pattern matches, return placeholder
      return '??';
    },
    
    // This method has been removed as we no longer display rating details
    // The extractScore method is still used to get the percentage value
    
    // Determine CSS class for Recommendarr Rating
    getScoreClass(scoreText) {
      if (!scoreText || scoreText === 'N/A') {
        return 'score-unknown';
      }
      
      // Get a numeric score from the text using our extract method
      const scoreValue = this.extractScore(scoreText);
      
      // If we couldn't extract a meaningful value, return unknown
      if (scoreValue === '??') {
        return 'score-unknown';
      }
      
      const score = parseInt(scoreValue, 10);
      
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
    // Save recommendation count to server
    async saveRecommendationCount() {
      try {
        console.log('Saving numRecommendations to server:', this.numRecommendations);
        await apiService.saveSettings({ numRecommendations: this.numRecommendations });
        
        // Also save to localStorage as a backup
        localStorage.setItem('numRecommendations', this.numRecommendations.toString());
      } catch (error) {
        console.error('Error saving recommendation count to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('numRecommendations', this.numRecommendations.toString());
      }
    },
    
    // Save columns count to server
    async saveColumnsCount() {
      try {
        console.log('Saving columnsCount to server:', this.columnsCount);
        await apiService.saveSettings({ columnsCount: this.columnsCount });
        
        // Also save to localStorage as a backup
        localStorage.setItem('columnsCount', this.columnsCount.toString());
      } catch (error) {
        console.error('Error saving columns count to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('columnsCount', this.columnsCount.toString());
      }
    },
    
    // Save genre preferences to server when they change
    async saveGenrePreference() {
      try {
        await apiService.saveSettings({ tvGenrePreferences: this.selectedGenres });
      } catch (error) {
        console.error('Error saving genre preferences to server:', error);
        // Fallback to localStorage
        localStorage.setItem('tvGenrePreferences', JSON.stringify(this.selectedGenres));
      }
    },
    
    // Toggle a genre selection
    toggleGenre(genreValue) {
      const index = this.selectedGenres.indexOf(genreValue);
      if (index === -1) {
        // Genre not selected, add it
        this.selectedGenres.push(genreValue);
      } else {
        // Genre already selected, remove it
        this.selectedGenres.splice(index, 1);
      }
      this.saveGenrePreference();
    },
    
    // Clear all selected genres
    clearGenres() {
      this.selectedGenres = [];
      this.saveGenrePreference();
    },
    
    // Save custom vibe preference to server and reset conversation
    async saveCustomVibe() {
      try {
        await apiService.saveSettings({ tvCustomVibe: this.customVibe });
        // Reset OpenAI conversation context when vibe changes
        openAIService.resetConversation();
        console.log('Custom vibe updated, conversation history cleared');
      } catch (error) {
        console.error('Error saving custom vibe to server:', error);
        // Fallback to localStorage
        localStorage.setItem('tvCustomVibe', this.customVibe);
        // Still reset conversation even if server save fails
        openAIService.resetConversation();
      }
    },
    
    // Clear custom vibe input and reset conversation
    clearCustomVibe() {
      this.customVibe = '';
      this.saveCustomVibe();
      // Reset OpenAI conversation is handled in saveCustomVibe
    },
    
    // Save language preference to server
    async saveLanguagePreference() {
      try {
        await apiService.saveSettings({ tvLanguagePreference: this.selectedLanguage });
      } catch (error) {
        console.error('Error saving language preference to server:', error);
        // Fallback to localStorage
        localStorage.setItem('tvLanguagePreference', this.selectedLanguage);
      }
    },
    
    // Get language name from code
    getLanguageName(code) {
      if (!code) return '';
      const language = this.availableLanguages.find(lang => lang.code === code);
      return language ? language.name : code;
    },
    
    // Save Plex history mode preference
    async savePlexHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          plexHistoryMode: this.plexHistoryMode,
          plexCustomHistoryDays: this.plexCustomHistoryDays
        });
        this.$emit('plexHistoryModeChanged', this.plexHistoryMode);
      } catch (error) {
        console.error('Error saving Plex history mode to server:', error);
      }
    },
    
    // Save Plex use history preference
    async savePlexUseHistory() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ plexUseHistory: this.plexUseHistory });
        
        // If turning off history usage, also turn off the plex-only mode
        if (!this.plexUseHistory && this.plexOnlyMode) {
          this.plexOnlyMode = false;
          await this.savePlexOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Plex use history preference to server:', error);
      }
    },
    
    // Save Plex custom history days
    async savePlexCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ plexCustomHistoryDays: this.plexCustomHistoryDays });
      } catch (error) {
        console.error('Error saving Plex custom history days to server:', error);
      }
    },
    
    // Save Jellyfin history mode preference
    async saveJellyfinHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          jellyfinHistoryMode: this.jellyfinHistoryMode,
          jellyfinCustomHistoryDays: this.jellyfinCustomHistoryDays
        });
        this.$emit('jellyfinHistoryModeChanged', this.jellyfinHistoryMode);
      } catch (error) {
        console.error('Error saving Jellyfin history mode to server:', error);
      }
    },
    
    // Save Jellyfin use history preference
    async saveJellyfinUseHistory() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ jellyfinUseHistory: this.jellyfinUseHistory });
        
        // If turning off history usage, also turn off the jellyfin-only mode
        if (!this.jellyfinUseHistory && this.jellyfinOnlyMode) {
          this.jellyfinOnlyMode = false;
          await this.saveJellyfinOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Jellyfin use history preference to server:', error);
      }
    },
    
    // Save Jellyfin custom history days
    async saveJellyfinCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ jellyfinCustomHistoryDays: this.jellyfinCustomHistoryDays });
      } catch (error) {
        console.error('Error saving Jellyfin custom history days to server:', error);
      }
    },
    
    // Save Plex only mode preference
    async savePlexOnlyMode() {
      try {
        // If enabling Plex only mode, disable other only modes
        if (this.plexOnlyMode) {
          const settings = { plexOnlyMode: this.plexOnlyMode };
          
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            settings.jellyfinOnlyMode = false;
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            settings.tautulliOnlyMode = false;
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            settings.traktOnlyMode = false;
            this.$emit('traktOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ plexOnlyMode: this.plexOnlyMode });
        }
        
        this.$emit('plexOnlyModeChanged', this.plexOnlyMode);
      } catch (error) {
        console.error('Error saving Plex only mode to server:', error);
        // Fallback to localStorage
        localStorage.setItem('plexOnlyMode', this.plexOnlyMode.toString());
        
        // If enabling Plex only mode, disable other only modes
        if (this.plexOnlyMode) {
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            localStorage.setItem('jellyfinOnlyMode', 'false');
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            localStorage.setItem('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            localStorage.setItem('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('plexOnlyModeChanged', this.plexOnlyMode);
      }
    },
    
    // Save Jellyfin only mode preference
    async saveJellyfinOnlyMode() {
      try {
        // If enabling Jellyfin only mode, disable other only modes
        if (this.jellyfinOnlyMode) {
          const settings = { jellyfinOnlyMode: this.jellyfinOnlyMode };
          
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            settings.plexOnlyMode = false;
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            settings.tautulliOnlyMode = false;
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            settings.traktOnlyMode = false;
            this.$emit('traktOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ jellyfinOnlyMode: this.jellyfinOnlyMode });
        }
        
        this.$emit('jellyfinOnlyModeChanged', this.jellyfinOnlyMode);
      } catch (error) {
        console.error('Error saving Jellyfin only mode to server:', error);
        // Fallback to localStorage
        localStorage.setItem('jellyfinOnlyMode', this.jellyfinOnlyMode.toString());
        
        // If enabling Jellyfin only mode, disable other only modes
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
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            localStorage.setItem('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('jellyfinOnlyModeChanged', this.jellyfinOnlyMode);
      }
    },
    
    // Save Tautulli history mode preference
    async saveTautulliHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          tautulliHistoryMode: this.tautulliHistoryMode,
          tautulliCustomHistoryDays: this.tautulliCustomHistoryDays
        });
        this.$emit('tautulliHistoryModeChanged', this.tautulliHistoryMode);
      } catch (error) {
        console.error('Error saving Tautulli history mode to server:', error);
      }
    },
    
    // Save Tautulli use history preference
    async saveTautulliUseHistory() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ tautulliUseHistory: this.tautulliUseHistory });
        
        // If turning off history usage, also turn off the tautulli-only mode
        if (!this.tautulliUseHistory && this.tautulliOnlyMode) {
          this.tautulliOnlyMode = false;
          await this.saveTautulliOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Tautulli use history preference to server:', error);
      }
    },
    
    // Save Tautulli custom history days
    async saveTautulliCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ tautulliCustomHistoryDays: this.tautulliCustomHistoryDays });
      } catch (error) {
        console.error('Error saving Tautulli custom history days to server:', error);
      }
    },
    
    // Save Tautulli only mode preference
    async saveTautulliOnlyMode() {
      try {
        // If enabling Tautulli only mode, disable Plex only mode, Jellyfin only mode, and Trakt only mode
        if (this.tautulliOnlyMode) {
          const settings = { tautulliOnlyMode: this.tautulliOnlyMode };
          
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            settings.plexOnlyMode = false;
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            settings.jellyfinOnlyMode = false;
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            settings.traktOnlyMode = false;
            this.$emit('traktOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ tautulliOnlyMode: this.tautulliOnlyMode });
        }
        
        this.$emit('tautulliOnlyModeChanged', this.tautulliOnlyMode);
      } catch (error) {
        console.error('Error saving Tautulli only mode to server:', error);
        // Fallback to localStorage
        localStorage.setItem('tautulliOnlyMode', this.tautulliOnlyMode.toString());
        
        // If enabling Tautulli only mode, disable other only modes
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
          if (this.traktOnlyMode) {
            this.traktOnlyMode = false;
            localStorage.setItem('traktOnlyMode', 'false');
            this.$emit('traktOnlyModeChanged', false);
          }
        }
        
        this.$emit('tautulliOnlyModeChanged', this.tautulliOnlyMode);
      }
    },
    
    // Save Trakt history mode preference
    async saveTraktHistoryMode() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ 
          traktHistoryMode: this.traktHistoryMode,
          traktCustomHistoryDays: this.traktCustomHistoryDays
        });
        this.$emit('traktHistoryModeChanged', this.traktHistoryMode);
      } catch (error) {
        console.error('Error saving Trakt history mode to server:', error);
      }
    },
    
    // Save Trakt use history preference
    async saveTraktUseHistory() {
      console.log('Saving Trakt use history preference:', this.traktUseHistory);
      try {
        // Explicitly convert to boolean to avoid any string conversion issues
        const useHistoryValue = this.traktUseHistory === true;
        
        // Save to User_Data.json via API service
        await apiService.saveSettings({ traktUseHistory: useHistoryValue });
        console.log('Successfully saved traktUseHistory setting:', useHistoryValue);
        
        // If turning off history usage, also turn off the trakt-only mode
        if (!this.traktUseHistory && this.traktOnlyMode) {
          console.log('Trakt history disabled but "only mode" was on - turning off "only mode"');
          this.traktOnlyMode = false;
          await this.saveTraktOnlyMode();
        }
      } catch (error) {
        console.error('Error saving Trakt use history preference to server:', error);
      }
    },
    
    // Save Trakt custom history days
    async saveTraktCustomHistoryDays() {
      try {
        // Save to User_Data.json via API service
        await apiService.saveSettings({ traktCustomHistoryDays: this.traktCustomHistoryDays });
      } catch (error) {
        console.error('Error saving Trakt custom history days to server:', error);
      }
    },
    
    // Save Trakt only mode preference
    async saveTraktOnlyMode() {
      try {
        // If enabling Trakt only mode, disable other only modes
        if (this.traktOnlyMode) {
          const settings = { traktOnlyMode: this.traktOnlyMode };
          
          if (this.plexOnlyMode) {
            this.plexOnlyMode = false;
            settings.plexOnlyMode = false;
            this.$emit('plexOnlyModeChanged', false);
          }
          
          if (this.jellyfinOnlyMode) {
            this.jellyfinOnlyMode = false;
            settings.jellyfinOnlyMode = false;
            this.$emit('jellyfinOnlyModeChanged', false);
          }
          
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            settings.tautulliOnlyMode = false;
            this.$emit('tautulliOnlyModeChanged', false);
          }
          
          await apiService.saveSettings(settings);
        } else {
          await apiService.saveSettings({ traktOnlyMode: this.traktOnlyMode });
        }
        
        this.$emit('traktOnlyModeChanged', this.traktOnlyMode);
      } catch (error) {
        console.error('Error saving Trakt only mode to server:', error);
        // Fallback to localStorage
        localStorage.setItem('traktOnlyMode', this.traktOnlyMode.toString());
        
        // If enabling Trakt only mode, disable other only modes
        if (this.traktOnlyMode) {
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
          if (this.tautulliOnlyMode) {
            this.tautulliOnlyMode = false;
            localStorage.setItem('tautulliOnlyMode', 'false');
            this.$emit('tautulliOnlyModeChanged', false);
          }
        }
        
        this.$emit('traktOnlyModeChanged', this.traktOnlyMode);
      }
    },
    
    // Save previous recommendations to server
    async savePreviousRecommendations() {
      try {
        // Save both the list of titles (for history) and the current recommendations (for restoring session)
        if (this.isMovieMode) {
          // If we have active recommendations, save them
          if (this.recommendations && this.recommendations.length > 0) {
            await apiService.saveRecommendations('movie', this.recommendations);
          } else {
            // Otherwise just save the history titles
            await apiService.saveRecommendations('movie', this.previousMovieRecommendations);
          }
        } else {
          // If we have active recommendations, save them
          if (this.recommendations && this.recommendations.length > 0) {
            await apiService.saveRecommendations('tv', this.recommendations);
          } else {
            // Otherwise just save the history titles
            await apiService.saveRecommendations('tv', this.previousShowRecommendations);
          }
        }
      } catch (error) {
        console.error('Error saving recommendations to server:', error);
        // Fallback to localStorage
        if (this.isMovieMode) {
          // Save both history and current recommendations
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
          if (this.recommendations && this.recommendations.length > 0) {
            localStorage.setItem('currentMovieRecommendations', JSON.stringify(this.recommendations));
          }
        } else {
          // Save both history and current recommendations
          localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousShowRecommendations));
          if (this.recommendations && this.recommendations.length > 0) {
            localStorage.setItem('currentTVRecommendations', JSON.stringify(this.recommendations));
          }
        }
      }
    },
    
    // Add current recommendations to the history
    async addToRecommendationHistory(newRecommendations) {
      // Extract just the titles for the title-only history array
      const titlesToAdd = newRecommendations.map(rec => rec.title);
      
      // Reference to the correct history array based on mode
      const historyArray = this.isMovieMode ? 
        this.previousMovieRecommendations : this.previousShowRecommendations;
      
      // Combine with existing recommendations, remove duplicates
      const combinedRecommendations = [...historyArray, ...titlesToAdd];
      
      // Keep only unique recommendations (as strings)
      const uniqueRecommendations = [...new Set(combinedRecommendations)];
      
      // If over the limit, remove oldest recommendations
      if (uniqueRecommendations.length > this.maxStoredRecommendations) {
        if (this.isMovieMode) {
          this.previousMovieRecommendations = uniqueRecommendations.slice(
            uniqueRecommendations.length - this.maxStoredRecommendations
          );
          // Also update the current view
          this.previousRecommendations = this.previousMovieRecommendations;
        } else {
          this.previousShowRecommendations = uniqueRecommendations.slice(
            uniqueRecommendations.length - this.maxStoredRecommendations
          );
          // Also update the current view
          this.previousRecommendations = this.previousShowRecommendations;
        }
      } else {
        if (this.isMovieMode) {
          this.previousMovieRecommendations = uniqueRecommendations;
          // Also update the current view
          this.previousRecommendations = this.previousMovieRecommendations;
        } else {
          this.previousShowRecommendations = uniqueRecommendations;
          // Also update the current view
          this.previousRecommendations = this.previousShowRecommendations;
        }
      }
      
      // Save only the title history to the server for consistency
      try {
        if (this.isMovieMode) {
          // Save only the titles array to the server
          await apiService.saveRecommendations('movie', this.previousMovieRecommendations);
          
          // Store in localStorage for backup only after successfully saving to server
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
          localStorage.setItem('currentMovieRecommendations', JSON.stringify(newRecommendations));
        } else {
          // Save only the titles array to the server
          await apiService.saveRecommendations('tv', this.previousShowRecommendations);
          
          // Store in localStorage for backup only after successfully saving to server
          localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousShowRecommendations));
          localStorage.setItem('currentTVRecommendations', JSON.stringify(newRecommendations));
        }
        
        console.log(`Saved ${this.isMovieMode ? 'movie' : 'TV'} recommendation history to server (${this.previousRecommendations.length} items)`);
      } catch (error) {
        console.error('Error saving recommendation history to server:', error);
        
        // Fallback to localStorage
        if (this.isMovieMode) {
          localStorage.setItem('previousMovieRecommendations', JSON.stringify(this.previousMovieRecommendations));
          localStorage.setItem('currentMovieRecommendations', JSON.stringify(newRecommendations));
        } else {
          localStorage.setItem('previousTVRecommendations', JSON.stringify(this.previousShowRecommendations));
          localStorage.setItem('currentTVRecommendations', JSON.stringify(newRecommendations));
        }
      }
    },
    
    // Clear recommendation history
    async clearRecommendationHistory() {
      // Ask for confirmation with appropriate content type
      const contentType = this.isMovieMode ? 'movies' : 'shows';
      if (confirm(`Clear your history of ${this.previousRecommendations.length} previously recommended ${contentType}?`)) {
        if (this.isMovieMode) {
          // Clear movie history
          this.previousMovieRecommendations = [];
          this.previousRecommendations = [];
          
          // Clear from localStorage
          localStorage.removeItem('previousMovieRecommendations');
          
          // Clear from server
          try {
            await apiService.saveRecommendations('movie', []);
            console.log('Successfully cleared movie history from server');
          } catch (error) {
            console.error('Failed to clear movie history from server:', error);
          }
        } else {
          // Clear TV history
          this.previousShowRecommendations = [];
          this.previousRecommendations = [];
          
          // Clear from localStorage
          localStorage.removeItem('previousTVRecommendations');
          
          // Clear from server
          try {
            await apiService.saveRecommendations('tv', []);
            console.log('Successfully cleared TV history from server');
          } catch (error) {
            console.error('Failed to clear TV history from server:', error);
          }
        }
        
        // No need to call savePreviousRecommendations since we already saved to both localStorage and server
      }
    },
    
    // Update the model selection
    async updateModel() {
      if (this.selectedModel === 'custom') {
        this.isCustomModel = true;
        // If we already have a custom model set, use that as the initial value
        if (openAIService.model && !this.modelOptions.some(model => model.id === openAIService.model)) {
          this.customModel = openAIService.model;
        }
      } else {
        this.isCustomModel = false;
        
        try {
          // Save model setting to server
          await apiService.saveSettings({ openaiModel: this.selectedModel });
          
          // Update service
          openAIService.model = this.selectedModel;
          
          // Also save to the server-side credentials
          await openAIService.configure(
            openAIService.apiKey, 
            this.selectedModel,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize
          );
        } catch (error) {
          console.error('Error saving model settings:', error);
          // Fallback to localStorage
          localStorage.setItem('openaiModel', this.selectedModel);
          openAIService.model = this.selectedModel;
        }
      }
    },
    
    // Update the custom model name
    async updateCustomModel() {
      if (this.customModel.trim()) {
        try {
          // Save custom model setting to server
          await apiService.saveSettings({ openaiModel: this.customModel });
          
          // Update service
          openAIService.model = this.customModel;
          
          // Also save to the server-side credentials
          await openAIService.configure(
            openAIService.apiKey, 
            this.customModel,
            openAIService.baseUrl,
            openAIService.maxTokens,
            openAIService.temperature,
            openAIService.useSampledLibrary,
            openAIService.sampleSize
          );
        } catch (error) {
          console.error('Error saving custom model settings:', error);
          // Fallback to localStorage
          localStorage.setItem('openaiModel', this.customModel);
          openAIService.model = this.customModel;
        }
      }
    },
    
    // Update temperature and save to server
    async updateTemperature() {
      try {
        console.log('Saving temperature to server:', this.temperature);
        await apiService.saveSettings({ aiTemperature: this.temperature.toString() });
        
        // Also save to localStorage as a backup
        localStorage.setItem('aiTemperature', this.temperature.toString());
        
        // Update in OpenAI service
        openAIService.temperature = this.temperature;
      } catch (error) {
        console.error('Error saving temperature to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('aiTemperature', this.temperature.toString());
        openAIService.temperature = this.temperature;
      }
    },
    
    // Save library mode preference to server
    async saveLibraryModePreference() {
      try {
        await apiService.saveSettings({ useSampledLibrary: this.useSampledLibrary });
        openAIService.useSampledLibrary = this.useSampledLibrary;
      } catch (error) {
        console.error('Error saving library mode preference to server:', error);
        // Fallback to localStorage
        localStorage.setItem('useSampledLibrary', this.useSampledLibrary.toString());
        openAIService.useSampledLibrary = this.useSampledLibrary;
      }
    },
    
    // Save sample size to server
    async saveSampleSize() {
      try {
        await apiService.saveSettings({ librarySampleSize: this.sampleSize });
        openAIService.sampleSize = this.sampleSize;
      } catch (error) {
        console.error('Error saving sample size to server:', error);
        // Fallback to localStorage
        localStorage.setItem('librarySampleSize', this.sampleSize.toString());
        openAIService.sampleSize = this.sampleSize;
      }
    },
    
    // Save structured output preference
    async saveStructuredOutputPreference() {
      try {
        console.log('Saving structured output preference:', this.useStructuredOutput);
        await apiService.saveSettings({ useStructuredOutput: this.useStructuredOutput });
        
        // Also save to localStorage as a backup
        localStorage.setItem('useStructuredOutput', this.useStructuredOutput.toString());
        
        // Set the useStructuredOutput property on the OpenAIService
        openAIService.useStructuredOutput = this.useStructuredOutput;
        
        // Reset the conversation history in OpenAI service to ensure proper formatting
        openAIService.resetConversation();
        console.log('Conversation history reset due to structured output setting change');
        
        // Reset current recommendations if any to encourage getting fresh ones with the new format
        if (this.recommendations.length > 0) {
          this.recommendations = [];
          this.recommendationsRequested = false;
          console.log('Cleared current recommendations due to structured output setting change');
        }
      } catch (error) {
        console.error('Error saving structured output preference to server:', error);
        // Fallback to localStorage only
        localStorage.setItem('useStructuredOutput', this.useStructuredOutput.toString());
        openAIService.useStructuredOutput = this.useStructuredOutput;
        
        // Still reset the conversation even if there was an error saving
        openAIService.resetConversation();
      }
    },
    
    // Fetch available models from the API
    async fetchModels() {
      if (!openAIService.isConfigured()) {
        this.fetchError = 'API service is not configured. Please set up your API key first.';
        // Redirect to settings page if API is not configured
        this.goToSettings();
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
          // Redirect to settings page for invalid response format
          this.goToSettings();
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        const errorMessage = error.response?.data?.error?.message || 
                         'Failed to fetch models. Check your API key and URL.';
        
        this.fetchError = errorMessage;
        
        // If the error contains information about an invalid API key, redirect to settings
        if (errorMessage.includes('API key') || 
            errorMessage.includes('authentication') || 
            errorMessage.includes('Incorrect API key') || 
            errorMessage.includes('401') ||
            errorMessage.includes('provide')) {
          // Redirect to settings page
          this.goToSettings();
        }
      } finally {
        this.fetchingModels = false;
      }
    },
    
    // Like a TV show recommendation
    async likeRecommendation(title) {
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
      
      // Save to server (this will also fall back to localStorage if needed)
      await this.saveLikedDislikedLists();
    },
    
    // Dislike a TV show recommendation
    async dislikeRecommendation(title) {
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
      
      // Save to server (this will also fall back to localStorage if needed)
      await this.saveLikedDislikedLists();
    },
    
    // Check if a TV show is liked
    isLiked(title) {
      return this.likedRecommendations.includes(title);
    },
    
    // Check if a TV show is disliked
    isDisliked(title) {
      return this.dislikedRecommendations.includes(title);
    },
    
    // Save liked and disliked lists to server
    async saveLikedDislikedLists() {
      try {
        if (this.isMovieMode) {
          await apiService.savePreferences('movie', 'liked', this.likedRecommendations);
          await apiService.savePreferences('movie', 'disliked', this.dislikedRecommendations);
        } else {
          await apiService.savePreferences('tv', 'liked', this.likedRecommendations);
          await apiService.savePreferences('tv', 'disliked', this.dislikedRecommendations);
        }
      } catch (error) {
        console.error('Error saving preferences to server:', error);
        // Fallback to localStorage
        localStorage.setItem('likedTVRecommendations', JSON.stringify(this.likedRecommendations));
        localStorage.setItem('dislikedTVRecommendations', JSON.stringify(this.dislikedRecommendations));
      }
    },
    
    /**
     * Filter watch history based on the selected history mode
     * @param {Array} historyArray - The original history array to filter
     * @param {string} service - The service ('plex', 'jellyfin', or 'tautulli')
     * @returns {Array} - The filtered history array
     */
    filterWatchHistory(historyArray, service) {
      if (!historyArray || !historyArray.length) {
        console.log(`Empty ${service} history array`);
        return [];
      }
      
      console.log(`Filtering ${historyArray.length} items for ${service} history`);
      
      // Get the appropriate mode and custom days settings based on service
      let historyMode, customDays;
      
      switch (service) {
        case 'plex':
          historyMode = this.plexHistoryMode;
          customDays = this.plexCustomHistoryDays;
          break;
        case 'jellyfin':
          historyMode = this.jellyfinHistoryMode;
          customDays = this.jellyfinCustomHistoryDays;
          break;
        case 'tautulli':
          historyMode = this.tautulliHistoryMode;
          customDays = this.tautulliCustomHistoryDays;
          break;
        case 'trakt':
          historyMode = this.traktHistoryMode;
          customDays = this.traktCustomHistoryDays;
          console.log(`Trakt history mode: ${historyMode}, custom days: ${customDays}`);
          break;
        default:
          // Default to 'all' if service is unknown
          return historyArray;
      }
      
      // Return unfiltered array if using 'all' mode
      if (historyMode === 'all') {
        console.log(`${service} using 'all' mode, returning all ${historyArray.length} items`);
        return historyArray;
      }
      
      // Calculate the cut-off date based on mode
      const now = new Date();
      let cutoffDate;
      
      if (historyMode === 'recent') {
        // Recent mode is hardcoded to 30 days
        cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - 30);
        console.log(`${service} using 'recent' mode, cut-off date: ${cutoffDate.toISOString()}`);
      } else if (historyMode === 'custom') {
        // Custom mode uses user-specified days
        cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - customDays);
        console.log(`${service} using 'custom' mode (${customDays} days), cut-off date: ${cutoffDate.toISOString()}`);
      } else {
        // Unknown mode, return original array
        console.log(`${service} using unknown mode '${historyMode}', returning all items`);
        return historyArray;
      }
      
      // Filter history by date
      // Note: The history item format depends on the source (has lastWatched or watched property)
      const filteredArray = historyArray.filter(item => {
        if (!item) return false;
        
        // Handle different property names for watched date (compatibility with different sources)
        const watchDateStr = item.lastWatched || item.watched;
        if (!watchDateStr) {
          console.log(`${service} item missing watch date:`, item);
          return false;
        }
        
        const watchDate = new Date(watchDateStr);
        const shouldInclude = watchDate >= cutoffDate;
        
        if (service === 'trakt' && !shouldInclude) {
          console.log(`Filtering out Trakt item with date ${watchDate.toISOString()} before cutoff ${cutoffDate.toISOString()}`);
        }
        
        return shouldInclude;
      });
      
      console.log(`${service} history: filtered from ${historyArray.length} to ${filteredArray.length} items`);
      if (filteredArray.length > 0) {
        console.log(`${service} first filtered item:`, filteredArray[0]);
      }
      
      return filteredArray;
    },
    
    /**
     * Start the rotating loading message animation
     */
    startLoadingMessages() {
      // Set initial message based on content type
      const contentType = this.isMovieMode ? 'movie' : 'TV show';
      let baseMessage = `Analyzing your ${contentType} library and generating recommendations...`;
      
      // Prepare history service names to include in message
      const activeServices = [];
      if (this.plexConfigured && this.plexUseHistory) {
        activeServices.push('Plex');
        if (this.plexOnlyMode) {
          baseMessage = 'Analyzing your Plex watch history...';
        }
      }
      
      if (this.jellyfinConfigured && this.jellyfinUseHistory) {
        activeServices.push('Jellyfin');
        if (this.jellyfinOnlyMode) {
          baseMessage = 'Analyzing your Jellyfin watch history...';
        }
      }
      
      if (this.tautulliConfigured && this.tautulliUseHistory) {
        activeServices.push('Tautulli');
        if (this.tautulliOnlyMode) {
          baseMessage = 'Analyzing your Tautulli watch history...';
        }
      }
      
      if (this.traktConfigured && this.traktUseHistory) {
        activeServices.push('Trakt');
        if (this.traktOnlyMode) {
          baseMessage = 'Analyzing your Trakt watch history...';
        }
      }
      
      // If we're not in "only mode" but we have active services, include them in the message
      if (!this.plexOnlyMode && !this.jellyfinOnlyMode && !this.tautulliOnlyMode && !this.traktOnlyMode && activeServices.length > 0) {
        baseMessage = `Analyzing your ${contentType} library and ${activeServices.join('/')} watch history...`;
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
      // Debug the radarrConfigured prop state when requesting recommendations
      console.log('RequestRecommendations: Starting getRecommendations');
      console.log('radarrConfigured prop:', this.radarrConfigured);
      console.log('radarrService.isConfigured():', radarrService.isConfigured());
      console.log('radarrService state:', {
        baseUrl: radarrService.baseUrl,
        apiKey: radarrService.apiKey ? 'set' : 'not set'
      });
      
      // Verify we have content and OpenAI is configured
      // Force-check radarrService.isConfigured() for movie mode to bypass the issue
      const isServiceConfigured = this.isMovieMode 
        ? (this.radarrConfigured || radarrService.isConfigured()) 
        : this.sonarrConfigured;
      
      if (!isServiceConfigured) {
        this.error = `You need to connect to ${this.isMovieMode ? 'Radarr' : 'Sonarr'} first to get recommendations based on your library.`;
        return;
      }
      
      // Check if the service is actually ready with a valid connection
      if (this.isMovieMode) {
        // Always try to load the latest Radarr credentials if we're in movie mode
        console.log('Movie mode active, loading latest Radarr credentials');
        await radarrService.loadCredentials();
        
        if (!radarrService.isConfigured()) {
          console.error("Radarr service isn't fully configured after loading credentials");
          this.error = "Radarr service isn't fully configured. Please check your connection settings.";
          return;
        } else {
          console.log('Radarr credentials loaded successfully', {
            baseUrl: radarrService.baseUrl, 
            apiKey: radarrService.apiKey ? 'set' : 'not set'
          });
        }
      } else if (!this.isMovieMode && (!sonarrService.isConfigured() || !sonarrService.apiKey || !sonarrService.baseUrl)) {
        await sonarrService.loadCredentials();
        if (!sonarrService.isConfigured()) {
          this.error = "Sonarr service isn't fully configured. Please check your connection settings.";
          return;
        }
      }
      
      // Check if the library is empty
      const libraryEmpty = this.isMovieMode 
        ? (!this.localMovies || this.localMovies.length === 0)
        : (!this.series || this.series.length === 0);
        
      if (libraryEmpty) {
        if (this.isMovieMode && radarrService.isConfigured()) {
          // First check if we already have movies in our local cache
          // to avoid unnecessary API calls
          if (this.localMovies && this.localMovies.length > 0) {
            console.log(`Using ${this.localMovies.length} movies from local cache`);
          } else {
            // Try to fetch movies directly from Radarr if Radarr is configured but movies prop is empty
            console.log('Movies array is empty but Radarr is configured, attempting to fetch movies');
            try {
              const moviesData = await radarrService.getMovies();
              if (moviesData && moviesData.length > 0) {
                console.log(`Successfully fetched ${moviesData.length} movies from Radarr directly`);
                // Use the movies we just fetched for recommendations
                this.localMovies = moviesData;
              } else {
                this.error = `Your Radarr library is empty. Add some movies to get recommendations.`;
                return;
              }
            } catch (error) {
              console.error('Error fetching movies directly from Radarr:', error);
              this.error = `Your Radarr library appears to be empty or inaccessible. Add some movies to get recommendations.`;
              return;
            }
          }
        } else {
          this.error = `Your ${this.isMovieMode ? 'Radarr' : 'Sonarr'} library is empty. Add some ${this.isMovieMode ? 'movies' : 'TV shows'} to get recommendations.`;
          return;
        }
      }
      
      if (!openAIService.isConfigured()) {
        this.error = 'AI service is not configured. Please provide an API key.';
        this.goToSettings();
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
        // Convert selectedGenres array to a comma-separated string for the API
        const genreString = this.selectedGenres.length > 0 
          ? this.selectedGenres.join(', ')
          : '';
        
        // Prepare watch history based on user configuration
        let watchHistory = [];
        
        // First try to load from localStorage cache
        let plexHistoryFiltered = [];
        let jellyfinHistoryFiltered = [];
        let tautulliHistoryFiltered = [];
        let traktHistoryFiltered = [];
        
        // Get local Plex history
        if (this.plexUseHistory) {
          let plexHistory;
          if (this.isMovieMode) {
            plexHistory = localStorage.getItem('watchHistoryMovies');
            if (plexHistory) {
              plexHistory = JSON.parse(plexHistory);
            } else {
              plexHistory = this.recentlyWatchedMovies || [];
            }
          } else {
            plexHistory = localStorage.getItem('watchHistoryShows');
            if (plexHistory) {
              plexHistory = JSON.parse(plexHistory);
            } else {
              plexHistory = this.recentlyWatchedShows || [];
            }
          }
          plexHistoryFiltered = this.filterWatchHistory(plexHistory, 'plex');
        }
        
        // Get local Jellyfin history
        if (this.jellyfinUseHistory) {
          let jellyfinHistory;
          if (this.isMovieMode) {
            jellyfinHistory = localStorage.getItem('jellyfinWatchHistoryMovies');
            if (jellyfinHistory) {
              jellyfinHistory = JSON.parse(jellyfinHistory);
            } else {
              jellyfinHistory = this.jellyfinRecentlyWatchedMovies || [];
            }
          } else {
            jellyfinHistory = localStorage.getItem('jellyfinWatchHistoryShows');
            if (jellyfinHistory) {
              jellyfinHistory = JSON.parse(jellyfinHistory);
            } else {
              jellyfinHistory = this.jellyfinRecentlyWatchedShows || [];
            }
          }
          jellyfinHistoryFiltered = this.filterWatchHistory(jellyfinHistory, 'jellyfin');
        }
        
        // Get local Tautulli history
        if (this.tautulliUseHistory) {
          let tautulliHistory;
          if (this.isMovieMode) {
            tautulliHistory = localStorage.getItem('tautulliWatchHistoryMovies');
            if (tautulliHistory) {
              tautulliHistory = JSON.parse(tautulliHistory);
            } else {
              tautulliHistory = this.tautulliRecentlyWatchedMovies || [];
            }
          } else {
            tautulliHistory = localStorage.getItem('tautulliWatchHistoryShows');
            if (tautulliHistory) {
              tautulliHistory = JSON.parse(tautulliHistory);
            } else {
              tautulliHistory = this.tautulliRecentlyWatchedShows || [];
            }
          }
          tautulliHistoryFiltered = this.filterWatchHistory(tautulliHistory, 'tautulli');
        }
        
        // Get local Trakt history
        if (this.traktUseHistory) {
          let traktHistory;
          if (this.isMovieMode) {
            traktHistory = localStorage.getItem('traktWatchHistoryMovies');
            if (traktHistory) {
              traktHistory = JSON.parse(traktHistory);
            } else {
              traktHistory = this.traktRecentlyWatchedMovies || [];
            }
          } else {
            traktHistory = localStorage.getItem('traktWatchHistoryShows');
            if (traktHistory) {
              traktHistory = JSON.parse(traktHistory);
            } else {
              traktHistory = this.traktRecentlyWatchedShows || [];
            }
          }
          traktHistoryFiltered = this.filterWatchHistory(traktHistory, 'trakt');
        }
        
        // If no local cache, fall back to props
        if (plexHistoryFiltered.length === 0 && this.plexUseHistory) {
          console.log('No cached Plex history found, using prop data');
          const plexHistory = this.isMovieMode ? this.recentlyWatchedMovies || [] : this.recentlyWatchedShows || [];
          plexHistoryFiltered = this.filterWatchHistory(plexHistory, 'plex');
        }
        
        if (jellyfinHistoryFiltered.length === 0 && this.jellyfinUseHistory) {
          console.log('No cached Jellyfin history found, using prop data');
          const jellyfinHistory = this.isMovieMode ? this.jellyfinRecentlyWatchedMovies || [] : this.jellyfinRecentlyWatchedShows || [];
          jellyfinHistoryFiltered = this.filterWatchHistory(jellyfinHistory, 'jellyfin');
        }
        
        if (tautulliHistoryFiltered.length === 0 && this.tautulliUseHistory) {
          console.log('No cached Tautulli history found, using prop data');
          const tautulliHistory = this.isMovieMode ? this.tautulliRecentlyWatchedMovies || [] : this.tautulliRecentlyWatchedShows || [];
          tautulliHistoryFiltered = this.filterWatchHistory(tautulliHistory, 'tautulli');
        }
        
        if (traktHistoryFiltered.length === 0 && this.traktUseHistory) {
          console.log('No cached Trakt history found, using prop data');
          const traktHistory = this.isMovieMode ? this.traktRecentlyWatchedMovies || [] : this.traktRecentlyWatchedShows || [];
          traktHistoryFiltered = this.filterWatchHistory(traktHistory, 'trakt');
        }
        
        // Combine histories based on "only mode" settings
        if (this.plexOnlyMode && this.plexUseHistory) {
          watchHistory = plexHistoryFiltered;
        } else if (this.jellyfinOnlyMode && this.jellyfinUseHistory) {
          watchHistory = jellyfinHistoryFiltered;
        } else if (this.tautulliOnlyMode && this.tautulliUseHistory) {
          watchHistory = tautulliHistoryFiltered;
        } else if (this.traktOnlyMode && this.traktUseHistory) {
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
        
        console.log(`Using watch history: ${watchHistory.length} items (Plex: ${plexHistoryFiltered.length}, Jellyfin: ${jellyfinHistoryFiltered.length}, Tautulli: ${tautulliHistoryFiltered.length}, Trakt: ${traktHistoryFiltered.length})`);
        
        // If no watch history is available or all are disabled, use empty array
        if (watchHistory.length === 0) {
          console.log('No watch history is being used for recommendations');
          
          // If still no history found, refresh from server as last resort
          if (this.plexUseHistory || this.jellyfinUseHistory || this.tautulliUseHistory || this.traktUseHistory) {
            try {
              console.log('No watch history found locally, trying to fetch from server...');
              const historyType = this.isMovieMode ? 'movies' : 'shows';
              const serverHistory = await apiService.getWatchHistory(historyType);
              
              if (serverHistory && serverHistory.length > 0) {
                console.log(`Loaded ${serverHistory.length} items from server watch history`);
                
                // Filter by source based on user preferences
                if (this.plexOnlyMode && this.plexUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'plex');
                } else if (this.jellyfinOnlyMode && this.jellyfinUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'jellyfin');
                } else if (this.tautulliOnlyMode && this.tautulliUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'tautulli');
                } else if (this.traktOnlyMode && this.traktUseHistory) {
                  watchHistory = serverHistory.filter(item => item.source === 'trakt');
                } else {
                  // Apply filters for each service if they're enabled
                  let filteredHistory = [];
                  
                  if (this.plexUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'plex')];
                  }
                  
                  if (this.jellyfinUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'jellyfin')];
                  }
                  
                  if (this.tautulliUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'tautulli')];
                  }
                  
                  if (this.traktUseHistory) {
                    filteredHistory = [...filteredHistory, ...serverHistory.filter(item => item.source === 'trakt')];
                  }
                  
                  watchHistory = filteredHistory;
                }
                
                console.log(`Using ${watchHistory.length} items from server history after filtering`);
              }
            } catch (error) {
              console.error('Error fetching watch history from server:', error);
            }
          }
        }
        
        // Get initial recommendations using the appropriate service method based on mode
        if (this.isMovieMode) {
          console.log("Starting movie recommendations...");
          console.log("Movies array:", this.localMovies ? this.localMovies.length : 0, "items");
          console.log("NumRecommendations:", this.numRecommendations);
          console.log("GenreString:", genreString);
          console.log("PreviousMovieRecommendations:", this.previousMovieRecommendations.length, "items");
          console.log("Watch history:", watchHistory.length, "items");
          
          try {
            // Use movie recommendations method
            this.recommendations = await openAIService.getMovieRecommendations(
              this.localMovies, // Use localMovies array for movie mode
              this.numRecommendations,
              genreString,
              this.previousMovieRecommendations, // Use movie-specific history
              this.likedRecommendations,
              this.dislikedRecommendations,
              watchHistory,  // This includes Trakt history if traktUseHistory is true
              this.plexOnlyMode || this.jellyfinOnlyMode || this.tautulliOnlyMode || this.traktOnlyMode,
              this.customVibe,
              this.selectedLanguage
            );
            
            // Log what watch history was actually used
            console.log("Watch history used for recommendations:", {
              total: watchHistory.length,
              plex: this.plexUseHistory ? plexHistoryFiltered.length : 0,
              jellyfin: this.jellyfinUseHistory ? jellyfinHistoryFiltered.length : 0,
              tautulli: this.tautulliUseHistory ? tautulliHistoryFiltered.length : 0,
              trakt: this.traktUseHistory ? traktHistoryFiltered.length : 0,
              onlyMode: this.plexOnlyMode ? 'plex' : this.jellyfinOnlyMode ? 'jellyfin' : this.tautulliOnlyMode ? 'tautulli' : this.traktOnlyMode ? 'trakt' : 'combined'
            });
            
            // Log a sample of watch history items to debug
            const watchHistorySample = watchHistory.slice(0, 3);
            console.log("Watch history sample (first 3 items):", 
              watchHistorySample.map(item => {
                try {
                  let source = 'unknown';
                  if (item.type === 'movie' && item.traktId) {
                    source = 'trakt';
                  } else if (item.plexLibraryTitle) {
                    source = 'plex';
                  } else if (item.jellyfinId) {
                    source = 'jellyfin';
                  } else if (item.tautulliId) {
                    source = 'tautulli';
                  }
                  
                  return {
                    title: item.title || item.name || (typeof item === 'string' ? item : ''),
                    watched: item.watched || item.lastWatched || 'no date',
                    source,
                    type: item.type || 'unknown'
                  };
                } catch (error) {
                  console.error('Error mapping watch history item:', error, item);
                  return { title: 'Error parsing item', error: error.message };
                }
              })
            );
            console.log("Movie recommendations completed successfully:", this.recommendations);
          } catch (error) {
            console.error("Error getting movie recommendations:", error);
            throw error; // Rethrow to be caught by the outer try/catch
          }
        } else {
          // Use TV show recommendations method
          this.recommendations = await openAIService.getRecommendations(
            this.series, 
            this.numRecommendations,
            genreString,
            this.previousRecommendations,
            this.likedRecommendations,
            this.dislikedRecommendations,
            watchHistory,
            this.plexOnlyMode || this.jellyfinOnlyMode || this.tautulliOnlyMode || this.traktOnlyMode,
            this.customVibe,
            this.selectedLanguage
          );
        }
        
        // Update loading message to include genres if selected
        const loadingMessage = document.querySelector('.loading p');
        if (loadingMessage && this.selectedGenres.length > 0) {
          let source = this.isMovieMode ? 'movie library' : 'TV library';
          if (this.plexOnlyMode) {
            source = 'Plex watch history';
          } else if (this.jellyfinOnlyMode) {
            source = 'Jellyfin watch history';
          } else if (this.tautulliOnlyMode) {
            source = 'Tautulli watch history';
          } else if (this.traktOnlyMode) {
            source = 'Trakt watch history';
          } else if (this.plexConfigured || this.jellyfinConfigured || this.tautulliConfigured || this.traktConfigured) {
            source = `${this.isMovieMode ? 'movie' : 'TV'} library and watch history`;
          }
          
          loadingMessage.textContent = `Analyzing your ${source} and generating ${genreString} recommendations...`;
        }
        
        // Filter out content that is already in the library, already recommended, or liked/disliked
        // Always do this filtering regardless of mode to ensure clean recommendations
        if (this.recommendations.length > 0) {
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
          // Redirect to settings if it's an API key issue
          if (error.message.includes('API key') || error.message.includes('not configured')) {
            this.goToSettings();
          }
        } else if (error.response && error.response.data && error.response.data.error) {
          const errorMsg = error.response.data.error.message || 'Unknown API error';
          this.error = `API Error: ${errorMsg}`;
          
          // Redirect to settings if it's an API key issue
          if (errorMsg.includes('API key') || 
              errorMsg.includes('authentication') || 
              errorMsg.includes('401') || 
              errorMsg.includes('provide')) {
            this.goToSettings();
          }
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
      
      console.log(`Getting ${additionalCount} additional ${this.isMovieMode ? 'movie' : 'TV show'} recommendations after filtering (recursion depth: ${recursionDepth})`);
      
      // Update base message for the message rotator to use
      const baseMessage = `Getting additional recommendations to match your request...`;
      this.currentLoadingMessage = baseMessage;
      
      try {
        // Get additional recommendations
        // Include current recommendations in the exclusion list
        const currentTitles = this.recommendations.map(rec => rec.title);
        const previousRecsList = this.isMovieMode ? this.previousMovieRecommendations : this.previousShowRecommendations;
        const updatedPrevious = [...new Set([...previousRecsList, ...currentTitles])];
        
        // Request more recommendations than we need to account for filtering
        const requestCount = Math.min(additionalCount * 1.5, 20); // Request 50% more, up to 20 max
        
        // Use the appropriate method based on content type mode
        let additionalRecommendations;
        if (this.isMovieMode) {
          // Use movie recommendations method
          additionalRecommendations = await openAIService.getAdditionalMovieRecommendations(
            requestCount,
            updatedPrevious,
            genreString,
            this.customVibe,
            this.selectedLanguage
          );
        } else {
          // Use TV show recommendations method
          additionalRecommendations = await openAIService.getAdditionalTVRecommendations(
            requestCount,
            updatedPrevious,
            genreString,
            this.customVibe,
            this.selectedLanguage
          );
        }
        
        // Always filter the additional recommendations, including checking for partial matches
        let filteredAdditional = additionalRecommendations;
        if (filteredAdditional.length > 0) {
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
     * Filter out shows that already exist in the Sonarr/Radarr library or have been previously
     * recommended, liked, or disliked
     * @param {Array} recommendations - The recommended shows
     * @returns {Promise<Array>} - Filtered recommendations
     */
    async filterExistingShows(recommendations) {
      // Check if appropriate service is configured based on current mode
      if (this.isMovieMode) {
        if (!radarrService.isConfigured() || !this.movies.length) {
          return recommendations;
        }
      } else {
        if (!sonarrService.isConfigured() || !this.series.length) {
          return recommendations;
        }
      }
      
      try {
        // Create a normalized map of existing titles in the library
        const existingTitles = new Set(
          this.isMovieMode 
            ? this.localMovies.map(movie => movie.title.toLowerCase())
            : this.series.map(show => show.title.toLowerCase())
        );
        
        // Add liked recommendations to the filter set
        const likedRecommendationTitles = new Set(
          this.likedRecommendations.map(title => title.toLowerCase())
        );
        
        // Add disliked recommendations to the filter set
        const dislikedRecommendationTitles = new Set(
          this.dislikedRecommendations.map(title => title.toLowerCase())
        );
        
        // Add previous recommendations to the filter set - use the appropriate history
        const previousList = this.isMovieMode ? this.previousMovieRecommendations : this.previousShowRecommendations;
        const previousRecommendationTitles = new Set(
          previousList.map(title => title.toLowerCase())
        );
        
        // Filter out recommendations that already exist in the library, liked list, disliked list, or previous recommendations
        const filteredRecommendations = recommendations.filter(rec => {
          const normalizedTitle = rec.title.toLowerCase();
          
          // Check for exact matches
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
              // Check if one is a substring of the other (handles cases like "The Matrix" vs "Matrix")
              if (normalizedTitle.includes(libraryTitle) || libraryTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          // For liked items
          for (const likedTitle of likedRecommendationTitles) {
            if (normalizedTitle.length > 4 && likedTitle.length > 4) {
              if (normalizedTitle.includes(likedTitle) || likedTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          // For disliked items
          for (const dislikedTitle of dislikedRecommendationTitles) {
            if (normalizedTitle.length > 4 && dislikedTitle.length > 4) {
              if (normalizedTitle.includes(dislikedTitle) || dislikedTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          // For previous recommendations
          for (const prevTitle of previousRecommendationTitles) {
            if (normalizedTitle.length > 4 && prevTitle.length > 4) {
              if (normalizedTitle.includes(prevTitle) || prevTitle.includes(normalizedTitle)) {
                return false;
              }
            }
          }
          
          return true;
        });
        
        const contentType = this.isMovieMode ? 'movies' : 'shows';
        console.log(`Filtered out ${recommendations.length - filteredRecommendations.length} ${contentType} that already exist in the library, liked/disliked lists, or recommendation history`);
        return filteredRecommendations;
      } catch (error) {
        console.error(`Error filtering existing ${this.isMovieMode ? 'movies' : 'shows'}:`, error);
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
          
          // Use the appropriate poster fetching method based on content type
          const posterUrl = this.isMovieMode 
            ? await imageService.getPosterForMovie(cleanTitle)
            : await imageService.getPosterForShow(cleanTitle);
          
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
        let seasons = [];
        let showSeasonWarning = false;
        if (seriesInfo.seasons && seriesInfo.seasons.length > 0) {
          seasons = seriesInfo.seasons
            .filter(season => season.seasonNumber > 0) // Filter out specials (season 0)
            .sort((a, b) => a.seasonNumber - b.seasonNumber); // Sort by season number
        } else {
          // If no seasons are returned, show a warning but don't create fake seasons
          showSeasonWarning = true;
          // Use any seasons information from tvdbId if present
          if (seriesInfo.tvdbId) {
            console.log('No season information available for series:', title);
          }
        }
        
        this.currentSeries = {
          title: title,
          seasons: seasons,
          showSeasonWarning: showSeasonWarning
        };
        
        // If seasons are available, set only season 1 selected by default
        if (this.currentSeries.seasons.length > 0) {
          const season1 = this.currentSeries.seasons.find(s => s.seasonNumber === 1);
          this.selectedSeasons = season1 ? [1] : [this.currentSeries.seasons[0].seasonNumber];
        } else {
          this.selectedSeasons = [];
        }
        
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
      if (!this.currentSeries || (!this.selectedSeasons.length && !this.currentSeries.showSeasonWarning)) {
        return;
      }
      
      try {
        // Set requesting state
        this.requestingSeries = this.currentSeries.title;
        
        // Close modal
        this.showSeasonModal = false;
        
        // If no season info is available (showSeasonWarning is true), 
        // request the series with null selectedSeasons to indicate all seasons
        if (this.currentSeries.showSeasonWarning) {
          // When there was no season info available, pass null for selectedSeasons
          // to let Sonarr handle all seasons
          const response = await sonarrService.addSeries(
            this.currentSeries.title,
            null, // Null indicates all seasons should be monitored
            this.selectedQualityProfile,
            this.selectedRootFolder
          );
          
          // Store success response
          this.requestStatus[this.currentSeries.title] = {
            success: true,
            message: 'Successfully added to Sonarr with all seasons monitored',
            details: response
          };
        } else {
          // Normal flow - add series with explicitly selected seasons
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
        }
        
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
     * Request a series or movie to be added
     * @param {string} title - The title to add
     */
    requestSeries(title) {
      if (this.isMovieMode) {
        this.requestMovie(title);
      } else {
        this.openSeasonSelector(title);
      }
    },
    
    /**
     * Open movie confirmation modal
     * @param {string} title - The movie title to add
     */
    async requestMovie(title) {
      if (!radarrService.isConfigured()) {
        this.error = 'Radarr service is not configured.';
        return;
      }
      
      try {
        // Set requesting state for this movie
        this.requestingSeries = title; // Reuse the same state variable
        
        // Check if movie already exists in Radarr
        const existingMovie = await radarrService.findExistingMovieByTitle(title);
        
        if (existingMovie) {
          // Movie already exists in library
          this.requestStatus[title] = {
            success: true,
            message: 'Movie already exists in your Radarr library',
            alreadyExists: true
          };
          
          this.requestingSeries = null;
          return;
        }
        
        // Look up movie details
        const lookupData = await radarrService._apiRequest('/api/v3/movie/lookup', 'GET', null, { term: title });
        
        if (!lookupData || lookupData.length === 0) {
          throw new Error(`Movie "${title}" not found in Radarr lookup.`);
        }
        
        // Set current movie data
        this.currentMovie = {
          title: title,
          tmdbId: lookupData[0].tmdbId,
          year: lookupData[0].year
        };
        
        // Fetch available quality profiles and root folders
        this.loadingMovieFolders = true;
        
        try {
          const [qualityProfiles, rootFolders] = await Promise.all([
            radarrService.getQualityProfiles(),
            radarrService.getRootFolders()
          ]);
          
          this.movieQualityProfiles = qualityProfiles;
          this.movieRootFolders = rootFolders;
          
          // Set default selections
          if (rootFolders.length > 0) {
            this.selectedMovieRootFolder = rootFolders[0].path;
          }
          
          if (qualityProfiles.length > 0) {
            this.selectedMovieQualityProfile = qualityProfiles[0].id;
          }
        } finally {
          this.loadingMovieFolders = false;
        }
        
        // Show the modal
        this.showMovieModal = true;
        
        // Clear requesting state
        this.requestingSeries = null;
        
      } catch (error) {
        console.error(`Error preparing movie "${title}" for Radarr:`, error);
        
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
     * Close the movie confirmation modal
     */
    closeMovieModal() {
      this.showMovieModal = false;
      this.currentMovie = null;
      this.selectedMovieRootFolder = null;
      this.selectedMovieQualityProfile = null;
      this.movieRootFolders = [];
      this.movieQualityProfiles = [];
    },
    
    /**
     * Confirm adding a movie to Radarr
     */
    async confirmAddMovie() {
      if (!this.currentMovie) {
        return;
      }
      
      try {
        // Set requesting state
        this.requestingSeries = this.currentMovie.title;
        
        // Close modal
        this.showMovieModal = false;
        
        // Add movie to Radarr with selected options
        const response = await radarrService.addMovie(
          this.currentMovie.title,
          this.selectedMovieQualityProfile,
          this.selectedMovieRootFolder
        );
        
        // Store success response
        this.requestStatus[this.currentMovie.title] = {
          success: true,
          message: 'Successfully added to Radarr',
          details: response
        };
        
      } catch (error) {
        console.error(`Error adding movie "${this.currentMovie.title}" to Radarr:`, error);
        
        // Store error
        this.requestStatus[this.currentMovie.title] = {
          success: false,
          message: `Error: ${error.message || 'Unknown error'}`
        };
        
      } finally {
        // Clear requesting state and current movie
        this.requestingSeries = null;
        this.currentMovie = null;
        this.selectedMovieRootFolder = null;
        this.selectedMovieQualityProfile = null;
      }
    },
    
    /**
     * Handle window resize events to update the grid layout
     */
    handleResize() {
      // Force a re-computation of the gridStyle computed property
      this.$forceUpdate();
    },
    
    /**
     * Load all saved settings from server via API service
     */
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
            this.numRecommendations = numRecs;
            console.log('Setting numRecommendations from server:', this.numRecommendations);
          }
        }
        
        // Load columns count setting
        if (settings.columnsCount !== undefined) {
          const columns = parseInt(settings.columnsCount, 10);
          if (!isNaN(columns) && columns >= 1 && columns <= 4) {
            this.columnsCount = columns;
            console.log('Setting columnsCount from server:', this.columnsCount);
          }
        }
        
        // Temperature setting
        if (settings.aiTemperature !== undefined) {
          const temp = parseFloat(settings.aiTemperature);
          if (!isNaN(temp) && temp >= 0 && temp <= 1) {
            this.temperature = temp;
          }
        }
        
        // Library sampling settings
        if (settings.useSampledLibrary !== undefined) {
          this.useSampledLibrary = settings.useSampledLibrary === true || settings.useSampledLibrary === 'true';
        }
        
        if (settings.librarySampleSize !== undefined) {
          const sampleSize = parseInt(settings.librarySampleSize, 10);
          if (!isNaN(sampleSize) && sampleSize >= 5 && sampleSize <= 1000) {
            this.sampleSize = sampleSize;
          }
        }
        
        // Structured output setting
        if (settings.useStructuredOutput !== undefined) {
          this.useStructuredOutput = settings.useStructuredOutput === true || settings.useStructuredOutput === 'true';
          // Also set it in the OpenAIService
          openAIService.useStructuredOutput = this.useStructuredOutput;
        }
        
        // Plex settings
        if (settings.plexHistoryMode) {
          this.plexHistoryMode = settings.plexHistoryMode;
        }
        
        if (settings.plexOnlyMode !== undefined) {
          this.plexOnlyMode = settings.plexOnlyMode;
        }
        
        if (settings.plexUseHistory !== undefined) {
          this.plexUseHistory = settings.plexUseHistory;
        }
        
        if (settings.plexCustomHistoryDays) {
          this.plexCustomHistoryDays = parseInt(settings.plexCustomHistoryDays, 10);
        }
        
        // Jellyfin settings
        if (settings.jellyfinHistoryMode) {
          this.jellyfinHistoryMode = settings.jellyfinHistoryMode;
        }
        
        if (settings.jellyfinOnlyMode !== undefined) {
          this.jellyfinOnlyMode = settings.jellyfinOnlyMode;
        }
        
        if (settings.jellyfinUseHistory !== undefined) {
          this.jellyfinUseHistory = settings.jellyfinUseHistory;
        }
        
        if (settings.jellyfinCustomHistoryDays) {
          this.jellyfinCustomHistoryDays = parseInt(settings.jellyfinCustomHistoryDays, 10);
        }
        
        // Tautulli settings
        if (settings.tautulliHistoryMode) {
          this.tautulliHistoryMode = settings.tautulliHistoryMode;
        }
        
        if (settings.tautulliOnlyMode !== undefined) {
          this.tautulliOnlyMode = settings.tautulliOnlyMode;
        }
        
        if (settings.tautulliUseHistory !== undefined) {
          this.tautulliUseHistory = settings.tautulliUseHistory;
        }
        
        if (settings.tautulliCustomHistoryDays) {
          this.tautulliCustomHistoryDays = parseInt(settings.tautulliCustomHistoryDays, 10);
        }
        
        // Trakt settings
        console.log('Loading Trakt settings from server:', { 
          traktHistoryMode: settings.traktHistoryMode, 
          traktOnlyMode: settings.traktOnlyMode,
          traktUseHistory: settings.traktUseHistory,
          traktCustomHistoryDays: settings.traktCustomHistoryDays
        });
        
        if (settings.traktHistoryMode) {
          this.traktHistoryMode = settings.traktHistoryMode;
        }
        
        if (settings.traktOnlyMode !== undefined) {
          this.traktOnlyMode = settings.traktOnlyMode;
        }
        
        if (settings.traktUseHistory !== undefined) {
          // Make sure we convert it to a boolean in case it's stored as a string
          this.traktUseHistory = settings.traktUseHistory === true || settings.traktUseHistory === 'true';
          console.log('Trakt history use flag set to:', this.traktUseHistory, 'from value:', settings.traktUseHistory);
        } else {
          console.log('traktUseHistory setting not found in server settings, using default:', this.traktUseHistory);
        }
        
        if (settings.traktCustomHistoryDays) {
          this.traktCustomHistoryDays = parseInt(settings.traktCustomHistoryDays, 10);
        }
      } catch (error) {
        console.error('Error loading settings from server:', error);
      }
    }
  },
  async mounted() {
    console.log('RequestRecommendations component mounted');
    console.log('Props: radarrConfigured=', this.radarrConfigured);
    
    // Load all saved settings from the server
    await this.loadSavedSettings();
    
    // Check if Radarr service is configured directly
    if (this.isMovieMode) {
      // First check props
      console.log('Movie mode active, checking Radarr configuration');
      
      // Only load credentials if needed and if movies array is empty
      // This prevents double loading
      if ((!this.movies || this.movies.length === 0) && 
          (!this.radarrConfigured || !radarrService.isConfigured())) {
        console.log('radarrConfigured prop is false or no movies loaded, checking service directly');
        
        // Check if Radarr service is configured directly
        if (!radarrService.isConfigured()) {
          console.log('Radarr service not configured in memory, trying to load credentials');
          // Try to load credentials from server-side storage
          await radarrService.loadCredentials();
          console.log('After loading credentials, Radarr service configured:', radarrService.isConfigured());
        }
      }
    }
    
    // Check if OpenAI is already configured
    this.openaiConfigured = openAIService.isConfigured();
    
    // Initialize model selection
    const currentModel = openAIService.model || 'gpt-3.5-turbo';
    
    // Set to custom by default, we'll update once models are fetched
    this.customModel = currentModel;
    this.selectedModel = 'custom';
    this.isCustomModel = true;
    
    // Add window resize listener to update grid style when screen size changes
    window.addEventListener('resize', this.handleResize);
    
    // We've already loaded temperature from server in loadSavedSettings
    // Only check localStorage or service if the temperature is still at default (0.8)
    if (this.temperature === 0.8) {
      // Try to get from localStorage first
      const savedTemp = localStorage.getItem('aiTemperature');
      if (savedTemp) {
        const temp = parseFloat(savedTemp);
        // Validate the value is within range
        if (!isNaN(temp) && temp >= 0 && temp <= 1) {
          this.temperature = temp;
          console.log('Setting temperature from localStorage:', this.temperature);
        }
      } else if (openAIService.temperature !== 0.8) {
        // If still at default, try the service value
        this.temperature = openAIService.temperature;
        console.log('Setting temperature from OpenAIService:', this.temperature);
      }
    } else {
      console.log('Using temperature from server settings:', this.temperature);
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
        // Check if the current model is in the fetched models
        const modelExists = this.modelOptions.some(model => model.id === currentModel);
        
        if (modelExists) {
          // If current model exists in options, select it
          this.selectedModel = currentModel;
          this.isCustomModel = false;
        }
      });
    }
    
    // We've already loaded the server settings in loadSavedSettings
    // But check localStorage as a fallback if server settings didn't include these
    if (this.numRecommendations === 5) { // 5 is the default - if it's still default, check localStorage
      // Restore saved recommendation count from localStorage (if exists)
      const savedCount = localStorage.getItem('numRecommendations');
      if (savedCount) {
        const numRecs = parseInt(savedCount, 10);
        // Validate the value is within range
        if (!isNaN(numRecs) && numRecs >= 1 && numRecs <= 50) {
          this.numRecommendations = numRecs;
          console.log('Setting numRecommendations from localStorage:', this.numRecommendations);
        }
      }
    }
    
    // Check for structured output setting in localStorage if we didn't get it from server
    const savedStructuredOutput = localStorage.getItem('useStructuredOutput');
    if (savedStructuredOutput !== null) {
      const useStructured = savedStructuredOutput === 'true';
      this.useStructuredOutput = useStructured;
      openAIService.useStructuredOutput = useStructured;
      console.log('Setting useStructuredOutput from localStorage:', useStructured);
    }
    
    if (this.columnsCount === 2) { // 2 is the default - if it's still default, check localStorage
      // Restore saved columns count from localStorage (if exists)
      const savedColumnsCount = localStorage.getItem('columnsCount');
      if (savedColumnsCount) {
        const columns = parseInt(savedColumnsCount, 10);
        // Validate the value is within range
        if (!isNaN(columns) && columns >= 1 && columns <= 4) {
          this.columnsCount = columns;
          console.log('Setting columnsCount from localStorage:', this.columnsCount);
        }
      }
    }
    
    // Set initial movie mode from props if provided, otherwise use saved preference
    if (this.initialMovieMode) {
      this.isMovieMode = true;
    } else {
      // Restore saved content type preference (movie/TV toggle)
      const savedMovieMode = localStorage.getItem('isMovieMode');
      if (savedMovieMode) {
        this.isMovieMode = savedMovieMode === 'true';
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
    
    // Load custom vibe from settings
    const settings = await apiService.getSettings();
    if (settings && settings.tvCustomVibe) {
      this.customVibe = settings.tvCustomVibe;
    } else {
      // Fallback to localStorage if not in server settings
      const savedVibe = localStorage.getItem('tvCustomVibe');
      if (savedVibe) {
        this.customVibe = savedVibe;
      }
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
    
    // Restore saved Plex use history setting
    const savedPlexUseHistory = localStorage.getItem('plexUseHistory');
    if (savedPlexUseHistory !== null) {
      this.plexUseHistory = savedPlexUseHistory === 'true';
    }
    
    // Restore saved Plex custom history days
    const savedPlexCustomHistoryDays = localStorage.getItem('plexCustomHistoryDays');
    if (savedPlexCustomHistoryDays) {
      this.plexCustomHistoryDays = parseInt(savedPlexCustomHistoryDays, 10);
    }
    
    // Initialize history arrays with empty arrays to prevent issues
    this.previousShowRecommendations = [];
    this.previousMovieRecommendations = [];
    
    try {
      console.log("Loading recommendations from server...");
      
      // Try to load recommendations from server first
      const tvRecsResponse = await apiService.getRecommendations('tv') || [];
      const movieRecsResponse = await apiService.getRecommendations('movie') || [];
      
      // When the tvRecsResponse or movieRecsResponse are empty arrays,
      // this means the server cleared the data or doesn't have any data.
      // In this case, we should:
      // 1. Use the empty arrays (don't fall back to localStorage)
      // 2. Clear localStorage itself to be consistent with server
      
      console.log("TV recommendations from server:", tvRecsResponse ? tvRecsResponse.length : 0, "items");
      console.log("Movie recommendations from server:", movieRecsResponse ? movieRecsResponse.length : 0, "items");
      
      // Process TV recommendations
      if (Array.isArray(tvRecsResponse) && tvRecsResponse.length > 0) {
        if (typeof tvRecsResponse[0] === 'string') {
          // Simple array of titles - this is the history list
          console.log("Loaded TV history from server (string array):", tvRecsResponse.length, "items");
          this.previousShowRecommendations = tvRecsResponse;
          
          // Make sure we update the currently displayed history count if in TV mode
          if (!this.isMovieMode) {
            this.previousRecommendations = [...this.previousShowRecommendations];
          }
          
          // Only save to localStorage for backup if there are actually recommendations
          if (tvRecsResponse && tvRecsResponse.length > 0) {
            localStorage.setItem('previousTVRecommendations', JSON.stringify(tvRecsResponse));
          } else {
            // If the server returned empty, clear the localStorage as well
            localStorage.removeItem('previousTVRecommendations');
          }
        } else {
          // Full recommendation objects with title property
          console.log("Loaded full TV recommendations from server:", tvRecsResponse.length, "items");
          
          // Store them as full recommendations if we're in TV mode
          if (!this.isMovieMode && tvRecsResponse.some(rec => rec.title && (rec.description || rec.fullText))) {
            this.recommendations = tvRecsResponse;
            
            // Save current recommendations to localStorage for backup
            localStorage.setItem('currentTVRecommendations', JSON.stringify(tvRecsResponse));
          }
          
          // Extract titles for the history
          const extractedTitles = tvRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
            
          // Combine with existing history, handling duplicates
          const existingTitles = this.previousShowRecommendations || [];
          const combinedTitles = [...new Set([...existingTitles, ...extractedTitles])];
          
          this.previousShowRecommendations = combinedTitles;
          
          // Make sure we update the currently displayed history count if in TV mode
          if (!this.isMovieMode) {
            this.previousRecommendations = [...this.previousShowRecommendations];
          }
          
          // Only save to localStorage if there are actually recommendations
          if (combinedTitles && combinedTitles.length > 0) {
            localStorage.setItem('previousTVRecommendations', JSON.stringify(combinedTitles));
          } else {
            // If combined titles is empty, clear localStorage
            localStorage.removeItem('previousTVRecommendations');
          }
        }
      }
      
      // Process movie recommendations
      if (Array.isArray(movieRecsResponse) && movieRecsResponse.length > 0) {
        if (typeof movieRecsResponse[0] === 'string') {
          // Simple array of titles - this is the history list
          console.log("Loaded movie history from server (string array):", movieRecsResponse.length, "items");
          this.previousMovieRecommendations = movieRecsResponse;
          
          // Make sure we update the currently displayed history count if in movie mode
          if (this.isMovieMode) {
            this.previousRecommendations = [...this.previousMovieRecommendations];
          }
          
          // Only save to localStorage for backup if there are actually recommendations
          if (movieRecsResponse && movieRecsResponse.length > 0) {
            localStorage.setItem('previousMovieRecommendations', JSON.stringify(movieRecsResponse));
          } else {
            // If the server returned empty, clear the localStorage as well
            localStorage.removeItem('previousMovieRecommendations');
          }
        } else {
          // Full recommendation objects with title property
          console.log("Loaded full movie recommendations from server:", movieRecsResponse.length, "items");
          
          // Store them as full recommendations if we're in movie mode
          if (this.isMovieMode && movieRecsResponse.some(rec => rec.title && (rec.description || rec.fullText))) {
            this.recommendations = movieRecsResponse;
            
            // Save current recommendations to localStorage for backup
            localStorage.setItem('currentMovieRecommendations', JSON.stringify(movieRecsResponse));
          }
          
          // Extract titles for the history
          const extractedTitles = movieRecsResponse
            .map(rec => typeof rec === 'string' ? rec : rec.title)
            .filter(title => !!title);
            
          // Combine with existing history, handling duplicates
          const existingTitles = this.previousMovieRecommendations || [];
          const combinedTitles = [...new Set([...existingTitles, ...extractedTitles])];
          
          this.previousMovieRecommendations = combinedTitles;
          
          // Make sure we update the currently displayed history count if in movie mode
          if (this.isMovieMode) {
            this.previousRecommendations = [...this.previousMovieRecommendations];
          }
          
          // Only save to localStorage if there are actually recommendations
          if (combinedTitles && combinedTitles.length > 0) {
            localStorage.setItem('previousMovieRecommendations', JSON.stringify(combinedTitles));
          } else {
            // If combined titles is empty, clear localStorage
            localStorage.removeItem('previousMovieRecommendations');
          }
        }
      }
      
      // Debug current history counts
      console.log("After loading from server - TV history count:", this.previousShowRecommendations.length);
      console.log("After loading from server - Movie history count:", this.previousMovieRecommendations.length);
      console.log("Currently displayed history count:", this.previousRecommendations.length);
      
      // Load liked/disliked preferences from server
      try {
        const likedTV = await apiService.getPreferences('tv', 'liked');
        if (Array.isArray(likedTV)) {
          this.likedRecommendations = likedTV;
        }
        
        const dislikedTV = await apiService.getPreferences('tv', 'disliked');
        if (Array.isArray(dislikedTV)) {
          this.dislikedRecommendations = dislikedTV;
        }
      } catch (prefError) {
        console.error("Error loading preferences from server:", prefError);
      }
      
    } catch (error) {
      console.error("Error loading from server, falling back to localStorage:", error);
      
      // Fall back to loading from localStorage
      // Load previous TV recommendations from localStorage
      const savedPreviousTVRecommendations = localStorage.getItem('previousTVRecommendations');
      if (savedPreviousTVRecommendations) {
        try {
          this.previousShowRecommendations = JSON.parse(savedPreviousTVRecommendations) || [];
        } catch (error) {
          console.error('Error parsing previous TV recommendations:', error);
          this.previousShowRecommendations = [];
        }
      }
      
      // Load previous movie recommendations from localStorage
      const savedPreviousMovieRecommendations = localStorage.getItem('previousMovieRecommendations');
      if (savedPreviousMovieRecommendations) {
        try {
          this.previousMovieRecommendations = JSON.parse(savedPreviousMovieRecommendations) || [];
        } catch (error) {
          console.error('Error parsing previous movie recommendations:', error);
          this.previousMovieRecommendations = [];
        }
      }
      
      // Also try to load current recommendations
      if (this.isMovieMode) {
        const currentMovieRecs = localStorage.getItem('currentMovieRecommendations');
        if (currentMovieRecs) {
          try {
            this.recommendations = JSON.parse(currentMovieRecs) || [];
          } catch (error) {
            console.error('Error parsing current movie recommendations:', error);
          }
        }
      } else {
        const currentTVRecs = localStorage.getItem('currentTVRecommendations');
        if (currentTVRecs) {
          try {
            this.recommendations = JSON.parse(currentTVRecs) || [];
          } catch (error) {
            console.error('Error parsing current TV recommendations:', error);
          }
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
    }
    
    // Set the active recommendations based on current mode
    if (this.isMovieMode) {
      this.previousRecommendations = [...this.previousMovieRecommendations];
    } else {
      this.previousRecommendations = [...this.previousShowRecommendations];
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

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.content-type-selector {
  display: flex;
  align-items: center;
  background-color: rgba(52, 168, 83, 0.08);
  border-radius: 12px;
  margin-left: 15px;
  padding: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.content-type-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-out;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  position: relative;
  min-width: 120px;
  outline: none;
}

.content-type-button:hover {
  background-color: rgba(52, 168, 83, 0.08);
}

.content-type-button.active {
  background-color: var(--button-primary-bg, #34A853);
  color: white;
  box-shadow: 0 2px 8px rgba(52, 168, 83, 0.3);
}

.content-type-button .button-icon {
  font-size: 16px;
  margin-right: 2px;
}

@media (max-width: 600px) {
  .content-type-selector {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
  }
  
  .content-type-button {
    flex: 1;
    padding: 10px 8px;
  }
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
  font-size: 14px;
  background-color: #2196F3;
  margin-left: 10px;
  border-radius: 10px;
  border: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
}

.settings-button:hover:not(:disabled) {
  background-color: #1976D2;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
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
  align-items: center;
  margin: 24px 0 10px;
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
  background-color: transparent;
  color: #34A853;
  font-size: 15px;
  padding: 8px 20px;
  min-width: 120px;
  border: 2px solid #34A853;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.retry-button:hover:not(:disabled) {
  background-color: rgba(52, 168, 83, 0.08);
  transform: translateY(-1px);
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
  background-color: rgba(52, 168, 83, 0.03);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 1px solid rgba(52, 168, 83, 0.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.info-section:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.info-section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #34A853;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(52, 168, 83, 0.15);
  display: flex;
  align-items: center;
}

.info-section-title::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 16px;
  margin-right: 8px;
  background: linear-gradient(to bottom, #34A853, #27AE60);
  border-radius: 2px;
}

.model-info {
  padding: 10px 0;
  font-size: 14px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 15px;
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
  margin-bottom: 12px;
  background-color: rgba(52, 168, 83, 0.05);
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(52, 168, 83, 0.1);
}

.fetch-models-button {
  background: none;
  border: 1px solid rgba(52, 168, 83, 0.2);
  color: #34A853;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fetch-models-button:hover:not(:disabled) {
  background-color: rgba(52, 168, 83, 0.1);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fetch-models-button:disabled {
  color: #ccc;
  cursor: not-allowed;
  border-color: rgba(0, 0, 0, 0.1);
}

.loading-icon {
  display: inline-block;
  animation: spin 1s infinite linear;
}

.fetch-error {
  color: #f44336;
  font-size: 12px;
  margin-top: 4px;
  cursor: pointer;
}

.error-link {
  text-decoration: underline;
  font-weight: bold;
}

.model-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-select {
  padding: 12px 15px;
  border-radius: 8px;
  border: 1px solid rgba(52, 168, 83, 0.2);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.model-select:hover {
  border-color: #34A853;
}

.model-select:focus {
  border-color: #34A853;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
}

.model-select-custom {
  margin-top: 5px;
}

.custom-model-input {
  padding: 12px 15px;
  border-radius: 8px;
  border: 1px solid rgba(52, 168, 83, 0.2);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.custom-model-input:hover {
  border-color: #34A853;
}

.custom-model-input:focus {
  border-color: #34A853;
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
}

/* Modern Slider Components */
.temperature-control,
.sample-size-control {
  margin-top: 10px;
}

.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.slider-header label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.slider-value {
  font-weight: 600;
  color: #34A853;
  background-color: rgba(52, 168, 83, 0.1);
  border-radius: 30px;
  padding: 1px 8px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-size: 13px;
}

.modern-slider-container {
  position: relative;
  padding: 0 2px;
  margin-bottom: 8px;
}

.slider-track-container {
  position: relative;
  height: 40px; /* Significantly increased height for better centering */
  display: flex;
  align-items: center;
}

.slider-track {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 4px; /* Thinner track for better contrast with handle */
  background: linear-gradient(to right, #34A853, #27AE60);
  border-radius: 2px;
  z-index: 1;
  transition: width 0.2s ease;
}

.modern-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px; /* Match track height */
  border-radius: 2px;
  background: #e5e7eb;
  outline: none;
  position: relative;
  z-index: 2;
  margin: 0;
  padding: 0;
  cursor: pointer;
}

.modern-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 2px solid #34A853;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 3;
  /* Fine-tuned perfect centering */
  transform: translateY(0px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.modern-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 2px solid #34A853;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 3;
  transform: translateY(0px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.modern-slider::-webkit-slider-thumb:hover,
.modern-slider:active::-webkit-slider-thumb {
  transform: translateY(0px) scale(1.1);
  box-shadow: 0 3px 8px rgba(52, 168, 83, 0.3);
}

.modern-slider::-moz-range-thumb:hover,
.modern-slider:active::-moz-range-thumb {
  transform: translateY(0px) scale(1.1);
  box-shadow: 0 3px 8px rgba(52, 168, 83, 0.3);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.7;
  margin-bottom: 4px;
}

.slider-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-color);
  opacity: 0.6;
  margin-top: 0;
  padding: 0 2px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
}

.genre-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  background-color: #34A853;
  color: white;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  padding: 0 6px;
}

.genre-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 5px 0;
  margin-bottom: 10px;
  scrollbar-width: thin;
  scrollbar-color: #34A853 rgba(52, 168, 83, 0.1);
}

.genre-tags-container::-webkit-scrollbar {
  width: 6px;
}

.genre-tags-container::-webkit-scrollbar-track {
  background: rgba(52, 168, 83, 0.05);
  border-radius: 3px;
}

.genre-tags-container::-webkit-scrollbar-thumb {
  background-color: rgba(52, 168, 83, 0.4);
  border-radius: 3px;
}

.genre-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background-color: rgba(52, 168, 83, 0.05);
  border: 1px solid rgba(52, 168, 83, 0.15);
  border-radius: 30px;
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.genre-tag:hover {
  background-color: rgba(52, 168, 83, 0.1);
  transform: translateY(-1px);
}

.genre-tag.selected {
  background-color: #34A853;
  color: white;
  border-color: #34A853;
  box-shadow: 0 2px 5px rgba(52, 168, 83, 0.3);
}

.genre-tag.selected:hover {
  background-color: #2E9648;
}

.clear-all-button {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background-color: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 30px;
  color: #f44336;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 4px;
}

.clear-all-button:hover {
  background-color: rgba(244, 67, 54, 0.15);
  transform: translateY(-1px);
}

.count-selector, .genre-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
  padding: 15px;
  background-color: rgba(52, 168, 83, 0.03);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(52, 168, 83, 0.1);
}

.count-selector {
  margin-bottom: 14px;
  padding: 10px;
}

.select-container {
  position: relative;
  width: 100%;
}

select {
  width: 100%;
  padding: 10px 12px;
  appearance: none;
  background-color: var(--input-bg);
  color: var(--input-text);
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, background-color var(--transition-speed), color var(--transition-speed);
}

select:hover {
  border-color: #34A853;
}

select:focus {
  border-color: #34A853;
  box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
  outline: none;
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

.genre-selector label {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  transition: color var(--transition-speed);
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

.discover-button {
  position: relative;
  width: 100%;
  max-width: 320px;
  padding: 0;
  background: linear-gradient(105deg, #34A853, #27AE60);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(52, 168, 83, 0.25);
  overflow: hidden;
  border: none;
  transition: all 0.3s ease-out;
  margin: 5px auto;
}

.discover-button-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  position: relative;
  z-index: 2;
}

.discover-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(52, 168, 83, 0.3);
  background: linear-gradient(105deg, #2E9648, #229954);
}

.discover-button:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 2px 8px rgba(52, 168, 83, 0.2);
}

.discover-button:disabled {
  background: linear-gradient(105deg, #a9a9a9, #8a8a8a);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  cursor: not-allowed;
}

.button-text {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: white;
}

.button-icon {
  font-size: 18px;
}

.arrow-icon {
  transition: transform 0.3s ease;
  stroke: white;
  height: 18px;
  width: 18px;
}

.discover-button:hover:not(:disabled) .arrow-icon {
  transform: translateX(3px);
}

.button-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    110deg, 
    rgba(255,255,255,0) 0%, 
    rgba(255,255,255,0) 20%, 
    rgba(255,255,255,0.1) 20.1%, 
    rgba(255,255,255,0.1) 30%, 
    rgba(255,255,255,0) 30.1%, 
    rgba(255,255,255,0) 100%
  );
  z-index: 1;
  transition: transform 0.5s ease;
  transform: translateX(-100%);
}

.discover-button:hover:not(:disabled) .button-shine {
  transform: translateX(100%);
}

@media (max-width: 600px) {
  .discover-button {
    max-width: 100%;
  }
  
  .button-text {
    font-size: 15px;
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
  
  .recommendation-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .content-type-toggle {
    width: 100%;
    justify-content: center;
  }
  
  .content-type-toggle {
    justify-content: center;
    padding: 6px 12px;
  }
  
  .toggle-label {
    font-size: 13px;
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
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  color: #2196F3;
  padding: 4px 12px;
  border-radius: 4px;
  width: fit-content;
  line-height: 1;
  margin-top: 4px;
  vertical-align: middle;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  padding: 10px;
  background-color: rgba(52, 168, 83, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(52, 168, 83, 0.1);
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

.modal-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 15px;
  margin-bottom: 15px;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-left: 4px solid #FFC107;
  border-radius: 6px;
}

.warning-icon {
  font-size: 20px;
  line-height: 1;
}

.warning-text {
  font-size: 14px;
  color: var(--text-color);
  line-height: 1.4;
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

.plex-options, .jellyfin-options, .tautulli-options, .trakt-options {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(52, 168, 83, 0.05); /* Light green background for all services */
  border-radius: 8px;
  border: 1px solid rgba(52, 168, 83, 0.1);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.service-settings {
  margin-top: 10px;
  padding: 12px;
  background-color: rgba(52, 168, 83, 0.02);
  border-radius: 8px;
  border: 1px solid rgba(52, 168, 83, 0.1);
}

.plex-history-toggle, .jellyfin-history-toggle, .tautulli-history-toggle {
  margin-top: 5px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-selection {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 15px;
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

.days-slider-container {
  margin-top: 5px;
  margin-bottom: 15px;
  padding: 10px;
  background-color: rgba(52, 168, 83, 0.05);
  border-radius: 8px;
  border: 1px dashed rgba(52, 168, 83, 0.2);
}

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  background-color: #e0e0e0;
  border-radius: 34px;
  transition: .4s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #34A853;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
  text-align: left;
}

.refresh-button {
  background-color: rgba(52, 168, 83, 0.1);
  color: #34A853;
  border: 1px solid rgba(52, 168, 83, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 13px;
  cursor: pointer;
  margin-right: 10px;
  transition: all 0.2s ease;
}

.refresh-button:hover {
  background-color: rgba(52, 168, 83, 0.2);
  transform: translateY(-1px);
}

.jellyfin-user-select-button, .tautulli-user-select-button, .trakt-refresh-button {
  margin-top: 15px;
  width: auto;
  max-width: 200px;
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

.vibe-input-container {
  position: relative;
  margin-bottom: 8px;
}

.vibe-input {
  width: 100%;
  padding: 12px 15px;
  border-radius: 10px;
  border: 1px solid rgba(52, 168, 83, 0.2);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  line-height: 1.5;
  min-height: 70px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.vibe-input:focus {
  outline: none;
  border-color: #34A853;
  box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
}

.vibe-input::placeholder {
  color: #9ca3af;
}

.clear-prompt-button {
  background-color: transparent;
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-prompt-button:hover {
  background-color: rgba(244, 67, 54, 0.08);
  transform: translateY(-1px);
}

.setting-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
  padding-left: 2px;
}

.tip-icon {
  width: 16px;
  height: 16px;
  color: #34A853;
  opacity: 0.7;
}

.language-selector {
  margin-bottom: 20px;
}

.language-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(52, 168, 83, 0.1);
  color: #34A853;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
}

.select-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.select-arrow-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #6b7280;
  pointer-events: none;
}

.language-select {
  width: 100%;
  padding: 12px 15px;
  border-radius: 10px;
  border: 1px solid rgba(52, 168, 83, 0.2);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  margin-bottom: 8px;
  appearance: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.language-select:hover {
  border-color: #34A853;
}

.language-select:focus {
  outline: none;
  border-color: #34A853;
  box-shadow: 0 0 0 2px rgba(52, 168, 83, 0.2);
}

.experimental-toggle {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.experimental-badge {
  display: inline-block;
  background-color: #ff9800;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
  vertical-align: middle;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>