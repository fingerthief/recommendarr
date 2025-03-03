<template>
  <nav class="navigation">
    <div class="nav-container">
      <div class="nav-brand">
        <span class="brand-icon">🎬</span>
        <span class="brand-name">Recommendarr</span>
      </div>
      
      <div class="nav-menu">
        <button 
          @click="$emit('navigate', 'tv-recommendations')" 
          :class="{ active: activeTab === 'tv-recommendations' }"
          class="nav-item"
        >
          <span class="nav-icon">📺</span>
          <span class="nav-text">TV Shows</span>
        </button>
        
        <button 
          @click="$emit('navigate', 'movie-recommendations')" 
          :class="{ active: activeTab === 'movie-recommendations' }"
          class="nav-item"
        >
          <span class="nav-icon">🎬</span>
          <span class="nav-text">Movies</span>
        </button>
        
        <button 
          @click="$emit('navigate', 'history')" 
          :class="{ active: activeTab === 'history' }"
          class="nav-item"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">History</span>
        </button>
        
        <button 
          @click="$emit('navigate', 'settings')" 
          :class="{ active: activeTab === 'settings' }"
          class="nav-item"
        >
          <span class="nav-icon">⚙️</span>
          <span class="nav-text">Settings</span>
        </button>
      </div>
      
      <div class="nav-actions">
        <button 
          @click="toggleTheme" 
          class="action-button theme-button"
          :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <span v-if="isDarkTheme" class="nav-icon">☀️</span>
          <span v-else class="nav-icon">🌙</span>
        </button>
        
        <button 
          @click="confirmClearData" 
          class="action-button logout-button"
          title="Clear all saved data"
        >
          <span class="nav-icon">🗑️</span>
          <span class="action-text">Clear Data</span>
        </button>
      </div>
      
      <button class="mobile-menu-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <div class="hamburger" :class="{ 'active': mobileMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </div>
    
    <!-- Mobile Navigation Menu -->
    <div class="mobile-menu" :class="{ 'open': mobileMenuOpen }">
      <button 
        @click="navigateMobile('tv-recommendations')" 
        :class="{ active: activeTab === 'tv-recommendations' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">📺</span>
        <span>TV Shows</span>
      </button>
      
      <button 
        @click="navigateMobile('movie-recommendations')" 
        :class="{ active: activeTab === 'movie-recommendations' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">🎬</span>
        <span>Movies</span>
      </button>
      
      <button 
        @click="navigateMobile('history')" 
        :class="{ active: activeTab === 'history' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">📋</span>
        <span>History</span>
      </button>
      
      <button 
        @click="navigateMobile('settings')" 
        :class="{ active: activeTab === 'settings' }"
        class="mobile-nav-item"
      >
        <span class="nav-icon">⚙️</span>
        <span>Settings</span>
      </button>
      
      <div class="mobile-actions">
        <button 
          @click="toggleTheme" 
          class="mobile-action theme-button"
        >
          <span v-if="isDarkTheme" class="nav-icon">☀️</span>
          <span v-else class="nav-icon">🌙</span>
          <span>{{ isDarkTheme ? 'Light Mode' : 'Dark Mode' }}</span>
        </button>
        
        <button 
          @click="confirmClearData" 
          class="mobile-action logout-button"
        >
          <span class="nav-icon">🗑️</span>
          <span>Clear Data</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'AppNavigation',
  props: {
    activeTab: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isDarkTheme: false,
      mobileMenuOpen: false
    };
  },
  created() {
    // Check if the user has a saved theme preference
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme === 'true') {
      this.isDarkTheme = true;
      document.body.classList.add('dark-theme');
    }
  },
  methods: {
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      
      if (this.isDarkTheme) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      
      // Save the theme preference
      localStorage.setItem('darkTheme', this.isDarkTheme);
    },
    navigateMobile(tab) {
      this.$emit('navigate', tab);
      this.mobileMenuOpen = false; // Close mobile menu after navigation
    },
    confirmClearData() {
      if (confirm('Are you sure you want to clear all saved data? This will remove all your API keys and settings from both local storage and the server.')) {
        this.$emit('logout');
      }
    }
  }
};
</script>

<style scoped>
.navigation {
  background-color: var(--nav-bg-color);
  color: var(--nav-active-text);
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 100;
}

/* Main Navigation Container */
.nav-container {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  position: relative;
}

/* Brand/Logo Styling */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 24px;
  font-weight: bold;
  font-size: 18px;
  color: var(--nav-active-text);
}

.brand-icon {
  font-size: 20px;
}

/* Hide brand name on very small screens */
@media (max-width: 360px) {
  .brand-name {
    display: none;
  }
}

/* Main Menu Styling */
.nav-menu {
  display: none;
}

@media (min-width: 768px) {
  .nav-menu {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: var(--nav-hover-bg);
  color: var(--nav-active-text);
}

.nav-item.active {
  background-color: var(--button-primary-bg);
  color: white;
  font-weight: 500;
}

.nav-icon {
  font-size: 16px;
}

/* Action Buttons */
.nav-actions {
  margin-left: auto;
  display: none;
}

@media (min-width: 768px) {
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--nav-active-text);
}

.logout-button {
  background-color: rgba(255, 59, 48, 0.2);
  color: var(--nav-active-text);
}

.action-text {
  display: none;
}

@media (min-width: 992px) {
  .action-text {
    display: inline;
  }
  
  .action-button {
    padding: 8px 12px;
  }
  
  .logout-button {
    background-color: rgba(255, 59, 48, 0.2);
  }
}

.logout-button:hover {
  background-color: rgba(255, 59, 48, 0.4);
}

/* Mobile Menu Toggle Button */
.mobile-menu-toggle {
  display: block;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 40px;
  height: 40px;
  padding: 8px;
  margin-left: auto;
  position: relative;
  z-index: 101;
}

@media (min-width: 768px) {
  .mobile-menu-toggle {
    display: none;
  }
}

.hamburger {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background-color: var(--nav-active-text);
  transition: all 0.3s;
  border-radius: 2px;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Mobile Menu */
.mobile-menu {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  background-color: var(--nav-bg-color);
  display: flex;
  flex-direction: column;
  transform: translateY(-100%);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 99;
}

.mobile-menu.open {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-bottom: 8px;
}

.mobile-nav-item:hover {
  background-color: var(--nav-hover-bg);
}

.mobile-nav-item.active {
  background-color: var(--button-primary-bg);
  color: white;
}

.mobile-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: transparent;
  border: none;
  color: var(--nav-text-color);
  text-align: left;
  font-size: 16px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.mobile-action.theme-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.mobile-action.logout-button {
  background-color: rgba(255, 59, 48, 0.2);
  color: var(--nav-active-text);
}

.mobile-action.logout-button:hover {
  background-color: rgba(255, 59, 48, 0.4);
}
</style>