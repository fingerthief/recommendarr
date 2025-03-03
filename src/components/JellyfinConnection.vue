<template>
  <div class="jellyfin-connection">
    <h2>Connect to Jellyfin</h2>
    
    <div v-if="jellyfinConnected" class="connection-status">
      <p class="success">Connected successfully!</p>
    </div>
    
    <form @submit.prevent="saveSettings">
      <div class="form-group">
        <label for="jellyfinUrl">Jellyfin URL:</label>
        <input
          id="jellyfinUrl"
          v-model="jellyfinUrl"
          type="text"
          placeholder="http://your-jellyfin-server:8096"
          :disabled="loading"
          required
        />
        <p class="help-text">Example: http://192.168.1.100:8096 or http://jellyfin.local:8096</p>
      </div>
      
      <div class="form-group">
        <label for="jellyfinApiKey">API Key:</label>
        <input
          id="jellyfinApiKey"
          v-model="jellyfinApiKey"
          type="password"
          placeholder="Your Jellyfin API Key"
          :disabled="loading"
          required
        />
        <p class="help-text">
          You can generate an API key in Jellyfin under your profile → Advanced → API Keys
        </p>
      </div>
      
      <div class="form-group">
        <label for="jellyfinUser">User:</label>
        
        <div v-if="userSelectMode" class="user-selection">
          <div v-if="loadingUsers" class="loading-users">
            <div class="spinner"></div>
            <span>Loading users...</span>
          </div>
          
          <div v-else-if="users.length === 0" class="no-users-warning">
            No users found. Please check your API key permissions.
          </div>
          
          <div v-else class="users-list">
            <button 
              v-for="user in users" 
              :key="user.id"
              class="user-item"
              :class="{ selected: user.id === jellyfinUserId }"
              @click="selectUser(user)"
              type="button"
            >
              <span class="user-name">{{ user.name }}</span>
              <div class="user-badges">
                <span v-if="user.id === jellyfinUserId" class="badge selected-badge">Selected</span>
                <span v-if="user.isAdministrator" class="badge admin-badge">Admin</span>
              </div>
            </button>
          </div>
          
          <button type="button" class="secondary-button" @click="userSelectMode = false">
            Enter ID Manually
          </button>
        </div>
        
        <div v-else class="manual-user-entry">
          <input
            id="jellyfinUserId"
            v-model="jellyfinUserId"
            type="text"
            placeholder="Your Jellyfin User ID"
            :disabled="loading"
            required
          />
          <p class="help-text">
            Your User ID can be found in your profile settings under "Profile Information"
          </p>
          <button 
            type="button" 
            class="secondary-button" 
            @click="fetchUsers" 
            :disabled="!canFetchUsers || loading"
          >
            Select User
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="jellyfinHistoryLimit">History Limit:</label>
        <div class="limit-control">
          <input
            id="jellyfinHistoryLimit"
            v-model.number="jellyfinHistoryLimit"
            type="number"
            min="1"
            max="500"
            :disabled="loading"
          />
          <div class="limit-buttons">
            <button type="button" @click="decreaseLimit" class="limit-btn">-</button>
            <button type="button" @click="increaseLimit" class="limit-btn">+</button>
          </div>
        </div>
        <p class="help-text">Number of recently watched items to fetch</p>
      </div>
      
      <div class="form-actions">
        <button
          type="submit"
          class="primary-button"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner small"></span>
          {{ loading ? 'Connecting...' : 'Save & Test Connection' }}
        </button>
      </div>
    </form>
    
    <div v-if="message" class="connection-status">
      <p :class="messageSuccess ? 'success' : 'error'">
        {{ message }}
      </p>
    </div>
    
    <div v-if="jellyfinConnected" class="disconnection-section">
      <button type="button" @click="disconnect" class="disconnect-btn">
        Disconnect Jellyfin
      </button>
    </div>
  </div>
</template>

<script>
import JellyfinService from '@/services/JellyfinService.js';
import credentialsService from '@/services/CredentialsService.js';

