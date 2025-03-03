import axios from 'axios';

/**
 * Client-side API service for communicating with our proxy server
 */
class ApiService {
  constructor() {
    this.baseUrl = process.env.VUE_APP_API_URL || 'http://localhost:3050/api';
  }

  /**
   * Send a request through the proxy server
   * 
   * @param {Object} options - Request options
   * @param {string} options.url - Target URL
   * @param {string} options.method - HTTP method (GET, POST, etc.)
   * @param {Object} options.data - Request body
   * @param {Object} options.params - URL parameters
   * @param {Object} options.headers - HTTP headers
   * @returns {Promise<Object>} - Response data
   */
  async proxyRequest(options) {
    try {
      const response = await axios.post(`${this.baseUrl}/proxy`, options);
      
      // If the proxy returns a status that's not 2xx but within 400-599, we still get a success response
      // from axios, but we need to check the status in the response data and throw appropriate errors
      if (response.data && response.data.status >= 400) {
        const errorInfo = {
          status: response.data.status,
          statusText: response.data.statusText,
          message: response.data.data?.message || 'An error occurred in the proxy request',
          code: response.data.data?.code,
          error: response.data.data || response.data.error || 'Unknown error'
        };
        
        console.error('Proxy error response:', errorInfo);
        throw errorInfo;
      }
      
      return response.data;
    } catch (error) {
      // Handle networking errors
      if (!error.response) {
        console.error('Network error in API service:', error.message);
        throw {
          status: 0,
          statusText: 'Network Error',
          message: 'Cannot connect to the API server. Please check your connection.',
          error: error.message
        };
      }
      
      // Handle API server errors
      console.error('Error in API service:', error);
      
      // If the error has a response with data property, it's from our proxy
      if (error.response?.data) {
        throw error.response.data;
      }
      
      // Otherwise, it's likely a client-side error
      throw error;
    }
  }

  /**
   * Check if the API server is running
   * 
   * @returns {Promise<boolean>} - Whether the API server is available
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      console.error('API server health check failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;