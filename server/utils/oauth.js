// OAuth setup module
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const authService = require('./auth');

// Configure Passport authentication
exports.setupPassport = (app) => {
  
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure serialization/deserialization
  passport.serializeUser((user, done) => {
    
    done(null, user.userId);
  });
  
  passport.deserializeUser(async (userId, done) => {
    try {
      const user = await authService.getUserById(userId);
      if (!user) {
        
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });
  
  // Set up Google OAuth if credentials exist
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    
    
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        
        const user = await authService.findOrCreateOAuthUser(profile, 'google');
        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        return done(error, null);
      }
    }));
    
    
  } else {
    // Google OAuth not configured, skipping setup
  }
  
  // Set up GitHub OAuth if credentials exist
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    
    
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        
        const user = await authService.findOrCreateOAuthUser(profile, 'github');
        return done(null, user);
      } catch (error) {
        console.error('Error in GitHub OAuth callback:', error);
        return done(error, null);
      }
    }));
    
    
  } else {
    // GitHub OAuth not configured, skipping setup
  }
  
  // Set up Custom OAuth2 if credentials exist
  if (process.env.CUSTOM_OAUTH_CLIENT_ID && 
      process.env.CUSTOM_OAUTH_CLIENT_SECRET && 
      process.env.CUSTOM_OAUTH_AUTH_URL && 
      process.env.CUSTOM_OAUTH_TOKEN_URL && 
      process.env.CUSTOM_OAUTH_USERINFO_URL) {
    
    
    // Parse scope from environment variable or use default
    const scopeString = process.env.CUSTOM_OAUTH_SCOPE || 'openid profile email';
    const scope = scopeString.split(' ');
    
    // Generate a secure state parameter with sufficient entropy
    const generateState = function() {
      // Generate a random string with 16 characters (more than the 8 required)
      return require('crypto').randomBytes(16).toString('hex');
    };
    
    // Configure Custom OAuth2 strategy
    const customOAuthStrategy = new OAuth2Strategy({
      authorizationURL: process.env.CUSTOM_OAUTH_AUTH_URL,
      tokenURL: process.env.CUSTOM_OAUTH_TOKEN_URL,
      clientID: process.env.CUSTOM_OAUTH_CLIENT_ID,
      clientSecret: process.env.CUSTOM_OAUTH_CLIENT_SECRET,
      callbackURL: '/api/auth/custom/callback',
      scope: scope,
      state: true,  // Explicitly enable state parameter
      stateStore: {
        store: function(req, state, callback) {
          // Store state in session
          if (!req.session.authStates) {
            req.session.authStates = {};
          }
          req.session.authStates[state] = Date.now();
          callback(null, state);
        },
        verify: function(req, state, callback) {
          // Verify state from session
          if (!req.session.authStates || !req.session.authStates[state]) {
            return callback(new Error('Invalid state parameter'), false);
          }
          
          // Check if state is expired (older than 10 minutes)
          const stateTime = req.session.authStates[state];
          if (Date.now() - stateTime > 10 * 60 * 1000) {
            delete req.session.authStates[state];
            return callback(new Error('State parameter expired'), false);
          }
          
          // Clean up
          delete req.session.authStates[state];
          return callback(null, true);
        }
      }
    }, async (accessToken, refreshToken, params, profile, done) => {
      try {
        
        
        // Fetch user profile from userinfo endpoint
        const axios = require('axios');
        const userInfoResponse = await axios.get(process.env.CUSTOM_OAUTH_USERINFO_URL, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        
        
        // Map profile to expected format
        // This uses OpenID Connect standard fields, but can be customized
        const userProfile = {
          id: userInfoResponse.data.sub || userInfoResponse.data.id,
          displayName: userInfoResponse.data.name,
          emails: userInfoResponse.data.email ? [{ value: userInfoResponse.data.email }] : [],
          photos: userInfoResponse.data.picture ? [{ value: userInfoResponse.data.picture }] : []
        };
        
        const user = await authService.findOrCreateOAuthUser(userProfile, 'custom');
        return done(null, user);
      } catch (error) {
        console.error('Error in Custom OAuth callback:', error);
        return done(error, null);
      }
    });
    
    // Add custom userProfile method to fetch profile from userinfo endpoint
    customOAuthStrategy.userProfile = function(accessToken, done) {
      const axios = require('axios');
      axios.get(process.env.CUSTOM_OAUTH_USERINFO_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      .then(response => {
        const profile = {
          provider: 'custom',
          id: response.data.sub || response.data.id,
          displayName: response.data.name,
          username: response.data.preferred_username || response.data.username || response.data.sub || response.data.id,
          emails: response.data.email ? [{ value: response.data.email }] : [],
          photos: response.data.picture ? [{ value: response.data.picture }] : [],
          _raw: JSON.stringify(response.data),
          _json: response.data
        };
        done(null, profile);
      })
      .catch(error => {
        done(error);
      });
    };
    
    // Set the custom state generator
    customOAuthStrategy.generateState = generateState;
    
    passport.use('custom', customOAuthStrategy);
    
  } else {
    // Custom OAuth not configured, skipping setup
  }
  
  // Function to validate if OAuth providers are configured
  const getEnabledProviders = () => {
    const providers = [];
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push('google');
    }
    
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      providers.push('github');
    }
    
    if (process.env.CUSTOM_OAUTH_CLIENT_ID && 
        process.env.CUSTOM_OAUTH_CLIENT_SECRET && 
        process.env.CUSTOM_OAUTH_AUTH_URL && 
        process.env.CUSTOM_OAUTH_TOKEN_URL && 
        process.env.CUSTOM_OAUTH_USERINFO_URL) {
      providers.push('custom');
    }
    
    return providers;
  };
  
  return {
    passport,
    getEnabledProviders
  };
};