export default {
  name: 'JellyfinConnection',
  props: {
    connected: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      jellyfinUrl: '',
      jellyfinApiKey: '',
      jellyfinUserId: '',
      jellyfinHistoryLimit: parseInt(localStorage.getItem('jellyfinHistoryLimit') || '50'),
      loading: false,
      message: '',
      messageSuccess: false,
      jellyfinConnected: this.connected,
      users: [],
      loadingUsers: false,
      userSelectMode: false
    };
  },
  async created() {
    // If already connected, load current values from service
    if (this.connected) {
      this.jellyfinUrl = JellyfinService.baseUrl;
      this.jellyfinApiKey = JellyfinService.apiKey;
      this.jellyfinUserId = JellyfinService.userId;
    }
    
    // Try to load credentials from server if not set
    if (!this.jellyfinUrl || !this.jellyfinApiKey) {
      try {
        const credentials = await credentialsService.getCredentials('jellyfin');
        if (credentials) {
          this.jellyfinUrl = credentials.baseUrl || '';
          this.jellyfinApiKey = credentials.apiKey || '';
          this.jellyfinUserId = credentials.userId || '';
        }
      } catch (error) {
        console.error('Error loading saved Jellyfin credentials:', error);
      }
    }
  },
  computed: {
    canFetchUsers() {
      return this.jellyfinUrl && this.jellyfinApiKey;
    }
  },
  watch: {
    connected(newVal) {
      this.jellyfinConnected = newVal;
    }
  },
  methods: {
    decreaseLimit() {
      if (this.jellyfinHistoryLimit > 1) {
        this.jellyfinHistoryLimit--;
      }
    },
    
    increaseLimit() {
      if (this.jellyfinHistoryLimit < 500) {
        this.jellyfinHistoryLimit++;
      }
    },
    
    async fetchUsers() {
      if (!this.canFetchUsers) return;
      
      this.loadingUsers = true;
      this.userSelectMode = true;
      
      try {
        // Temporarily configure the service for the API call
        JellyfinService.configure(
          this.jellyfinUrl,
          this.jellyfinApiKey,
          ''
        );
        
        this.users = await JellyfinService.getUsers();
      } catch (error) {
        console.error('Error fetching users:', error);
        this.message = 'Failed to fetch users. Please check your API key permissions.';
        this.messageSuccess = false;
      } finally {
        this.loadingUsers = false;
      }
    },
    
    selectUser(user) {
      this.jellyfinUserId = user.id;
      this.userSelectMode = false;
    },
    
    async saveSettings() {
      this.loading = true;
      this.message = '';

      // Validate input
      if (!this.jellyfinUrl || !this.jellyfinApiKey || !this.jellyfinUserId) {
        this.message = 'Please enter all required fields';
        this.messageSuccess = false;
        this.loading = false;
        return;
      }

      // Save the history limit
      localStorage.setItem('jellyfinHistoryLimit', this.jellyfinHistoryLimit.toString());
      this.$emit('limitChanged', this.jellyfinHistoryLimit);

      // Configure the Jellyfin service
      await JellyfinService.configure(
        this.jellyfinUrl,
        this.jellyfinApiKey,
        this.jellyfinUserId
      );

      // Test the connection
      try {
        const result = await JellyfinService.testConnection();
        this.message = result.message;
        this.messageSuccess = result.success;
        
        if (result.success) {
          this.jellyfinConnected = true;
          this.$emit('connected', true);
        } else {
          this.jellyfinConnected = false;
          this.$emit('connected', false);
        }
      } catch (error) {
        this.message = `Error: ${error.message || 'Unknown error occurred'}`;
        this.messageSuccess = false;
        this.jellyfinConnected = false;
        this.$emit('connected', false);
      }

      this.loading = false;
    },
    
    async clearStoredCredentials() {
      // Delete credentials from server
      await credentialsService.deleteCredentials('jellyfin');
    },
    
    disconnect() {
      this.clearStoredCredentials();
      
      // Reset component state
      this.jellyfinUrl = '';
      this.jellyfinApiKey = '';
      this.jellyfinUserId = '';
      this.jellyfinConnected = false;
      this.message = 'Disconnected from Jellyfin.';
      this.messageSuccess = true;
      
      // Notify parent components
      this.$emit('connected', false);
      this.$emit('disconnected');
    }
  }
};
</script>

<style scoped>
.jellyfin-connection {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--card-bg-color);
  box-shadow: var(--card-shadow);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              box-shadow var(--transition-speed);
}

h2 {
  margin-top: 0;
  color: var(--header-color);
  transition: color var(--transition-speed);
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: var(--text-color);
  transition: color var(--transition-speed);
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  box-sizing: border-box;
  background-color: var(--input-bg);
  color: var(--input-text);
  transition: background-color var(--transition-speed), 
              border-color var(--transition-speed),
              color var(--transition-speed);
}

input[type="number"] {
  width: 60px;
  text-align: center;
}

.help-text {
  font-size: 12px;
  margin-top: 5px;
  color: var(--text-muted);
  transition: color var(--transition-speed);
}

button {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color var(--transition-speed), 
              color var(--transition-speed),
              filter 0.2s;
}

button:hover:not(:disabled) {
  filter: brightness(1.1);
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-actions {
  margin-top: 20px;
}

.primary-button {
  width: 100%;
  padding: 10px 15px;
  background-color: var(--button-primary-bg);
  color: white;
}

.secondary-button {
  background-color: #6c757d;
  color: white;
  font-size: 14px;
  margin-top: 10px;
}

.connection-status {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
}

.success {
  color: #4caf50;
  transition: color var(--transition-speed);
}

.error {
  color: #f44336;
  transition: color var(--transition-speed);
}

/* User selection styling */
.user-selection {
  margin-top: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
}

.loading-users {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--button-primary-bg);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.no-users-warning {
  background-color: #fff3cd;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.users-list {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 10px;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 5px;
  text-align: left;
  width: 100%;
  transition: all 0.2s;
}

.user-item:hover {
  border-color: var(--button-primary-bg);
}

.user-item.selected {
  border-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.user-badges {
  display: flex;
  gap: 5px;
}

.badge {
  font-size: 11px;
  font-weight: bold;
  padding: 3px 6px;
  border-radius: 10px;
}

.selected-badge {
  background-color: #4caf50;
  color: white;
}

.admin-badge {
  background-color: #6c757d;
  color: white;
}

/* Limit control styling */
.limit-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.limit-buttons {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.limit-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.disconnection-section {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
}

.disconnect-btn {
  background-color: #f44336;
  width: 100%;
  color: white;
  margin-top: 10px;
  font-weight: bold;
  padding: 12px;
}

.disconnect-btn:hover {
  background-color: #d32f2f;
  filter: brightness(1.1);
}
</style>