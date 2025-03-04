const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('./utils/encryption');

const app = express();
const PORT = process.env.PORT || 3050;

// Simple logging message for startup
console.log(`API Server starting up in ${process.env.NODE_ENV || 'development'} mode`);

// Create a data directory for storing user credentials
const DATA_DIR = path.join(__dirname, 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');

// Initialize credentials storage
let credentials = {};

// Create data directory if it doesn't exist and load credentials
async function initCredentialsStorage() {
  try {
    // Initialize encryption service first
    await encryptionService.init();
    
    // Ensure data directory exists
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      console.log(`Created data directory: ${DATA_DIR}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating data directory:', err);
      }
    }

    // Try to load existing credentials
    try {
      const data = await fs.readFile(CREDENTIALS_FILE, 'utf8');
      const fileData = JSON.parse(data);
      
      // Check if data is already encrypted
      if (fileData.encrypted && fileData.iv && fileData.authTag) {
        // Decrypt the data
        credentials = encryptionService.decrypt(fileData);
        console.log('Loaded and decrypted existing credentials');
      } else {
        // Legacy unencrypted data - encrypt it now
        credentials = fileData;
        await saveCredentials();
        console.log('Migrated unencrypted credentials to encrypted format');
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, initialize with empty object
        credentials = {};
        await saveCredentials();
        console.log('Created new encrypted credentials file');
      } else {
        console.error('Error reading credentials file:', err);
      }
    }
  } catch (err) {
    console.error('Error initializing credentials storage:', err);
  }
}

// Save credentials to file with encryption
async function saveCredentials() {
  try {
    // Encrypt the credentials object
    const encryptedData = encryptionService.encrypt(credentials);
    
    // Write encrypted data to file
    await fs.writeFile(CREDENTIALS_FILE, JSON.stringify(encryptedData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving credentials:', err);
  }
}

// Initialize credentials storage on startup
initCredentialsStorage();

// Enable CORS
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API endpoints for credentials management
// Get all credentials (service IDs only, no secrets)
app.get('/api/credentials', (req, res) => {
  // Return just the service names and their existence, not the actual keys
  const services = {};
  for (const [service, creds] of Object.entries(credentials)) {
    services[service] = Object.keys(creds).reduce((acc, key) => {
      // Don't send the actual API keys or sensitive data to the client
      acc[key] = creds[key] ? true : false;
      return acc;
    }, {});
  }
  res.json({ services });
});

// Store credentials for a service
app.post('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  const serviceCredentials = req.body;
  
  if (!serviceCredentials) {
    return res.status(400).json({ error: 'No credentials provided' });
  }
  
  // Initialize the service if it doesn't exist
  if (!credentials[service]) {
    credentials[service] = {};
  }
  
  // Update the credentials
  credentials[service] = {
    ...credentials[service],
    ...serviceCredentials
  };
  
  // Save to file
  await saveCredentials();
  
  // Return success, but don't echo back the credentials
  res.json({ success: true, service });
});

// Retrieve credentials for a service
app.get('/api/credentials/:service', (req, res) => {
  const { service } = req.params;
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  res.json(credentials[service]);
});

// Delete credentials for a service
app.delete('/api/credentials/:service', async (req, res) => {
  const { service } = req.params;
  
  if (!credentials[service]) {
    return res.status(404).json({ error: `No credentials found for ${service}` });
  }
  
  delete credentials[service];
  await saveCredentials();
  
  res.json({ success: true, message: `Credentials for ${service} deleted` });
});

// Generic proxy endpoint for all services
// Endpoint to help diagnose network connectivity issues
app.get('/api/net-test', async (req, res) => {
  const target = req.query.target;
  
  if (!target) {
    return res.status(400).json({ error: 'Target IP or hostname required' });
  }
  
  const results = {
    target,
    checks: {}
  };
  
  try {
    // Try to ping via DNS lookup
    const dnsStartTime = Date.now();
    try {
      const dnsResult = await dns.lookup(target);
      results.checks.dns = {
        success: true,
        ip: dnsResult.address,
        time: Date.now() - dnsStartTime
      };
    } catch (error) {
      results.checks.dns = {
        success: false,
        error: error.message
      };
    }
    
    // Try HTTP connection if port specified
    const port = req.query.port;
    if (port) {
      const httpTarget = `http://${target}:${port}`;
      try {
        const httpStartTime = Date.now();
        const response = await axios.get(httpTarget, { timeout: 30000 });
        results.checks.http = {
          success: true,
          status: response.status,
          time: Date.now() - httpStartTime
        };
      } catch (error) {
        results.checks.http = {
          success: false,
          error: error.message,
          code: error.code
        };
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/proxy', async (req, res) => {
  const { url, method = 'GET', data = null, params = null, headers = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  console.log(`Proxy request to: ${url} (${method})`);

  // Process URL to handle local network services
  let processedUrl = url;
  
  // In Docker environment, we need to handle local network references 
  if (process.env.DOCKER_ENV === 'true') {
    // Check if URL contains localhost or 127.0.0.1
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      // Replace localhost with host.docker.internal to access host machine services
      processedUrl = url.replace(/(localhost|127\.0\.0\.1)/, 'host.docker.internal');
      console.log(`Converted localhost URL to Docker-friendly format: ${processedUrl}`);
    }
  }
  
  try {
    // Add request timeout to prevent hanging connections
    const response = await axios({
      url: processedUrl,
      method,
      data,
      params,
      headers,
      // Removed timeout to allow model generation time
      validateStatus: function (status) {
        // Accept all status codes to handle them in our response
        return true;
      }
    });
    
    console.log(`Proxy response from: ${processedUrl}, status: ${response.status}`);
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Provide more detailed error information
    const errorDetails = {
      error: error.message,
      code: error.code,
      data: error.response?.data || null
    };
    
    // Handle network connectivity errors with more helpful messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
      const isLocalNetworkIP = /https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)\d+\.\d+/.test(url);
      
      let message = 'Could not connect to the service.';
      
      if (isLocalhost) {
        message += ' The server cannot access your localhost address. Please ensure the Sonarr/Radarr service is running on your host machine.';
      } else if (isLocalNetworkIP) {
        message += ` Could not connect to ${url}. Please verify:
         1. The service is running on that IP
         2. The port is correct and open
         3. Any firewalls allow the connection
         4. The server has network access to that IP`;
      }
      
      console.error(`Connection error (${error.code}): ${message} Attempted URL: ${processedUrl}`);
      return res.status(502).json({
        ...errorDetails,
        message
      });
    }
    
    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ETIME') {
      console.error(`Timeout error: Request to ${processedUrl} timed out`);
      return res.status(504).json({
        ...errorDetails,
        message: 'The request timed out. This may happen if the service is not accessible from the server.'
      });
    }
    
    res.status(error.response?.status || 500).json(errorDetails);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}, bound to all network interfaces`);
});