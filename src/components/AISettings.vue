<template>
  <div class="ai-settings">
    <h2>Settings</h2>
    
    <!-- Settings Tabs -->
    <div class="settings-tabs">
      <button 
        @click="activeTab = 'ai'" 
        :class="{ active: activeTab === 'ai' }" 
        class="tab-button"
      >
        AI Service
      </button>
      <button 
        @click="activeTab = 'sonarr'" 
        :class="{ active: activeTab === 'sonarr' }" 
        class="tab-button"
      >
        Sonarr
      </button>
      <button 
        @click="activeTab = 'radarr'" 
        :class="{ active: activeTab === 'radarr' }" 
        class="tab-button"
      >
        Radarr
      </button>
      <button 
        @click="activeTab = 'plex'" 
        :class="{ active: activeTab === 'plex' }" 
        class="tab-button"
      >
        Plex
      </button>
      <button 
        @click="activeTab = 'jellyfin'" 
        :class="{ active: activeTab === 'jellyfin' }" 
        class="tab-button"
      >
        Jellyfin
      </button>
      <button 
        @click="activeTab = 'tautulli'" 
        :class="{ active: activeTab === 'tautulli' }" 
        class="tab-button"
      >
        Tautulli
      </button>
    </div>
    
    <!-- Connected Services Section -->
    <div v-if="sonarrConnected || radarrConnected || plexConnected || jellyfinConnected || tautulliConnected" class="section-card connected-services-wrapper">
      <div class="collapsible-header" @click="toggleConnectionsPanel">
        <h3>Manage Connected Services</h3>
        <button class="collapse-toggle">
          <svg :class="{ 'rotate': showConnectionsPanel }" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div v-if="showConnectionsPanel" class="collapsible-content">
        <p class="section-description">You can disconnect any service you no longer want to use.</p>
        <div class="connected-services">
          <button v-if="plexConnected" class="connection-button plex-button" @click="showPlexConnectModal">
            <span class="connection-name">Plex</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="jellyfinConnected" class="connection-button jellyfin-button" @click="showJellyfinConnectModal">
            <span class="connection-name">Jellyfin</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="tautulliConnected" class="connection-button tautulli-button" @click="showTautulliConnectModal">
            <span class="connection-name">Tautulli</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="sonarrConnected" class="connection-button sonarr-button" @click="showSonarrConnectModal">
            <span class="connection-name">Sonarr</span>
            <span class="connection-action">Manage Connection</span>
          </button>
          <button v-if="radarrConnected" class="connection-button radarr-button" @click="showRadarrConnectModal">
            <span class="connection-name">Radarr</span>
            <span class="connection-action">Manage Connection</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Connection Management Modals - These are fixed position overlays -->
    <teleport to="body">
      <!-- Plex Connection Management Modal -->
      <div v-if="showPlexConnect" class="connection-modal-overlay" @click.self="closePlexModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Plex Connection</h3>
            <button class="modal-close-x" @click="closePlexModal">&times;</button>
          </div>
          <div class="modal-body">
            <PlexConnection 
              :connected="plexConnected" 
              @connected="handlePlexConnected" 
              @disconnected="handlePlexDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closePlexModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Jellyfin Connection Management Modal -->
      <div v-if="showJellyfinConnect" class="connection-modal-overlay" @click.self="closeJellyfinModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Jellyfin Connection</h3>
            <button class="modal-close-x" @click="closeJellyfinModal">&times;</button>
          </div>
          <div class="modal-body">
            <JellyfinConnection 
              :connected="jellyfinConnected" 
              @connected="handleJellyfinConnected" 
              @disconnected="handleJellyfinDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeJellyfinModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Sonarr Connection Management Modal -->
      <div v-if="showSonarrConnect" class="connection-modal-overlay" @click.self="closeSonarrModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Sonarr Connection</h3>
            <button class="modal-close-x" @click="closeSonarrModal">&times;</button>
          </div>
          <div class="modal-body">
            <SonarrConnection 
              :connected="sonarrConnected" 
              @connected="handleSonarrConnected" 
              @disconnected="handleSonarrDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeSonarrModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Radarr Connection Management Modal -->
      <div v-if="showRadarrConnect" class="connection-modal-overlay" @click.self="closeRadarrModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Radarr Connection</h3>
            <button class="modal-close-x" @click="closeRadarrModal">&times;</button>
          </div>
          <div class="modal-body">
            <RadarrConnection 
              :connected="radarrConnected" 
              @connected="handleRadarrConnected" 
              @disconnected="handleRadarrDisconnected" 
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeRadarrModal">Close</button>
          </div>
        </div>
      </div>
      
      <!-- Tautulli Connection Management Modal -->
      <div v-if="showTautulliConnect" class="connection-modal-overlay" @click.self="closeTautulliModal">
        <div class="connection-modal">
          <div class="modal-header">
            <h3>Manage Tautulli Connection</h3>
            <button class="modal-close-x" @click="closeTautulliModal">&times;</button>
          </div>
          <div class="modal-body">
            <TautulliConnection 
              :connected="tautulliConnected" 
              @connected="handleTautulliConnected" 
              @disconnected="handleTautulliDisconnected" 
              @limitChanged="handleTautulliLimitChanged"
            />
          </div>
          <div class="modal-footer">
            <button class="modal-close-button" @click="closeTautulliModal">Close</button>
          </div>
        </div>
      </div>
    </teleport>
    
    <!-- AI Service Settings Tab -->
    <div v-if="activeTab === 'ai'" class="settings-section">
      <div class="settings-intro">
        <p>Enter your AI service details below to enable media recommendations. Your API key will be stored locally in your browser and never sent to our servers.</p>
        <p>You can use <strong>any AI service</strong> with an OpenAI-compatible API format, including OpenAI, local models, or other providers.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="apiUrl">API URL:</label>
          <input 
            id="apiUrl" 
            v-model="aiSettings.apiUrl" 
            type="text" 
            placeholder="https://api.openai.com/v1 or http://localhost:1234/v1"
            required
          />
          <div class="field-hint">The base URL of the AI service (OpenAI, local server, etc.)</div>
        </div>
        
        <div class="form-group">
          <label for="apiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="apiKey" 
              v-model="aiSettings.apiKey" 
              :type="showApiKey ? 'text' : 'password'" 
              placeholder="Your API key (can be empty for local models)"
            />
            <button type="button" class="toggle-button" @click="showApiKey = !showApiKey">
              {{ showApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">The API key for authentication (not needed for some local servers)</div>
        </div>
        
        <div class="form-group">
          <label>Available Models:</label>
          <div class="model-actions">
            <button 
              type="button" 
              @click="fetchModels" 
              :disabled="this.aiSettings.apiKey === undefined || isLoading"
              class="action-button"
            >
              <span class="button-icon" v-if="isLoading">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                </svg>
              </span>
              {{ isLoading ? 'Loading Models...' : 'Fetch Available Models' }}
            </button>
          </div>
          
          <div v-if="fetchError" class="error-message">
            {{ fetchError }}
          </div>
          
          <div v-if="models.length > 0" class="models-container">
            <div class="search-box">
              <input 
                type="text" 
                v-model="modelSearch" 
                placeholder="Search models..." 
                class="model-search"
              />
              <span class="model-count">{{ filteredModels.length }} models</span>
            </div>
            
            <div class="models-list">
              <div v-for="model in filteredModels" :key="model.id" class="model-option">
                <input 
                  type="radio" 
                  :id="model.id" 
                  :value="model.id" 
                  v-model="aiSettings.selectedModel" 
                  name="model"
                  @change="saveAISettings(false)"
                />
                <label :for="model.id" :title="model.id">{{ model.id }}</label>
              </div>
              
              <div v-if="filteredModels.length === 0" class="no-results">
                <p>No models match your search</p>
              </div>
            </div>
          </div>
          
          <div v-else-if="!fetchError && !isLoading" class="no-models">
            <p>Click "Fetch Available Models" to load models from the API</p>
          </div>
        </div>
        
        <div class="form-group">
          <label for="max-tokens">Max Tokens:</label>
          <div class="slider-container">
            <input 
              id="max-tokens" 
              v-model.number="aiSettings.maxTokens" 
              type="range" 
              min="100" 
              max="4000" 
              step="100" 
            />
            <span class="slider-value">{{ aiSettings.maxTokens }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="temperature">Temperature:</label>
          <div class="slider-container">
            <input 
              id="temperature" 
              v-model.number="aiSettings.temperature" 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
            />
            <span class="slider-value">{{ aiSettings.temperature }}</span>
          </div>
        </div>
        
        <div class="actions">
          <button type="button" @click="saveAISettings" class="save-button">
            Save AI Settings
          </button>
        </div>
        
        <div class="settings-help">
          <h3>Compatible AI Services</h3>
          <p>You can use any of these services with an OpenAI-compatible API:</p>
          <ul>
            <li><strong>OpenAI:</strong> Default URL (https://api.openai.com/v1) with your <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI API key</a></li> 
            <li><strong>LM Studio:</strong> Local URL (e.g., http://localhost:1234/v1) running models on your computer</li>
            <li><strong>Ollama:</strong> Local URL (e.g., http://localhost:11434/v1) for locally hosted models</li>
            <li><strong>Anthropic Claude:</strong> Anthropic's API with proper base URL</li>
            <li><strong>Self-hosted:</strong> Your own LLM API server with OpenAI compatibility</li>
            <li><strong>Mistral, Groq, Cohere:</strong> Most AI providers with OpenAI-compatible endpoints</li>
          </ul>
          <p class="api-note">Note: The API format must be compatible with OpenAI's chat completions endpoint.</p>
        </div>
      </div>
    </div>

    <!-- Sonarr Settings Tab -->
    <div v-if="activeTab === 'sonarr'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Sonarr server to enable TV show recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="sonarrUrl">Sonarr URL:</label>
          <input 
            id="sonarrUrl" 
            v-model="sonarrSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:8989"
            required
          />
          <div class="field-hint">The URL of your Sonarr server (e.g., http://localhost:8989 or https://sonarr.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="sonarrApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="sonarrApiKey" 
              v-model="sonarrSettings.apiKey" 
              :type="showSonarrApiKey ? 'text' : 'password'" 
              placeholder="Your Sonarr API key"
              required
            />
            <button type="button" class="toggle-button" @click="showSonarrApiKey = !showSonarrApiKey">
              {{ showSonarrApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Settings > General in your Sonarr interface</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testSonarrConnection" class="test-button" :disabled="testingSonarr">
            {{ testingSonarr ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveSonarrSettings" class="save-button" :disabled="testingSonarr">
            Save Sonarr Settings
          </button>
        </div>
        
        <div v-if="sonarrConnectionMessage" class="connection-message" :class="{ 'success': sonarrConnectionStatus, 'error': !sonarrConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="sonarrConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ sonarrConnectionMessage }}
          </div>
        </div>
      </div>
    </div>

    <!-- Radarr Settings Tab -->
    <div v-if="activeTab === 'radarr'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Radarr server to enable movie recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="radarrUrl">Radarr URL:</label>
          <input 
            id="radarrUrl" 
            v-model="radarrSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:7878"
            required
          />
          <div class="field-hint">The URL of your Radarr server (e.g., http://localhost:7878 or https://radarr.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="radarrApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="radarrApiKey" 
              v-model="radarrSettings.apiKey" 
              :type="showRadarrApiKey ? 'text' : 'password'" 
              placeholder="Your Radarr API key"
              required
            />
            <button type="button" class="toggle-button" @click="showRadarrApiKey = !showRadarrApiKey">
              {{ showRadarrApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Settings > General in your Radarr interface</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testRadarrConnection" class="test-button" :disabled="testingRadarr">
            {{ testingRadarr ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveRadarrSettings" class="save-button" :disabled="testingRadarr">
            Save Radarr Settings
          </button>
        </div>
        
        <div v-if="radarrConnectionMessage" class="connection-message" :class="{ 'success': radarrConnectionStatus, 'error': !radarrConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="radarrConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ radarrConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Plex Settings Tab -->
    <div v-if="activeTab === 'plex'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Plex server to include recently watched content in your recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="plexUrl">Plex URL:</label>
          <input 
            id="plexUrl" 
            v-model="plexSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:32400"
            required
          />
          <div class="field-hint">The URL of your Plex server (e.g., http://localhost:32400 or https://plex.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="plexToken">Plex Token:</label>
          <div class="api-key-input">
            <input 
              id="plexToken" 
              v-model="plexSettings.token" 
              :type="showPlexToken ? 'text' : 'password'" 
              placeholder="Your Plex authentication token"
              required
            />
            <button type="button" class="toggle-button" @click="showPlexToken = !showPlexToken">
              {{ showPlexToken ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Learn how to <a href="https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/" target="_blank">find your Plex token</a></div>
        </div>
        
        <div class="form-group">
          <label for="plexRecentLimit">Number of recently watched items:</label>
          <div class="slider-container">
            <input 
              id="plexRecentLimit" 
              v-model.number="plexSettings.recentLimit" 
              type="range" 
              min="1" 
              max="50" 
              step="1" 
            />
            <span class="slider-value">{{ plexSettings.recentLimit }}</span>
          </div>
          <div class="field-hint">How many recently watched items to include in recommendations</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testPlexConnection" class="test-button" :disabled="testingPlex">
            {{ testingPlex ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="savePlexSettings" class="save-button" :disabled="testingPlex">
            Save Plex Settings
          </button>
        </div>
        
        <div v-if="plexConnectionMessage" class="connection-message" :class="{ 'success': plexConnectionStatus, 'error': !plexConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="plexConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ plexConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Jellyfin Settings Tab -->
    <div v-if="activeTab === 'jellyfin'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Jellyfin server to include recently watched content in your recommendations. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="jellyfinUrl">Jellyfin URL:</label>
          <input 
            id="jellyfinUrl" 
            v-model="jellyfinSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:8096"
            required
          />
          <div class="field-hint">The URL of your Jellyfin server (e.g., http://localhost:8096 or https://jellyfin.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="jellyfinApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="jellyfinApiKey" 
              v-model="jellyfinSettings.apiKey" 
              :type="showJellyfinApiKey ? 'text' : 'password'" 
              placeholder="Your Jellyfin API key"
              required
            />
            <button type="button" class="toggle-button" @click="showJellyfinApiKey = !showJellyfinApiKey">
              {{ showJellyfinApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Dashboard > API Keys in your Jellyfin admin interface</div>
        </div>
        
        <div class="form-group">
          <label for="jellyfinUserId">User ID:</label>
          <input 
            id="jellyfinUserId" 
            v-model="jellyfinSettings.userId" 
            type="text" 
            placeholder="Your Jellyfin user ID"
            required
          />
          <div class="field-hint">Found in your profile settings under "Profile Information"</div>
        </div>
        
        <div class="form-group">
          <label for="jellyfinRecentLimit">Number of recently watched items:</label>
          <div class="slider-container">
            <input 
              id="jellyfinRecentLimit" 
              v-model.number="jellyfinSettings.recentLimit" 
              type="range" 
              min="1" 
              max="50" 
              step="1" 
            />
            <span class="slider-value">{{ jellyfinSettings.recentLimit }}</span>
          </div>
          <div class="field-hint">How many recently watched items to include in recommendations</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testJellyfinConnection" class="test-button" :disabled="testingJellyfin">
            {{ testingJellyfin ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveJellyfinSettings" class="save-button" :disabled="testingJellyfin">
            Save Jellyfin Settings
          </button>
        </div>
        
        <div v-if="jellyfinConnectionMessage" class="connection-message" :class="{ 'success': jellyfinConnectionStatus, 'error': !jellyfinConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="jellyfinConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ jellyfinConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tautulli Settings Tab -->
    <div v-if="activeTab === 'tautulli'" class="settings-section">
      <div class="settings-intro">
        <p>Connect to your Tautulli server to access watch history statistics for Plex users. Your server details will be stored locally in your browser.</p>
      </div>
      
      <div class="settings-form">
        <div class="form-group">
          <label for="tautulliUrl">Tautulli URL:</label>
          <input 
            id="tautulliUrl" 
            v-model="tautulliSettings.baseUrl" 
            type="text" 
            placeholder="http://localhost:8181"
            required
          />
          <div class="field-hint">The URL of your Tautulli server (e.g., http://localhost:8181 or https://tautulli.yourdomain.com)</div>
        </div>
        
        <div class="form-group">
          <label for="tautulliApiKey">API Key:</label>
          <div class="api-key-input">
            <input 
              id="tautulliApiKey" 
              v-model="tautulliSettings.apiKey" 
              :type="showTautulliApiKey ? 'text' : 'password'" 
              placeholder="Your Tautulli API key"
              required
            />
            <button type="button" class="toggle-button" @click="showTautulliApiKey = !showTautulliApiKey">
              {{ showTautulliApiKey ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="field-hint">Found in Tautulli Settings > Web Interface > API</div>
        </div>
        
        <div class="form-group">
          <label for="tautulliRecentLimit">Number of recently watched items:</label>
          <div class="slider-container">
            <input 
              id="tautulliRecentLimit" 
              v-model.number="tautulliSettings.recentLimit" 
              type="range" 
              min="1" 
              max="100" 
              step="1" 
            />
            <span class="slider-value">{{ tautulliSettings.recentLimit }}</span>
          </div>
          <div class="field-hint">How many recently watched items to include in recommendations</div>
        </div>
        
        <div class="actions">
          <button type="button" @click="testTautulliConnection" class="test-button" :disabled="testingTautulli">
            {{ testingTautulli ? 'Testing...' : 'Test Connection' }}
          </button>
          <button type="button" @click="saveTautulliSettings" class="save-button" :disabled="testingTautulli">
            Save Tautulli Settings
          </button>
        </div>
        
        <div v-if="tautulliConnectionMessage" class="connection-message" :class="{ 'success': tautulliConnectionStatus, 'error': !tautulliConnectionStatus }">
          <div class="notification-content">
            <span class="notification-icon">
              <svg v-if="tautulliConnectionStatus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            {{ tautulliConnectionMessage }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Fixed Position Notification Toast -->
    <div v-if="saveMessage" class="save-notification" :class="{ 'success': saveSuccess, 'error': !saveSuccess }">
      <div class="notification-content">
        <span class="notification-icon">
          <svg v-if="saveSuccess" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </span>
        {{ saveMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import openAIService from '../services/OpenAIService';
import sonarrService from '../services/SonarrService';
import radarrService from '../services/RadarrService';
import plexService from '../services/PlexService';
import jellyfinService from '../services/JellyfinService';
import tautulliService from '../services/TautulliService';
import credentialsService from '../services/CredentialsService';
import PlexConnection from './PlexConnection.vue';
import JellyfinConnection from './JellyfinConnection.vue';
import TautulliConnection from './TautulliConnection.vue';
import SonarrConnection from './SonarrConnection.vue';
import RadarrConnection from './RadarrConnection.vue';

export default {
  name: 'AIServiceSettings',
  components: {
    PlexConnection,
    JellyfinConnection,
    TautulliConnection,
    SonarrConnection,
    RadarrConnection
  },
  props: {
    sonarrConnected: {
      type: Boolean,
      default: false
    },
    radarrConnected: {
      type: Boolean,
      default: false
    },
    plexConnected: {
      type: Boolean,
      default: false
    },
    jellyfinConnected: {
      type: Boolean,
      default: false
    },
    tautulliConnected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      activeTab: 'ai',
      showConnectionsPanel: false,
      showSonarrConnect: false,
      showRadarrConnect: false,
      showPlexConnect: false,
      showJellyfinConnect: false,
      
      // AI Settings
      aiSettings: {
        apiUrl: '',
        apiKey: '',
        selectedModel: '',
        maxTokens: 4000,
        temperature: 0.8
      },
      models: [],
      modelSearch: '',
      showApiKey: false,
      isLoading: false,
      fetchError: null,
      
      // Sonarr Settings
      sonarrSettings: {
        baseUrl: '',
        apiKey: ''
      },
      showSonarrApiKey: false,
      testingSonarr: false,
      sonarrConnectionMessage: '',
      sonarrConnectionStatus: false,
      
      // Radarr Settings
      radarrSettings: {
        baseUrl: '',
        apiKey: ''
      },
      showRadarrApiKey: false,
      testingRadarr: false,
      radarrConnectionMessage: '',
      radarrConnectionStatus: false,
      
      // Plex Settings
      plexSettings: {
        baseUrl: '',
        token: '',
        recentLimit: 10
      },
      showPlexToken: false,
      testingPlex: false,
      plexConnectionMessage: '',
      plexConnectionStatus: false,
      
      // Jellyfin Settings
      jellyfinSettings: {
        baseUrl: '',
        apiKey: '',
        userId: '',
        recentLimit: 10
      },
      showJellyfinApiKey: false,
      testingJellyfin: false,
      jellyfinConnectionMessage: '',
      jellyfinConnectionStatus: false,
      
      // Tautulli Settings
      tautulliSettings: {
        baseUrl: '',
        apiKey: '',
        recentLimit: 50
      },
      showTautulliApiKey: false,
      testingTautulli: false,
      tautulliConnectionMessage: '',
      tautulliConnectionStatus: false,
      
      // Common
      saveMessage: '',
      saveSuccess: false
    };
  },
  computed: {
    filteredModels() {
      if (!this.modelSearch) {
        return this.models;
      }
      
      const search = this.modelSearch.toLowerCase();
      return this.models.filter(model => 
        model.id.toLowerCase().includes(search)
      );
    }
  },
  created() {
    // Load saved settings initially
    this.loadAllSettings();
  },
  
  watch: {
    // Watch for tab changes to reload credentials when a tab is visited
    activeTab: {
      handler(newTab) {
        // Load the appropriate credentials when the tab changes
        switch(newTab) {
          case 'sonarr':
            this.loadSonarrSettings();
            break;
          case 'radarr':
            this.loadRadarrSettings();
            break;
          case 'plex':
            this.loadPlexSettings();
            break;
          case 'jellyfin':
            this.loadJellyfinSettings();
            break;
          case 'tautulli':
            this.loadTautulliSettings();
            break;
          case 'ai':
            this.loadAISettings();
            break;
        }
      },
      immediate: true
    }
  },
  methods: {
    // Collapsible Panel Methods
    toggleConnectionsPanel() {
      this.showConnectionsPanel = !this.showConnectionsPanel;
    },
    
    // Modal Show/Hide Methods
    showPlexConnectModal() {
      this.showPlexConnect = true;
      document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    },
    
    closePlexModal() {
      this.showPlexConnect = false;
      document.body.style.overflow = '';
    },
    
    showJellyfinConnectModal() {
      this.showJellyfinConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeJellyfinModal() {
      this.showJellyfinConnect = false;
      document.body.style.overflow = '';
    },
    
    showSonarrConnectModal() {
      this.showSonarrConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeSonarrModal() {
      this.showSonarrConnect = false;
      document.body.style.overflow = '';
    },
    
    showRadarrConnectModal() {
      this.showRadarrConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeRadarrModal() {
      this.showRadarrConnect = false;
      document.body.style.overflow = '';
    },
    
    showTautulliConnectModal() {
      this.showTautulliConnect = true;
      document.body.style.overflow = 'hidden';
    },
    
    closeTautulliModal() {
      this.showTautulliConnect = false;
      document.body.style.overflow = '';
    },
    
    // Connection Event Handlers
    handleSonarrConnected() {
      this.$emit('sonarr-settings-updated');
      this.closeSonarrModal();
    },
    
    handleSonarrDisconnected() {
      // Clear Sonarr settings in the form
      this.sonarrSettings.baseUrl = '';
      this.sonarrSettings.apiKey = '';
      this.$emit('sonarr-settings-updated');
      this.closeSonarrModal();
    },
    
    handleRadarrConnected() {
      this.$emit('radarr-settings-updated');
      this.closeRadarrModal();
    },
    
    handleRadarrDisconnected() {
      // Clear Radarr settings in the form
      this.radarrSettings.baseUrl = '';
      this.radarrSettings.apiKey = '';
      this.$emit('radarr-settings-updated');
      this.closeRadarrModal();
    },
    
    handlePlexConnected() {
      this.$emit('plex-settings-updated');
      this.closePlexModal();
    },
    
    handlePlexDisconnected() {
      // Clear Plex settings in the form
      this.plexSettings.baseUrl = '';
      this.plexSettings.token = '';
      this.plexSettings.recentLimit = 10;
      this.$emit('plex-settings-updated');
      this.closePlexModal();
    },
    
    handleJellyfinConnected() {
      this.$emit('jellyfin-settings-updated');
      this.closeJellyfinModal();
    },
    
    handleJellyfinDisconnected() {
      // Clear Jellyfin settings in the form
      this.jellyfinSettings.baseUrl = '';
      this.jellyfinSettings.apiKey = '';
      this.jellyfinSettings.userId = '';
      this.jellyfinSettings.recentLimit = 10;
      this.$emit('jellyfin-settings-updated');
      this.closeJellyfinModal();
    },
    
    handleTautulliConnected() {
      this.$emit('tautulli-settings-updated');
      this.closeTautulliModal();
    },
    
    handleTautulliDisconnected() {
      // Clear Tautulli settings in the form
      this.tautulliSettings.baseUrl = '';
      this.tautulliSettings.apiKey = '';
      this.tautulliSettings.recentLimit = 50;
      this.$emit('tautulli-settings-updated');
      this.closeTautulliModal();
    },
    
    async loadAllSettings() {
      // Load all settings from their respective services
      await this.loadAISettings();
      await this.loadSonarrSettings();
      await this.loadRadarrSettings();
      await this.loadPlexSettings();
      await this.loadJellyfinSettings();
      await this.loadTautulliSettings();
    },
    
    async loadAISettings() {
      try {
        // First try to get from service directly
        if (openAIService.isConfigured()) {
          this.aiSettings.apiUrl = openAIService.baseUrl;
          this.aiSettings.apiKey = openAIService.apiKey;
          this.aiSettings.selectedModel = openAIService.model;
          this.aiSettings.maxTokens = openAIService.maxTokens;
          this.aiSettings.temperature = openAIService.temperature;
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('openai');
        if (credentials) {
          this.aiSettings.apiUrl = credentials.apiUrl || 'https://api.openai.com/v1';
          this.aiSettings.apiKey = credentials.apiKey || '';
          this.aiSettings.selectedModel = credentials.model || 'gpt-3.5-turbo';
          this.aiSettings.maxTokens = credentials.maxTokens ? parseInt(credentials.maxTokens) : 800;
          this.aiSettings.temperature = credentials.temperature ? parseFloat(credentials.temperature) : 0.5;
        }
      } catch (error) {
        console.error('Error loading OpenAI settings:', error);
      }
    },
    
    async loadSonarrSettings() {
      try {
        // First try to get from service directly
        if (sonarrService.isConfigured()) {
          this.sonarrSettings.baseUrl = sonarrService.baseUrl;
          this.sonarrSettings.apiKey = sonarrService.apiKey;
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('sonarr');
        if (credentials) {
          this.sonarrSettings.baseUrl = credentials.baseUrl || '';
          this.sonarrSettings.apiKey = credentials.apiKey || '';
        }
      } catch (error) {
        console.error('Error loading Sonarr settings:', error);
      }
    },
    
    async loadRadarrSettings() {
      try {
        // First try to get from service directly
        if (radarrService.isConfigured()) {
          this.radarrSettings.baseUrl = radarrService.baseUrl;
          this.radarrSettings.apiKey = radarrService.apiKey;
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('radarr');
        if (credentials) {
          this.radarrSettings.baseUrl = credentials.baseUrl || '';
          this.radarrSettings.apiKey = credentials.apiKey || '';
        }
      } catch (error) {
        console.error('Error loading Radarr settings:', error);
      }
    },
    
    async loadPlexSettings() {
      try {
        // First try to get from service directly
        if (plexService.isConfigured()) {
          this.plexSettings.baseUrl = plexService.baseUrl;
          this.plexSettings.token = plexService.token;
          this.plexSettings.recentLimit = parseInt(localStorage.getItem('plexRecentLimit') || '10');
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('plex');
        if (credentials) {
          this.plexSettings.baseUrl = credentials.baseUrl || '';
          this.plexSettings.token = credentials.token || '';
          this.plexSettings.recentLimit = parseInt(localStorage.getItem('plexRecentLimit') || '10');
        }
      } catch (error) {
        console.error('Error loading Plex settings:', error);
      }
    },
    
    async loadJellyfinSettings() {
      try {
        // First try to get from service directly
        if (jellyfinService.isConfigured()) {
          this.jellyfinSettings.baseUrl = jellyfinService.baseUrl;
          this.jellyfinSettings.apiKey = jellyfinService.apiKey;
          this.jellyfinSettings.userId = jellyfinService.userId;
          this.jellyfinSettings.recentLimit = parseInt(localStorage.getItem('jellyfinRecentLimit') || '10');
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('jellyfin');
        if (credentials) {
          this.jellyfinSettings.baseUrl = credentials.baseUrl || '';
          this.jellyfinSettings.apiKey = credentials.apiKey || '';
          this.jellyfinSettings.userId = credentials.userId || '';
          this.jellyfinSettings.recentLimit = parseInt(localStorage.getItem('jellyfinRecentLimit') || '10');
        }
      } catch (error) {
        console.error('Error loading Jellyfin settings:', error);
      }
    },
    
    async loadTautulliSettings() {
      try {
        // First try to get from service directly
        if (tautulliService.isConfigured()) {
          this.tautulliSettings.baseUrl = tautulliService.baseUrl;
          this.tautulliSettings.apiKey = tautulliService.apiKey;
          this.tautulliSettings.recentLimit = parseInt(localStorage.getItem('tautulliRecentLimit') || '50');
          return;
        }
        
        // If not configured, try to get from server-side storage
        const credentials = await credentialsService.getCredentials('tautulli');
        if (credentials) {
          this.tautulliSettings.baseUrl = credentials.baseUrl || '';
          this.tautulliSettings.apiKey = credentials.apiKey || '';
          this.tautulliSettings.recentLimit = parseInt(localStorage.getItem('tautulliRecentLimit') || '50');
        }
      } catch (error) {
        console.error('Error loading Tautulli settings:', error);
      }
    },
    
    // AI Service Methods
    async fetchModels() {
      // Allow empty API key for local models
      if (this.aiSettings.apiKey === undefined) {
        this.fetchError = 'API key field cannot be undefined';
        return;
      }
      
      // Normalize the API URL
      if (this.aiSettings.apiUrl) {
        // Ensure URL starts with http:// or https://
        if (!this.aiSettings.apiUrl.match(/^https?:\/\//)) {
          this.aiSettings.apiUrl = 'http://' + this.aiSettings.apiUrl;
        }
        
        // Remove trailing slashes
        this.aiSettings.apiUrl = this.aiSettings.apiUrl.replace(/\/+$/, '');
        
        // Validate URL format
        try {
          new URL(this.aiSettings.apiUrl);
        } catch (e) {
          this.fetchError = 'Invalid API URL format';
          return;
        }
      } else {
        this.fetchError = 'API URL is required';
        return;
      }
      
      this.isLoading = true;
      this.fetchError = null;
      this.models = [];
      
      try {
        // Configure OpenAI service temporarily with the current settings
        // This automatically saves the API key and URL to be used later
        await openAIService.configure(
          this.aiSettings.apiKey,
          this.aiSettings.selectedModel || 'gpt-3.5-turbo',
          this.aiSettings.apiUrl,
          this.aiSettings.maxTokens,
          this.aiSettings.temperature
        );
        
        // Use the service to fetch models (which uses the proxy)
        const modelsList = await openAIService.fetchModels();
        
        if (modelsList && modelsList.length > 0) {
          // Store the models
          this.models = modelsList;
          
          // Sort models alphabetically
          this.models.sort((a, b) => a.id.localeCompare(b.id));
          
          // If no model is selected, select the first one
          if (!this.aiSettings.selectedModel && this.models.length > 0) {
            this.aiSettings.selectedModel = this.models[0].id;
          }
          
          // Automatically save settings after successful fetch and model selection
          if (this.aiSettings.selectedModel) {
            await this.saveAISettings(false); // Pass false to avoid showing the success message
            this.saveSuccess = true;
            this.saveMessage = 'Settings saved when fetching models';
            setTimeout(() => {
              this.saveMessage = '';
            }, 1500);
          }
        } else {
          this.fetchError = 'No models returned from API';
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        
        // Try to extract meaningful error message
        if (error.message) {
          this.fetchError = error.message;
        } else if (error.error?.message) {
          this.fetchError = error.error.message;
        } else if (typeof error === 'string') {
          this.fetchError = error;
        } else {
          this.fetchError = 'Failed to fetch models. Check your API key and URL.';
        }
      } finally {
        this.isLoading = false;
      }
    },
    
    async saveAISettings(showMessage = true) {
      try {
        // Validate the API URL
        if (this.aiSettings.apiUrl) {
          // Normalize API URL by ensuring it starts with http:// or https://
          if (!this.aiSettings.apiUrl.match(/^https?:\/\//)) {
            this.aiSettings.apiUrl = 'http://' + this.aiSettings.apiUrl;
          }
          
          // Remove trailing slashes
          this.aiSettings.apiUrl = this.aiSettings.apiUrl.replace(/\/+$/, '');
          
          // Basic URL validation
          try {
            new URL(this.aiSettings.apiUrl);
          } catch (e) {
            this.saveSuccess = false;
            this.saveMessage = 'Invalid API URL format';
            this.clearSaveMessage();
            return;
          }
        }
        
        // Update the service (which will store credentials server-side)
        await openAIService.configure(
          this.aiSettings.apiKey, 
          this.aiSettings.selectedModel,
          this.aiSettings.apiUrl,
          this.aiSettings.maxTokens,
          this.aiSettings.temperature
        );
        
        // Only show success message if requested (default behavior)
        if (showMessage) {
          this.saveSuccess = true;
          this.saveMessage = 'AI settings saved successfully!';
          this.clearSaveMessage();
        }
        
        // Emit event to notify parent component
        this.$emit('settings-updated');
      } catch (error) {
        console.error('Error saving AI settings:', error);
        if (showMessage) {
          this.saveSuccess = false;
          this.saveMessage = 'Failed to save AI settings';
          this.clearSaveMessage();
        }
      }
    },
    
    // Sonarr Service Methods
    async testSonarrConnection() {
      if (!this.sonarrSettings.baseUrl || !this.sonarrSettings.apiKey) {
        this.sonarrConnectionStatus = false;
        this.sonarrConnectionMessage = 'URL and API key are required';
        return;
      }
      
      this.testingSonarr = true;
      this.sonarrConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await sonarrService.configure(this.sonarrSettings.baseUrl, this.sonarrSettings.apiKey);
        
        // Test the connection
        const success = await sonarrService.testConnection();
        
        // Update status based on response
        this.sonarrConnectionStatus = success;
        this.sonarrConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
          
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('sonarr-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Sonarr:', error);
        this.sonarrConnectionStatus = false;
        this.sonarrConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingSonarr = false;
      }
    },
    
    async saveSonarrSettings() {
      try {
        if (!this.sonarrSettings.baseUrl || !this.sonarrSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Sonarr URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service (which will store credentials server-side)
        await sonarrService.configure(this.sonarrSettings.baseUrl, this.sonarrSettings.apiKey);
        
        this.saveSuccess = true;
        this.saveMessage = 'Sonarr settings saved successfully!';
        
        // Emit event to notify parent component that Sonarr settings were updated
        this.$emit('sonarr-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Sonarr settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Sonarr settings';
        this.clearSaveMessage();
      }
    },
    
    // Radarr Service Methods
    async testRadarrConnection() {
      if (!this.radarrSettings.baseUrl || !this.radarrSettings.apiKey) {
        this.radarrConnectionStatus = false;
        this.radarrConnectionMessage = 'URL and API key are required';
        return;
      }
      
      this.testingRadarr = true;
      this.radarrConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await radarrService.configure(this.radarrSettings.baseUrl, this.radarrSettings.apiKey);
        
        // Test the connection
        const success = await radarrService.testConnection();
        
        // Update status based on response
        this.radarrConnectionStatus = success;
        this.radarrConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
        
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('radarr-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Radarr:', error);
        this.radarrConnectionStatus = false;
        this.radarrConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingRadarr = false;
      }
    },
    
    async saveRadarrSettings() {
      try {
        if (!this.radarrSettings.baseUrl || !this.radarrSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Radarr URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Configure the service (which will store credentials server-side)
        await radarrService.configure(this.radarrSettings.baseUrl, this.radarrSettings.apiKey);
        
        this.saveSuccess = true;
        this.saveMessage = 'Radarr settings saved successfully!';
        
        // Emit event to notify parent component that Radarr settings were updated
        this.$emit('radarr-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Radarr settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Radarr settings';
        this.clearSaveMessage();
      }
    },
    
    // Plex Service Methods
    async testPlexConnection() {
      if (!this.plexSettings.baseUrl || !this.plexSettings.token) {
        this.plexConnectionStatus = false;
        this.plexConnectionMessage = 'URL and Plex token are required';
        return;
      }
      
      this.testingPlex = true;
      this.plexConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await plexService.configure(this.plexSettings.baseUrl, this.plexSettings.token);
        
        // Store the recent limit in localStorage (server doesn't need this)
        localStorage.setItem('plexRecentLimit', this.plexSettings.recentLimit.toString());
        
        // Test the connection
        const success = await plexService.testConnection();
        
        // Update status based on response
        this.plexConnectionStatus = success;
        this.plexConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and Plex token.';
        
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('plex-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Plex:', error);
        this.plexConnectionStatus = false;
        this.plexConnectionMessage = 'Connection error. Please check your URL and Plex token.';
      } finally {
        this.testingPlex = false;
      }
    },
    
    async savePlexSettings() {
      try {
        if (!this.plexSettings.baseUrl || !this.plexSettings.token) {
          this.saveSuccess = false;
          this.saveMessage = 'Plex URL and token are required';
          this.clearSaveMessage();
          return;
        }
        
        // Store the recent limit in localStorage (server doesn't need this)
        localStorage.setItem('plexRecentLimit', this.plexSettings.recentLimit.toString());
        
        // Configure the service (which will store credentials server-side)
        await plexService.configure(this.plexSettings.baseUrl, this.plexSettings.token);
        
        this.saveSuccess = true;
        this.saveMessage = 'Plex settings saved successfully!';
        
        // Emit event to notify parent component that Plex settings were updated
        this.$emit('plex-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Plex settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Plex settings';
        this.clearSaveMessage();
      }
    },
    
    // Jellyfin Service Methods
    async testJellyfinConnection() {
      if (!this.jellyfinSettings.baseUrl || !this.jellyfinSettings.apiKey || !this.jellyfinSettings.userId) {
        this.jellyfinConnectionStatus = false;
        this.jellyfinConnectionMessage = 'URL, API key, and User ID are required';
        return;
      }
      
      this.testingJellyfin = true;
      this.jellyfinConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await jellyfinService.configure(
          this.jellyfinSettings.baseUrl, 
          this.jellyfinSettings.apiKey,
          this.jellyfinSettings.userId
        );
        
        // Store the recent limit in localStorage (server doesn't need this)
        localStorage.setItem('jellyfinRecentLimit', this.jellyfinSettings.recentLimit.toString());
        
        // Test the connection
        const result = await jellyfinService.testConnection();
        
        // Update status based on response
        this.jellyfinConnectionStatus = result.success;
        this.jellyfinConnectionMessage = result.message;
        
        // If successful, emit event to notify parent component
        if (result.success) {
          this.$emit('jellyfin-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Jellyfin:', error);
        this.jellyfinConnectionStatus = false;
        this.jellyfinConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingJellyfin = false;
      }
    },
    
    async saveJellyfinSettings() {
      try {
        if (!this.jellyfinSettings.baseUrl || !this.jellyfinSettings.apiKey || !this.jellyfinSettings.userId) {
          this.saveSuccess = false;
          this.saveMessage = 'Jellyfin URL, API key, and User ID are required';
          this.clearSaveMessage();
          return;
        }
        
        // Store the recent limit in localStorage (server doesn't need this)
        localStorage.setItem('jellyfinRecentLimit', this.jellyfinSettings.recentLimit.toString());
        
        // Configure the service (which will store credentials server-side)
        await jellyfinService.configure(
          this.jellyfinSettings.baseUrl, 
          this.jellyfinSettings.apiKey,
          this.jellyfinSettings.userId
        );
        
        this.saveSuccess = true;
        this.saveMessage = 'Jellyfin settings saved successfully!';
        
        // Emit event to notify parent component
        this.$emit('jellyfin-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Jellyfin settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Jellyfin settings';
        this.clearSaveMessage();
      }
    },
    
    // Tautulli Service Methods
    async testTautulliConnection() {
      if (!this.tautulliSettings.baseUrl || !this.tautulliSettings.apiKey) {
        this.tautulliConnectionStatus = false;
        this.tautulliConnectionMessage = 'URL and API key are required';
        return;
      }
      
      this.testingTautulli = true;
      this.tautulliConnectionMessage = '';
      
      try {
        // Configure the service with provided details
        await tautulliService.configure(this.tautulliSettings.baseUrl, this.tautulliSettings.apiKey);
        
        // Store the recent limit in localStorage (server doesn't need this)
        localStorage.setItem('tautulliRecentLimit', this.tautulliSettings.recentLimit.toString());
        
        // Test the connection
        const success = await tautulliService.testConnection();
        
        // Update status based on response
        this.tautulliConnectionStatus = success;
        this.tautulliConnectionMessage = success 
          ? 'Connected successfully!'
          : 'Connection failed. Please check your URL and API key.';
        
        // If successful, emit event to notify parent component
        if (success) {
          this.$emit('tautulli-settings-updated');
        }
          
      } catch (error) {
        console.error('Error connecting to Tautulli:', error);
        this.tautulliConnectionStatus = false;
        this.tautulliConnectionMessage = 'Connection error. Please check your URL and API key.';
      } finally {
        this.testingTautulli = false;
      }
    },
    
    async saveTautulliSettings() {
      try {
        if (!this.tautulliSettings.baseUrl || !this.tautulliSettings.apiKey) {
          this.saveSuccess = false;
          this.saveMessage = 'Tautulli URL and API key are required';
          this.clearSaveMessage();
          return;
        }
        
        // Store the recent limit in localStorage (server doesn't need this)
        localStorage.setItem('tautulliRecentLimit', this.tautulliSettings.recentLimit.toString());
        
        // Configure the service (which will store credentials server-side)
        await tautulliService.configure(this.tautulliSettings.baseUrl, this.tautulliSettings.apiKey);
        
        this.saveSuccess = true;
        this.saveMessage = 'Tautulli settings saved successfully!';
        
        // Emit event to notify parent component
        this.$emit('tautulli-settings-updated');
        
        this.clearSaveMessage();
      } catch (error) {
        console.error('Error saving Tautulli settings:', error);
        this.saveSuccess = false;
        this.saveMessage = 'Failed to save Tautulli settings';
        this.clearSaveMessage();
      }
    },
    
    // Helper Methods
    clearSaveMessage() {
      // Clear message after a longer delay (matching animation duration)
      setTimeout(() => {
        this.saveMessage = '';
      }, 3500);
    }
  }
};
</script>

<style scoped>
.ai-settings {
  padding: 20px;
  max-width: 650px;
  margin: 0 auto;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--header-color);
  text-align: center;
  transition: color var(--transition-speed);
}

/* Tabs Styling */
.settings-tabs {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.tab-button {
  padding: 10px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  transition: all 0.3s ease;
  flex: 1;
  text-align: center;
  white-space: nowrap;
}

@media (min-width: 480px) {
  .tab-button {
    padding: 10px 20px;
    font-size: 16px;
  }
}

.tab-button:hover {
  background-color: var(--nav-hover-bg);
  transition: background-color var(--transition-speed);
}

.tab-button.active {
  color: var(--button-primary-bg);
  border-bottom: 3px solid var(--button-primary-bg);
  transition: color var(--transition-speed), border-color var(--transition-speed);
}

/* Common Settings Section Styling */
.settings-section {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.settings-intro {
  margin-bottom: 20px;
  background-color: var(--card-bg-color);
  padding: 15px 20px;
  border-radius: 8px;
  border-left: 4px solid var(--button-primary-bg);
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.settings-intro p {
  margin: 8px 0;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

.settings-intro a {
  color: var(--button-primary-bg);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-speed);
}

.settings-intro a:hover {
  text-decoration: underline;
}

.settings-form {
  background-color: var(--card-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              color var(--transition-speed),
              border-color var(--transition-speed);
}

.api-key-input {
  display: flex;
  gap: 10px;
}

.api-key-input input {
  flex: 1;
}

.toggle-button {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 10px;
  cursor: pointer;
}

/* Button Styles */
.model-actions {
  margin-bottom: 10px;
}

.action-button, .test-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.action-button:hover:not(:disabled),
.test-button:hover:not(:disabled) {
  background-color: #0069d9;
}

.action-button:disabled,
.test-button:disabled {
  background-color: #b0b0b0;
  cursor: not-allowed;
}

.save-button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 16px;
  margin-left: 10px;
  flex: 1;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.save-button:hover:not(:disabled) {
  filter: brightness(1.1);
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-icon {
  display: inline-flex;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Action Buttons Container */
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 480px) {
  .actions {
    flex-direction: column;
  }
  
  .save-button {
    margin-left: 0 !important;
  }
}

/* Models List Styling */
.models-container {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}

.search-box {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  justify-content: space-between;
}

.model-search {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              color var(--transition-speed);
}

.model-count {
  margin-left: 10px;
  font-size: 13px;
  color: var(--text-color);
  background-color: var(--bg-color);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color var(--transition-speed), color var(--transition-speed);
}

.models-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
  background-color: var(--card-bg-color);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 5px;
  scrollbar-width: thin;
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed);
}

.models-list::-webkit-scrollbar {
  width: 8px;
}

.models-list::-webkit-scrollbar-track {
  background: var(--bg-color);
  border-radius: 4px;
  transition: background-color var(--transition-speed);
}

.models-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
  transition: background-color var(--transition-speed);
}

.models-list::-webkit-scrollbar-thumb:hover {
  background: var(--nav-text-color);
}

.model-option {
  padding: 5px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.model-option:hover {
  background-color: var(--nav-hover-bg);
  transition: background-color var(--transition-speed);
}

.model-option input[type="radio"] {
  margin: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.model-option label {
  font-weight: normal;
  margin-left: 10px;
  cursor: pointer;
  display: inline-block;
  padding: 2px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

/* Slider Styling */
.slider-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slider-container input {
  flex: 1;
}

.slider-value {
  min-width: 40px;
  text-align: center;
}

/* Message Styling */
.no-models, .error-message, .no-results {
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.no-models, .no-results {
  background-color: #f8f9fa;
  color: #6c757d;
  text-align: center;
}

.no-results {
  grid-column: 1 / -1; /* Span all columns */
  margin-top: 0;
  padding: 20px;
  background-color: rgba(248, 249, 250, 0.7);
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
}

.save-notification {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 280px;
  max-width: 400px;
  animation: slideUp 0.3s ease, pulse 0.5s ease 1s, fadeOut 0.5s ease 3s forwards;
}

.notification-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 500;
}

.notification-icon {
  margin-right: 10px;
  display: flex;
  align-items: center;
}

@keyframes slideUp {
  from { transform: translate(-50%, 20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes pulse {
  0% { transform: translate(-50%, 0) scale(1); }
  50% { transform: translate(-50%, 0) scale(1.05); }
  100% { transform: translate(-50%, 0) scale(1); }
}

.connection-message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.success {
  background-color: #4caf50;
  color: white;
}

.error {
  background-color: #f44336;
  color: white;
}

/* Help Section */
.settings-help {
  margin-top: 30px;
  padding: 15px;
  border-top: 1px solid var(--border-color);
  transition: border-color var(--transition-speed);
}

.settings-help h3 {
  font-size: 16px;
  color: var(--header-color);
  margin-top: 0;
  margin-bottom: 10px;
  transition: color var(--transition-speed);
}

.settings-help p {
  margin: 8px 0;
  color: var(--text-color);
  font-size: 14px;
  transition: color var(--transition-speed);
}

.settings-help ul {
  padding-left: 20px;
  margin: 10px 0;
}

.settings-help li {
  margin-bottom: 8px;
  color: var(--text-color);
  font-size: 14px;
  transition: color var(--transition-speed);
}

.settings-help strong {
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.settings-help a {
  color: var(--button-primary-bg);
  text-decoration: none;
  transition: color var(--transition-speed);
}

.settings-help a:hover {
  text-decoration: underline;
}

.api-note {
  font-style: italic;
  opacity: 0.8;
  font-size: 13px !important;
  margin-top: 15px !important;
}

.field-hint {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.7;
  margin-top: 4px;
  transition: color var(--transition-speed);
}

/* Section Card Styling */
.section-card {
  margin-bottom: 30px;
  background-color: var(--card-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), box-shadow var(--transition-speed);
}

.section-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  color: var(--header-color);
  font-size: 20px;
  transition: color var(--transition-speed);
}

.section-description {
  color: var(--text-color);
  opacity: 0.8;
  margin-bottom: 15px;
  font-size: 14px;
}

/* Connected Services Styling */
.connected-services-wrapper {
  border-left: 4px solid var(--button-primary-bg);
}

.collapsible-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding-bottom: 8px;
}

.collapsible-header:hover h3 {
  color: var(--button-primary-bg);
}

.collapse-toggle {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
  opacity: 0.7;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.collapse-toggle:hover {
  background-color: var(--nav-hover-bg);
  opacity: 1;
}

.collapse-toggle svg {
  transition: transform 0.3s ease;
}

.collapse-toggle svg.rotate {
  transform: rotate(180deg);
}

.collapsible-content {
  animation: slideDown 0.3s ease-out;
  transform-origin: top;
  overflow: hidden;
}

@keyframes slideDown {
  from { 
    opacity: 0;
    transform: scaleY(0);
    max-height: 0;
  }
  to { 
    opacity: 1;
    transform: scaleY(1);
    max-height: 1000px;
  }
}

.connected-services {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.connection-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  background-color: var(--card-bg-color);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  height: 80px;
}

.connection-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.connection-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 8px;
}

.connection-action {
  font-size: 12px;
  opacity: 0.7;
  font-weight: 500;
}

.plex-button {
  border-color: #CC7B19;
  color: #CC7B19;
}

.plex-button:hover {
  background-color: rgba(204, 123, 25, 0.08);
}

.jellyfin-button {
  border-color: #AA5CC3;
  color: #AA5CC3;
}

.jellyfin-button:hover {
  background-color: rgba(170, 92, 195, 0.08);
}

.tautulli-button {
  border-color: #7c3aed; /* Tautulli purple color */
  color: #7c3aed;
}

.tautulli-button:hover {
  background-color: rgba(124, 58, 237, 0.08);
}

.sonarr-button {
  border-color: #35c5f4;
  color: #35c5f4;
}

.sonarr-button:hover {
  background-color: rgba(53, 197, 244, 0.08);
}

.radarr-button {
  border-color: #f93a2f;
  color: #f93a2f;
}

.radarr-button:hover {
  background-color: rgba(249, 58, 47, 0.08);
}

/* Connection Modal Styling */
.connection-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.connection-modal {
  background-color: var(--card-bg-color);
  border-radius: 10px;
  max-width: 550px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
  animation: modalFadeIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--header-color);
}

.modal-close-x {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.modal-close-x:hover {
  opacity: 1;
}

.modal-body {
  padding: 0;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  text-align: right;
}

.modal-close-button {
  padding: 8px 20px;
  background-color: var(--button-secondary-bg);
  color: var(--button-secondary-text);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.modal-close-button:hover {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  border-color: var(--button-primary-bg);
}

@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>