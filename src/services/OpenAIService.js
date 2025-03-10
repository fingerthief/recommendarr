import credentialsService from './CredentialsService';

class OpenAIService {
  constructor() {
    this.apiKey = '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-3.5-turbo';
    this.maxTokens = 4000;
    this.temperature = 0.8;
    this.useSampledLibrary = false;
    this.sampleSize = 20;
    this.useStructuredOutput = true; // Default to using structured output
    
    // Ensure the chat completions endpoint
    this.apiUrl = this.getCompletionsUrl();
    
    // Initialize conversation history for maintaining context
    this.tvConversation = [];
    this.movieConversation = [];
    
    // Load credentials when instantiated
    this.loadCredentials();
    
    // Try to get model from localStorage if it exists
    this.loadModelFromLocalStorage();
  }
  
  /**
   * Reset conversation history when switching between TV and movie modes
   * Ensures fresh recommendations without context contamination
   */
  resetConversation() {
    console.log('Resetting conversation history');
    this.tvConversation = [];
    this.movieConversation = [];
  }
  
  /**
   * Load credentials and settings from server-side storage
   * @param {number} retries - Number of retries if loading fails (default: 1)
   * @param {number} delay - Delay between retries in ms (default: 1000)
   * @returns {Promise<boolean>} - Whether credentials were successfully loaded
   */
  async loadCredentials(retries = 1, delay = 1000) {
    try {
      console.log('Loading OpenAI credentials from server...');
      const credentials = await credentialsService.getCredentials('openai');
      
      if (credentials) {
        console.log('Received OpenAI credentials from server');
        this.apiKey = credentials.apiKey || '';
        if (credentials.apiUrl) this.baseUrl = credentials.apiUrl;
        if (credentials.model) this.model = credentials.model;
        if (credentials.maxTokens) this.maxTokens = parseInt(credentials.maxTokens);
        if (credentials.temperature) this.temperature = parseFloat(credentials.temperature);
        if (credentials.useSampledLibrary !== undefined) this.useSampledLibrary = credentials.useSampledLibrary === true;
        if (credentials.sampleSize) this.sampleSize = parseInt(credentials.sampleSize);
        if (credentials.useStructuredOutput !== undefined) this.useStructuredOutput = credentials.useStructuredOutput === true;
        
        // Update API URL if baseUrl changed
        this.apiUrl = this.getCompletionsUrl();
        return true;
      } else {
        console.log('No OpenAI credentials found on server');
        return false;
      }
    } catch (error) {
      console.error('Error loading OpenAI credentials:', error);
      
      // Retry with delay if we have retries left
      if (retries > 0) {
        console.log(`Retrying OpenAI credentials load in ${delay}ms (${retries} ${retries === 1 ? 'retry' : 'retries'} left)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.loadCredentials(retries - 1, delay);
      }
      
      return false;
    }
  }
  
  /**
   * Load the model from localStorage if it exists
   * Falls back to the model stored in credentials if localStorage model doesn't exist
   */
  loadModelFromLocalStorage() {
    const localStorageModel = localStorage.getItem('openaiModel');
    if (localStorageModel) {
      this.model = localStorageModel;
    }
  }

  /**
   * Get the chat completions URL based on the base URL
   * @returns {string} - The full URL for chat completions
   */
  getCompletionsUrl() {
    // Normalize the base URL by removing trailing slashes
    const baseUrl = this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : '';
    return `${baseUrl}/chat/completions`;
  }
  
  /**
   * Get the models URL based on the base URL
   * @returns {string} - The full URL for models endpoint
   */
  getModelsUrl() {
    // Normalize the base URL by removing trailing slashes
    const baseUrl = this.baseUrl ? this.baseUrl.replace(/\/+$/, '') : '';
    return `${baseUrl}/models`;
  }
  
  /**
   * Fetch available models from the API
   * @returns {Promise<Array>} - List of available models
   */
  async fetchModels() {
    // Only validate basic configuration, not API key
    if (!this.baseUrl) {
      throw new Error('OpenAI service is not configured. Please set API URL.');
    }
    
    // Only validate API key when using official OpenAI API
    if (this.baseUrl.startsWith('https://api.openai') && (!this.apiKey || this.apiKey.trim() === '')) {
      throw new Error('API key cannot be empty when using OpenAI API. Please provide a valid API key.');
    }
    
    // Prepare headers based on the API endpoint
    const headers = {};
    
    // Set appropriate authentication headers based on the API
    if (this.baseUrl === 'https://api.anthropic.com/v1') {
      if (this.apiKey && this.apiKey.trim() !== '') {
        headers['x-api-key'] = this.apiKey;
        headers['anthropic-dangerous-direct-browser-access'] = 'true';
        headers['anthropic-version'] = '2023-06-01';
        console.log('Using Anthropic headers for models request');
      } else {
        console.log('No API key provided for Anthropic API request');
      }
    } else {
      // Only add Authorization header if apiKey is present and not empty
      if (this.apiKey && this.apiKey.trim() !== '') {
        // Ensure the authorization header is properly formatted for OpenAI API
        // Always include Bearer prefix and ensure no extra whitespace
        // Try adjusting header case - some proxies might be case-sensitive
        headers['authorization'] = `Bearer ${this.apiKey.trim()}`; // lowercase header key
        console.log('Using OpenAI headers for models request');
        console.log('Authorization header format:', headers['authorization'].substring(0, 15) + '...');
      } else {
        console.log('No API key provided, skipping Authorization header');
      }
    }
    
    // Add content type header - lowercase for consistency
    headers['content-type'] = 'application/json';
    
    const modelsUrl = this.getModelsUrl();
    console.log(`Fetching models from: ${modelsUrl}`);
    
    try {
      // Always try to use the proxy first, then fall back to direct request if proxy fails
      const axios = (await import('axios')).default;
      const apiService = (await import('./ApiService')).default;
      
      let response;
      
      try {
        // Try using the proxy service first for all requests
        console.log('Attempting to use proxy service for models request');
        response = await apiService.proxyRequest({
          url: modelsUrl,
          method: 'GET',
          headers: headers
        });
      } catch (proxyError) {
        // If proxy fails, fallback to direct request
        console.log('Proxy request failed, falling back to direct request:', proxyError.message);
        response = await axios({
          url: modelsUrl,
          method: 'GET',
          headers: headers
        });
      }
      
      console.log(`Models response status: ${response.status}`);
      
      // Check if the request was successful
      if (response && response.status >= 200 && response.status < 300 && response.data) {
        if (response.data.data) {
          console.log(`Successfully retrieved ${response.data.data.length} models`);
          return response.data.data;
        } else {
          console.warn('Response successful but missing data.data property:', response.data);
        }
      }
      
      throw new Error('Failed to fetch models: Invalid response format');
    } catch (error) {
      console.error('Error fetching models:', error);
      
      // Handle specific known error patterns
      if (error.error?.message?.includes('Incorrect API key provided') || 
          (error.data?.error?.message && error.data.error.message.includes('Incorrect API key provided'))) {
        throw new Error('Invalid API key. Please check your API key and try again.');
      }
      
      throw error;
    }
  }

  /**
   * Configure the OpenAI service with full parameters
   * @param {string} apiKey - Your API key
   * @param {string} model - The model to use
   * @param {string} baseUrl - The base API URL
   * @param {number} maxTokens - Maximum tokens for completion
   * @param {number} temperature - Temperature for randomness
   * @param {boolean} useSampledLibrary - Whether to use sampled library for recommendations
   * @param {number} sampleSize - Sample size to use when sampling the library
   * @param {boolean} useStructuredOutput - Whether to use structured output in API requests
   */
  async configure(apiKey, model = 'gpt-3.5-turbo', baseUrl = null, maxTokens = null, temperature = null, useSampledLibrary = null, sampleSize = null, useStructuredOutput = null) {
    // Trim the API key to remove any accidental whitespace
    this.apiKey = apiKey ? apiKey.trim() : '';
    
    if (model) {
      this.model = model;
      // When model is updated, also store it in localStorage for easy access
      localStorage.setItem('openaiModel', model);
    }
    
    if (baseUrl) {
      // Normalize the base URL by removing trailing slashes
      this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
      this.apiUrl = this.getCompletionsUrl();
    }
    
    if (maxTokens !== null) {
      this.maxTokens = maxTokens;
    }
    
    if (temperature !== null) {
      this.temperature = temperature;
    }
    
    if (useSampledLibrary !== null) {
      this.useSampledLibrary = useSampledLibrary;
    }
    
    if (sampleSize !== null) {
      this.sampleSize = sampleSize;
    }
    
    if (useStructuredOutput !== null) {
      this.useStructuredOutput = useStructuredOutput;
    }
    
    // Store credentials server-side (including model selection as backup)
    await credentialsService.storeCredentials('openai', {
      apiKey: this.apiKey,
      apiUrl: this.baseUrl,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      useSampledLibrary: this.useSampledLibrary,
      sampleSize: this.sampleSize,
      useStructuredOutput: this.useStructuredOutput
    });
  }

  /**
   * Check if the service is configured properly
   * @returns {boolean} - Whether the service is configured
   */
  isConfigured() {
    // For a properly configured service, we need:
    // 1. A base URL for the API endpoint
    // 2. A selected model
    // 3. For official OpenAI API, we need an API key that's not empty
    
    const hasBasicConfig = this.baseUrl !== '' && this.model !== '';
    
    // If it's specifically the official OpenAI API URL, we must have an API key
    if (this.baseUrl.startsWith('https://api.openai')) {
      return hasBasicConfig && this.apiKey && this.apiKey.trim() !== '';
    }
    
    // For other services (including self-hosted/local models), the API key might be optional
    return hasBasicConfig;
  }

  /**
   * Get show recommendations based on current library
   * @param {Array} series - List of TV shows from Sonarr
   * @param {number} [count=5] - Number of recommendations to generate
   * @param {string} [genre=''] - Optional genre preference
   * @param {Array} [previousRecommendations=[]] - List of shows to exclude from recommendations
   * @param {Array} [likedRecommendations=[]] - List of shows the user has liked
   * @param {Array} [dislikedRecommendations=[]] - List of shows the user has disliked
   * @param {Array} [recentlyWatchedShows=[]] - List of recently watched shows from Plex
   * @param {boolean} [plexOnlyMode=false] - Whether to use only Plex history for recommendations
   * @param {string} [customVibe=''] - Optional custom vibe/mood for recommendations
   * @param {string} [language=''] - Optional language preference for recommendations
   * @returns {Promise<Array>} - List of recommended TV shows
   */
  async getRecommendations(series, count = 5, genre = '', previousRecommendations = [], likedRecommendations = [], dislikedRecommendations = [], recentlyWatchedShows = [], plexOnlyMode = false, customVibe = '', language = '') {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }

    try {
      // Only initialize conversation history if it doesn't exist yet
      if (this.tvConversation.length === 0) {
      
      // Determine if we should use only Plex history or include the library
      let sourceText;
      let primarySource = [];
      let libraryTitles = '';
      
      if (plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        // Only use the Plex watch history
        sourceText = "my Plex watch history";
        primarySource = recentlyWatchedShows.map(show => show.title);
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (series && series.length > 0) {
          const sonarrTitles = series.map(show => show.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...sonarrTitles])];
        }
      } else {
        // Use the Sonarr library as the main library
        sourceText = "my TV show library";
        const sonarrTitles = series.map(show => show.title);
        primarySource = [...sonarrTitles];
        
        // We don't add liked recommendations to the primary source anymore,
        // as they will be filtered later. This ensures liked items won't be
        // recommended again, even if they're not part of the actual library.
      }
      
      // Create combined exclusion list (everything that shouldn't be recommended)
      // We're not adding the library titles to the exclusion list to save tokens
      // For the sampled approach, we're betting on the AI being varied enough to avoid extreme duplication.
      
      // Determine if we're using the full library or sampled approach
      if (this.useSampledLibrary) {
        // Use a sampled approach for efficiency
        const sampleShows = this.getSampleItems(primarySource, this.sampleSize);
        libraryTitles = sampleShows.join(', ');
      } else {
        // Use the full library approach
        libraryTitles = primarySource.join(', ');
      }
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);

      // Base prompt
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} high-quality shows I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending shows in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Try to match this specific vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` Please ONLY recommend TV shows in ${language} language.`;
      }
      
      // Add instructions for diverse, high-quality recommendations focusing on the "vibe" and feel
      userPrompt += ` When selecting recommendations, prioritize understanding the emotional resonance and aesthetic qualities of my library:

1. AESTHETIC & TONAL QUALITIES:
   - Consider the overall mood, atmosphere, and emotional experience
   - Look for shows with similar pacing, visual style, and thematic resonance
   - Capture the feeling and vibe rather than just statistical similarity

2. CREATIVE VISION:
   - Recommend shows with distinctive directorial styles and creative approaches
   - Focus on storytelling methods that might appeal based on my library
   - Consider writing quality, character development, and thematic depth

3. CULTURAL CONTEXT:
   - Identify shows with cultural significance that match my interests
   - Consider shows that inspired or were inspired by my favorites
   - Include both acclaimed classics and overlooked gems

Prioritize shows that:
- Have a similar emotional resonance or "feel" to my current library
- Offer something distinctive while matching my apparent taste
- Include both popular standouts and lesser-known hidden gems
- Are complete or ongoing with consistent quality, avoiding shows canceled early`;
      
      // Add library information with appropriate context based on mode
      if (this.useSampledLibrary) {
        userPrompt += `\n\nHere are some examples from my library (${primarySource.length} shows total) to understand my taste: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any shows that I already have in my library.`;
      } else {
        userPrompt += `\n\nMy current shows: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any shows from the list above as I already have them in my library.`;
      }
      
      // Add previous recommendations to avoid repeating them
      if (previousRecommendations.length > 0) {
        userPrompt += ` You also MUST NOT recommend these previously suggested shows: ${previousRecommendations.join(', ')}`;
      }
      
      // Add liked shows as explicit examples to not recommend again
      if (likedRecommendations.length > 0) {
        userPrompt += `\n\nI like these shows, but DO NOT recommend them again as I've already seen them: ${likedRecommendations.join(', ')}`;
      }
      
      // Add disliked shows as explicit negative examples
      if (dislikedRecommendations.length > 0) {
        userPrompt += `\n\nI specifically dislike these shows, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
      }
      
      // Add recently watched shows from Plex if available and not already using them as the primary source
      if (!plexOnlyMode && recentlyWatchedShows && recentlyWatchedShows.length > 0) {
        const recentTitles = recentlyWatchedShows.map(show => show.title).join(', ');
        userPrompt += `\n\nI've recently watched these shows, so please consider them for better recommendations: ${recentTitles}`;
      }
      
      userPrompt += `\n\nABSOLUTELY CRITICAL: Before suggesting ANY show, you MUST verify it's not something I already have or dislike.`;
      
      // Include detailed formatting instructions if structured output is disabled
      if (!this.useStructuredOutput) {
        userPrompt += `

⚠️ FORMATTING REQUIREMENTS: YOU MUST FOLLOW THIS EXACT FORMAT WITHOUT ANY DEVIATION ⚠️

The format below is MANDATORY. Any deviation will COMPLETELY BREAK the application:

1. [Show Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current shows] 
Recommendarr Rating: [score]% - [brief qualitative assessment]
Available on: [streaming service]

2. [Next Show Title]:
...and so on.

⚠️ CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY ⚠️
- Follow this output format with ABSOLUTE PRECISION 
- Do NOT add ANY extra text, headings, introductions, or conclusions
- Each section title (Description, Why you might like it, Recommendarr Rating, Available on) MUST appear EXACTLY ONCE per show
- Do NOT use Markdown formatting like bold or italics
- Do NOT deviate from the format structure in ANY way
- NEVER recommend any show in my library, liked shows list, or any exclusion list
- Begin IMMEDIATELY with "1. [Show Title]:" with NO preamble`;
      }
      
      userPrompt += `

For the Recommendarr Rating in your recommendations, conduct a thorough analysis using multiple methodologies:
- Statistical analysis: Privately calculate averages, distributions, and trends from rating sources like IMDB, Rotten Tomatoes, TVDB, Metacritic
- Quantitative analysis: Evaluate objective metrics like episode count, seasons completed, awards won, and viewership numbers
- Qualitative analysis: Assess writing quality, acting performances, character development, and production values 
- Comparative analysis: Consider how it ranks among peers in the same genre and time period
- Cultural impact: Weigh its influence, longevity, and relevance to current audiences

After this analysis, provide:
- A percentage score (e.g., "85%")
- A brief assessment that synthesizes these analytical approaches to explain strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

CRITICAL REQUIREMENTS:
- DO NOT include any introductions or conclusions in your response
- NEVER recommend any show in my library, liked shows list, or any exclusion list
- For each show, provide a title, description, explanation of why I might like it, a rating, and streaming availability`;

      // Initialize conversation with system message with appropriate formatting based on structured output setting
      const systemContent = this.useStructuredOutput
        ? "You are a TV show recommendation assistant focused on matching the vibe and feel of shows. You will provide recommendations in a structured format. Rules:\n\n1. NEVER recommend shows from the user's library or exclusion lists - this is absolutely critical\n2. Always double-check recommendations are not in the user's library, liked shows, disliked shows or any previously recommended shows\n3. Recommend shows matching the emotional and stylistic feel of the user's library\n4. NO extra text, introductions or conclusions\n5. For each show, provide a title, description, reasoning why they might like it, a rating percentage with brief assessment, and streaming availability"
        : "You are a TV show recommendation assistant focused on matching the vibe and feel of shows. Follow the EXACT output format specified - this is critical for the application to function correctly. Rules:\n\n1. NEVER recommend shows from the user's library or exclusion lists - this is absolutely critical\n2. Always double-check recommendations are not in the user's library, liked shows, disliked shows or any previously recommended shows\n3. Recommend shows matching the emotional and stylistic feel of the user's library\n4. NO Markdown formatting\n5. NO extra text, introductions or conclusions\n6. Format recommendations EXACTLY as instructed\n7. Begin IMMEDIATELY with '1. [Show Title]:' with NO preamble\n8. Use ONLY these section titles: 'Description:', 'Why you might like it:', 'Recommendarr Rating:', and 'Available on:'";
      
      this.tvConversation = [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
      } else {
        // If conversation exists, just add a new request message
        this.tvConversation.push({
          role: "user",
          content: `Based on our previous conversation, please recommend ${count} new TV shows I might enjoy. ${genre ? `Focus on ${genre} genres.` : ''} ${customVibe ? `Try to match this vibe: "${customVibe}"` : ''} Use the same format as before.`
        });
      }
      
      // Get initial recommendations using the conversation
      const recommendations = await this.getFormattedRecommendationsWithConversation(this.tvConversation);
      
      // Perform final verification to ensure no existing/liked content is returned
      // This is a critical second check even though we instructed the AI to not include these
      console.log("Verifying TV recommendations don't include library, liked, disliked, or previous items");
      return this.verifyRecommendations(
        recommendations,
        series,                   // Library items
        likedRecommendations,     // Liked items
        dislikedRecommendations,  // Disliked items
        previousRecommendations   // Previous recommendations
      );
    } catch (error) {
      console.error('Error getting TV show recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Get movie recommendations based on current library
   * @param {Array} movies - List of movies from Radarr
   * @param {number} [count=5] - Number of recommendations to generate
   * @param {string} [genre=''] - Optional genre preference
   * @param {Array} [previousRecommendations=[]] - List of movies to exclude from recommendations
   * @param {Array} [likedRecommendations=[]] - List of movies the user has liked
   * @param {Array} [dislikedRecommendations=[]] - List of movies the user has disliked
   * @param {Array} [recentlyWatchedMovies=[]] - List of recently watched movies from Plex/Jellyfin/Tautulli/Trakt
   * @param {boolean} [plexOnlyMode=false] - Whether to use only Plex history for recommendations
   * @param {string} [customVibe=''] - Optional custom vibe/mood for recommendations
   * @param {string} [language=''] - Optional language preference for recommendations
   * @returns {Promise<Array>} - List of recommended movies
   */
  async getMovieRecommendations(movies, count = 5, genre = '', previousRecommendations = [], likedRecommendations = [], dislikedRecommendations = [], recentlyWatchedMovies = [], plexOnlyMode = false, customVibe = '', language = '') {
    console.log("OpenAIService: getMovieRecommendations called", {
      moviesCount: movies ? movies.length : 0,
      count,
      genre,
      previousRecsCount: previousRecommendations ? previousRecommendations.length : 0,
      likedRecsCount: likedRecommendations ? likedRecommendations.length : 0,
      dislikedRecsCount: dislikedRecommendations ? dislikedRecommendations.length : 0,
      recentlyWatchedCount: recentlyWatchedMovies ? recentlyWatchedMovies.length : 0,
      watchHistoryMode: plexOnlyMode ? 'Plex Only' : 'Combined Sources',
      customVibe,
      language
    });
    
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }

    try {
      // Only initialize conversation history if it doesn't exist yet
      if (this.movieConversation.length === 0) {
        console.log("Initializing new movie conversation");
      
      // Determine if we should use only Plex history or include the library
      let sourceText;
      let primarySource = [];
      let libraryTitles = '';
      
      if (plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
        // Only use the Plex watch history
        sourceText = "my Plex watch history";
        primarySource = recentlyWatchedMovies.map(movie => movie.title);
        
        // Add library titles to exclusions to prevent recommending what user already has
        if (movies && movies.length > 0) {
          const radarrTitles = movies.map(movie => movie.title);
          previousRecommendations = [...new Set([...previousRecommendations, ...radarrTitles])];
        }
      } else {
        // Use the Radarr library as the main library
        sourceText = "my movie library";
        const radarrTitles = movies.map(movie => movie.title);
        primarySource = [...radarrTitles];
        
        // We don't add liked recommendations to the primary source anymore,
        // as they will be filtered later. This ensures liked items won't be
        // recommended again, even if they're not part of the actual library.
      }
      
      // Create combined exclusion list (everything that shouldn't be recommended)
      // We're not adding the library titles to the exclusion list to save tokens
      // For the sampled approach, we're betting on the AI being smart enough to avoid recommending library items
      // even without an explicit exclusion list
      
      // Determine if we're using the full library or sampled approach
      if (this.useSampledLibrary) {
        // Use a sampled approach for efficiency
        const sampleMovies = this.getSampleItems(primarySource, this.sampleSize);
        libraryTitles = sampleMovies.join(', ');
      } else {
        // Use the full library approach
        libraryTitles = primarySource.join(', ');
      }
      
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      // Base prompt
      let userPrompt = `Based on ${sourceText}, recommend ${recommendationCount} high-quality movies I might enjoy. Be brief and direct - no more than 2-3 sentences per section.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus specifically on recommending movies in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Try to match this specific vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` Please ONLY recommend movies in ${language} language.`;
      }
      
      // Add instructions for diverse, high-quality recommendations focusing on the "vibe" and feel
      userPrompt += ` When selecting recommendations, prioritize understanding the emotional resonance and cinematic qualities of my library:

1. AESTHETIC & EMOTIONAL QUALITIES:
   - Consider the overall mood, tone, and emotional experience
   - Look for films with similar visual language, pacing, and atmosphere
   - Capture the feeling and vibe rather than just statistical similarity

2. DIRECTORIAL VISION:
   - Recommend films with distinctive styles and creative approaches
   - Focus on storytelling methods and cinematic techniques that align with my taste
   - Consider both visually striking films and character-driven narratives

3. CULTURAL RESONANCE:
   - Identify films that occupy a similar cultural space to my favorites
   - Consider influential works that connect thematically with my library
   - Include both widely acclaimed films and overlooked gems

Prioritize movies that:
- Evoke similar emotional responses to films in my current library
- Offer something distinctive while matching my apparent taste preferences
- Include both celebrated classics and lesser-known discoveries
- Come from directors, writers, or eras that align with my viewing patterns`;
      
      // Add library information with appropriate context based on mode
      if (this.useSampledLibrary) {
        userPrompt += `\n\nHere are some examples from my library (${primarySource.length} movies total) to understand my taste: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any movies that I already have in my library.`;
      } else {
        userPrompt += `\n\nMy current movies: ${libraryTitles}`;
        userPrompt += `\n\nCRITICAL INSTRUCTION: You MUST NOT recommend any movies from the list above as I already have them in my library.`;
      }
      
      // Add previous recommendations to avoid repeating them
      if (previousRecommendations.length > 0) {
        userPrompt += ` You also MUST NOT recommend these previously suggested movies: ${previousRecommendations.join(', ')}`;
      }
      
      // Add liked movies as explicit examples to not recommend again
      if (likedRecommendations.length > 0) {
        userPrompt += `\n\nI like these movies, but DO NOT recommend them again as I've already seen them: ${likedRecommendations.join(', ')}`;
      }
      
      // Add disliked movies as explicit negative examples
      if (dislikedRecommendations.length > 0) {
        userPrompt += `\n\nI specifically dislike these movies, so don't recommend anything too similar: ${dislikedRecommendations.join(', ')}`;
      }
      
      // Add recently watched movies from various services if available and not already using them as the primary source
      if (!plexOnlyMode && recentlyWatchedMovies && recentlyWatchedMovies.length > 0) {
        // Debug watch history data structure
        console.log("Watch history data structures sample:", 
          recentlyWatchedMovies.slice(0, 2).map(movie => typeof movie === 'object' ? 
            Object.keys(movie) : typeof movie));
        
        const recentTitles = recentlyWatchedMovies.map(movie => {
          // Handle different formats from different services (Plex, Jellyfin, Tautulli, Trakt)
          if (typeof movie === 'string') return movie;
          return movie.title || movie.name || (typeof movie === 'object' ? JSON.stringify(movie) : movie);
        }).join(', ');
        
        userPrompt += `\n\nI've recently watched these movies, so please consider them for better recommendations: ${recentTitles}`;
      }
      
      userPrompt += `\n\nABSOLUTELY CRITICAL: Before suggesting ANY movie, you MUST verify it's not something I already have or dislike.`;
      
      // Include detailed formatting instructions if structured output is disabled
      if (!this.useStructuredOutput) {
        userPrompt += `

⚠️ FORMATTING REQUIREMENTS: YOU MUST FOLLOW THIS EXACT FORMAT WITHOUT ANY DEVIATION ⚠️

The format below is MANDATORY. Any deviation will COMPLETELY BREAK the application:

1. [Movie Title]: 
Description: [brief description] 
Why you might like it: [short reason based on my current movies] 
Recommendarr Rating: [score]% - [brief qualitative assessment]
Available on: [streaming service]

2. [Next Movie Title]:
...and so on.

⚠️ CRITICAL FORMAT REQUIREMENTS - FOLLOW EXACTLY ⚠️
- Follow this output format with ABSOLUTE PRECISION 
- Do NOT add ANY extra text, headings, introductions, or conclusions
- Each section title (Description, Why you might like it, Recommendarr Rating, Available on) MUST appear EXACTLY ONCE per movie
- Do NOT use Markdown formatting like bold or italics
- Do NOT deviate from the format structure in ANY way
- NEVER recommend any movie in my library, liked movies list, or any exclusion list
- Begin IMMEDIATELY with "1. [Movie Title]:" with NO preamble`;
      }
      
      userPrompt += `

For the Recommendarr Rating in your recommendations, conduct a thorough analysis using multiple methodologies:
- Statistical analysis: Privately calculate averages, distributions, and trends from rating sources like IMDB, Rotten Tomatoes, Metacritic
- Quantitative analysis: Evaluate objective metrics like box office performance, budget-to-return ratio, and awards received
- Qualitative analysis: Assess cinematic elements including direction, screenplay, performances, and technical aspects
- Comparative analysis: Consider how it ranks among peers in the same genre and time period  
- Cultural impact: Weigh its influence, longevity, and relevance to current audiences

After this analysis, provide:
- A percentage score (e.g., "85%")
- A brief assessment that synthesizes these analytical approaches to explain strengths/weaknesses
DO NOT mention or cite any specific external rating sources or scores in your explanation.

CRITICAL REQUIREMENTS:
- DO NOT include any introductions or conclusions in your response
- NEVER recommend any movie in my library, liked movies list, or any exclusion list
- For each movie, provide a title, description, explanation of why I might like it, a rating, and streaming availability`;

      // Initialize conversation with system message with appropriate formatting based on structured output setting
      const systemContent = this.useStructuredOutput
        ? "You are a movie recommendation assistant focused on matching the emotional and cinematic qualities of films. You will provide recommendations in a structured format. Rules:\n\n1. NEVER recommend movies from the user's library or exclusion lists - this is absolutely critical\n2. Always double-check recommendations are not in the user's library, liked movies, disliked movies or any previously recommended movies\n3. Recommend movies matching the mood, style, and emotional resonance of the user's library\n4. NO extra text, introductions or conclusions\n5. For each movie, provide a title, description, reasoning why they might like it, a rating percentage with brief assessment, and streaming availability"
        : "You are a movie recommendation assistant focused on matching the emotional and cinematic qualities of films. Follow the EXACT output format specified - this is critical for the application to function correctly. Rules:\n\n1. NEVER recommend movies from the user's library or exclusion lists - this is absolutely critical\n2. Always double-check recommendations are not in the user's library, liked movies, disliked movies or any previously recommended movies\n3. Recommend movies matching the mood, style, and emotional resonance of the user's library\n4. NO Markdown formatting\n5. NO extra text, introductions or conclusions\n6. Format recommendations EXACTLY as instructed\n7. Begin IMMEDIATELY with '1. [Movie Title]:' with NO preamble\n8. Use ONLY these section titles: 'Description:', 'Why you might like it:', 'Recommendarr Rating:', and 'Available on:'";
      
      this.movieConversation = [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: userPrompt
        }
      ];
      } else {
        // If conversation exists, just add a new request message
        this.movieConversation.push({
          role: "user",
          content: `Based on our previous conversation, please recommend ${count} new movies I might enjoy. ${genre ? `Focus on ${genre} genres.` : ''} ${customVibe ? `Try to match this vibe: "${customVibe}"` : ''} Use the same format as before.`
        });
      }
      
      // Get initial recommendations using the conversation
      console.log("Getting formatted movie recommendations with conversation");
      console.log("Movie conversation length:", this.movieConversation.length);
      
      const recommendations = await this.getFormattedRecommendationsWithConversation(this.movieConversation);
      console.log("Raw recommendations from API:", recommendations);
      
      // Perform final verification to ensure no existing/liked content is returned
      // This is a critical second check even though we instructed the AI to not include these
      console.log("Verifying movie recommendations don't include library, liked, disliked, or previous items");
      const verifiedRecommendations = this.verifyRecommendations(
        recommendations,
        movies,                   // Library items
        likedRecommendations,     // Liked items
        dislikedRecommendations,  // Disliked items
        previousRecommendations   // Previous recommendations
      );
      
      console.log("Verified recommendations:", verifiedRecommendations);
      return verifiedRecommendations;
    } catch (error) {
      console.error('Error getting movie recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Get a sample of items from an array
   * @param {Array} items - The array of items to sample from
   * @param {number} count - The number of items to sample
   * @returns {Array} - The sampled items
   */
  getSampleItems(items, count) {
    if (!items || items.length === 0) return [];
    if (items.length <= count) return items;
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return the first 'count' items
    return shuffled.slice(0, count);
  }
  
  /**
   * Get additional TV show recommendations with a conversation-based approach
   * @param {number} count - Number of additional recommendations to generate
   * @param {Array} previousRecommendations - List of shows to exclude from recommendations
   * @param {string} genre - Optional genre preference
   * @param {string} customVibe - Optional custom vibe
   * @param {string} language - Optional language preference
   * @returns {Promise<Array>} - List of additional recommended TV shows
   */
  async getAdditionalTVRecommendations(count, previousRecommendations = [], genre = '', customVibe = '', language = '') {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }

    try {
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      if (this.tvConversation.length === 0) {
        throw new Error('No TV conversation history found. Make initial recommendation request first.');
      }
      
      // Create a simpler prompt for additional recommendations
      let userPrompt = `I need ${recommendationCount} more TV shows that match the emotional and stylistic qualities of my library and your previous recommendations.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus on shows in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Match this vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` ONLY recommend TV shows in ${language} language.`;
      }
      
      // Add previous recommendations to avoid repeating them
      if (previousRecommendations.length > 0) {
        userPrompt += `\n\nDO NOT recommend any of these shows: ${previousRecommendations.join(', ')}`;
      }
      
      userPrompt += `\n\nUse the EXACT same format as before.`;

      // Add the new user message to the existing conversation
      this.tvConversation.push({
        role: "user",
        content: userPrompt
      });
      
      // Get recommendations using the conversation-based method
      const additionalRecs = await this.getFormattedRecommendationsWithConversation(this.tvConversation);
      
      // No series data is available for the verify method in this context, so we have to trust 
      // that the initial filter via the user prompt is sufficient
      // But we can still filter against the provided previousRecommendations
      return this.verifyRecommendations(
        additionalRecs,
        [],                     // No library items in this context
        [],                     // No liked items in this context
        [],                     // No disliked items in this context
        previousRecommendations // Previous recommendations to avoid
      );
    } catch (error) {
      console.error('Error getting additional TV show recommendations:', error);
      throw error;
    }
  }

  /**
   * Get additional movie recommendations with a conversation-based approach
   * @param {number} count - Number of additional recommendations to generate
   * @param {Array} previousRecommendations - List of movies to exclude from recommendations
   * @param {string} genre - Optional genre preference
   * @param {string} customVibe - Optional custom vibe
   * @param {string} language - Optional language preference
   * @returns {Promise<Array>} - List of additional recommended movies
   */
  async getAdditionalMovieRecommendations(count, previousRecommendations = [], genre = '', customVibe = '', language = '') {
    // Try to load credentials again in case they weren't ready during init
    if (!this.isConfigured()) {
      await this.loadCredentials();
      
      if (!this.isConfigured()) {
        throw new Error('OpenAI service is not configured. Please set apiKey.');
      }
    }

    try {
      // Ensure count is within reasonable bounds
      const recommendationCount = Math.min(Math.max(count, 1), 50);
      
      if (this.movieConversation.length === 0) {
        throw new Error('No movie conversation history found. Make initial recommendation request first.');
      }
      
      // Create a simpler prompt for additional movie recommendations
      let userPrompt = `I need ${recommendationCount} more movies that match the emotional and cinematic qualities of my library and your previous recommendations.`;
      
      // Add genre preference if specified
      if (genre) {
        const genreList = genre.includes(',') ? genre : `the ${genre}`;
        userPrompt += ` Focus on movies in ${genreList} genre${genre.includes(',') ? 's' : ''}.`;
      }
      
      // Add custom vibe if specified
      if (customVibe && customVibe.trim()) {
        userPrompt += ` Match this vibe/mood: "${customVibe.trim()}".`;
      }
      
      // Add language preference if specified
      if (language) {
        userPrompt += ` ONLY recommend movies in ${language} language.`;
      }
      
      // Add previous recommendations to avoid repeating them
      if (previousRecommendations.length > 0) {
        userPrompt += `\n\nDO NOT recommend any of these movies: ${previousRecommendations.join(', ')}`;
      }
      
      userPrompt += `\n\nUse the EXACT same format as before.`;

      // Add the new user message to the existing conversation
      this.movieConversation.push({
        role: "user",
        content: userPrompt
      });
      
      // Get recommendations using the conversation-based method
      const additionalRecs = await this.getFormattedRecommendationsWithConversation(this.movieConversation);
      
      // No movies data is available for the verify method in this context, so we have to trust 
      // that the initial filter via the user prompt is sufficient
      // But we can still filter against the provided previousRecommendations
      return this.verifyRecommendations(
        additionalRecs,
        [],                     // No library items in this context
        [],                     // No liked items in this context
        [],                     // No disliked items in this context
        previousRecommendations // Previous recommendations to avoid
      );
    } catch (error) {
      console.error('Error getting additional movie recommendations:', error);
      throw error;
    }
  }

  /**
   * Method to get recommendations using a conversation-based approach
   * @param {Array} conversation - An array of chat messages representing the ongoing conversation
   * @returns {Promise<Array>} - List of formatted recommendations
   */
  async getFormattedRecommendationsWithConversation(conversation) {
    console.log("API URL:", this.apiUrl);
    console.log("Model:", this.model);
    
    try {
      // Check if conversation is getting too large and reset if needed
      // A typical message limit before hitting payload size issues is around 10-15 messages
      const MESSAGE_LIMIT = 12; // Reset after this many messages to prevent payload size issues
      
      // If conversation exceeds the limit, reset it to just the system message + latest user message
      if (conversation.length > MESSAGE_LIMIT) {
        console.log(`Conversation history too large (${conversation.length} messages). Resetting context.`);
        const systemMessage = conversation[0]; // Keep system prompt
        const userMessage = conversation[conversation.length - 1]; // Keep latest user message
        
        // Reset conversation to just system + latest user message
        conversation.splice(0, conversation.length);
        conversation.push(systemMessage, userMessage);
        
        console.log(`Conversation reset to ${conversation.length} messages to avoid payload size limits.`);
      }
      
      // Import the ApiService dynamically to avoid circular dependency
      // eslint-disable-next-line no-unused-vars
      const apiService = (await import('./ApiService')).default;
      
      // Define headers based on the API endpoint
      const headers = {};
      
      // Add authentication header based on the API endpoint
      if (this.baseUrl === 'https://api.anthropic.com/v1') {
        if (this.apiKey && this.apiKey.trim() !== '') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          headers['anthropic-version'] = '2023-06-01';
          console.log('Using Anthropic headers configuration');
        } else {
          console.warn('No API key provided for Anthropic API request');
        }
      } else if (this.apiKey && this.apiKey.trim() !== '') { // Only add Authorization header if apiKey is present and not empty
        headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
        console.log('Using OpenAI Authorization header (Bearer token)');
        console.log('Authorization header format:', headers['Authorization'].substring(0, 15) + '...');
        console.log('API URL:', this.apiUrl);
      } else {
        console.warn('No API key provided, skipping Authorization header');
      }
      
      console.log("Is API configured:", this.isConfigured());
      console.log("Conversation length:", conversation.length);
      console.log("First message role:", conversation[0]?.role);
      console.log("Last message role:", conversation[conversation.length-1]?.role);
      
      headers['Content-Type'] = 'application/json';
      
      // Prepare the base request data
      const requestData = {
        model: this.model,
        messages: conversation,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };
      
      // Add structured output format if enabled
      if (this.useStructuredOutput) {
        console.log('Using structured output format for API request');
        requestData.response_format = {
          type: "json_schema",
          json_schema: {
            name: "media_recommendations",
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      reasoning: { type: "string" },
                      rating: { type: "string" },
                      streaming: { type: "string" }
                    },
                    required: ["title", "description", "reasoning", "rating", "streaming"],
                    additionalProperties: false
                  }
                }
              },
              required: ["recommendations"],
              additionalProperties: false
            },
            strict: true
          }
        };
      } else {
        console.log('Using legacy format for API request (structured output disabled)');
      }
      
      let response;
      const axios = (await import('axios')).default;
      
      // Try using the proxy first, then fall back to direct request if it fails
      try {
        console.log(`Attempting to proxy request to: ${this.apiUrl} with model: ${this.model}`);
        // Try the proxy service first
        response = await apiService.proxyRequest({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      } catch (proxyError) {
        console.log(`Proxy request failed, falling back to direct request: ${proxyError.message}`);
        // If the proxy fails, make a direct API request
        response = await axios({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      }

      // Check if response contains expected data structure
      // Direct axios response has data directly, not in data.data
      if (!response.data || response.data.error) {
        console.error('API Error:', response.data?.error || 'Unknown error');
        throw new Error(response.data?.error || 'The AI API returned an error. Please check your API key and try again.');
      }
      
      if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error('Unexpected API response format:', response.data);
        throw new Error('The AI API returned an unexpected response format. Please check your API key and endpoint configuration.');
      }
      
      // Get the structured JSON response
      const responseContent = response.data.choices[0].message.content;
      console.log("Response content type:", typeof responseContent);
      
      let parsedRecommendations = [];
      
      // Parse the JSON response (if it's a string) or use it directly (if it's already an object)
      try {
        let recommendationsData;
        
        // Handle different response formats
        if (typeof responseContent === 'string') {
          // Log the first part of the content to help debug
          console.log("Response content preview:", responseContent.substring(0, 100));
          
          // Clean the response if needed - some models might return invalid JSON with comments or prefixes
          let cleanedContent = responseContent.trim();
          
          // If response starts with markdown code block indicators, clean them up
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
          } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
          }
          
          // Try to parse the JSON
          try {
            recommendationsData = JSON.parse(cleanedContent);
          } catch (initialParseError) {
            console.warn('Initial JSON parse failed, attempting fallback cleanup:', initialParseError);
            
            // Handle case where content might have strange characters at start
            if (cleanedContent.length > 10) {
              // Try cleaning by finding first { and last }
              const firstBrace = cleanedContent.indexOf('{');
              const lastBrace = cleanedContent.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
                try {
                  const extractedJson = cleanedContent.substring(firstBrace, lastBrace + 1);
                  recommendationsData = JSON.parse(extractedJson);
                  console.log('Successfully parsed JSON after extracting braces');
                } catch (extractError) {
                  throw new Error(`Failed to parse extracted JSON: ${extractError.message}`);
                }
              } else {
                throw new Error('Could not find matching JSON braces in response');
              }
            } else {
              throw initialParseError;
            }
          }
        } else {
          // If it's already an object, use it directly
          recommendationsData = responseContent;
        }
        
        // Extract recommendations from the structured response
        if (recommendationsData && recommendationsData.recommendations) {
          parsedRecommendations = recommendationsData.recommendations.map(rec => ({
            ...rec,
            // Add fullText for backward compatibility
            fullText: `${rec.title}:\nDescription: ${rec.description}\nWhy you might like it: ${rec.reasoning}\nRecommendarr Rating: ${rec.rating}\nAvailable on: ${rec.streaming}`
          }));
        } else {
          console.warn('Response is missing recommendations array:', recommendationsData);
        }
      } catch (parseError) {
        console.error('Error parsing structured response:', parseError);
        console.log('Falling back to legacy parsing for content:', responseContent);
        // Fall back to legacy parsing if JSON parsing fails
        parsedRecommendations = this.parseRecommendations(responseContent);
      }
      
      // Add the assistant's response to the conversation history
      conversation.push({
        role: "assistant",
        content: responseContent
      });
      
      return parsedRecommendations;
    } catch (error) {
      console.error('Error getting recommendations with conversation:', error);
      throw error;
    }
  }
  
  /**
   * Generic method to get recommendations from AI with formatted messages (Legacy method, kept for backward compatibility)
   * @param {Array} messages - Chat messages to send to the AI
   * @returns {Promise<Array>} - List of formatted recommendations
   */
  async getFormattedRecommendations(messages) {
    try {
      // Import dependencies dynamically
      const axios = (await import('axios')).default;
      const apiService = (await import('./ApiService')).default;
      
      // Define headers based on the API endpoint
      const headers = {};
      
      // Add authentication header based on the API endpoint
      if (this.baseUrl === 'https://api.anthropic.com/v1') {
        if (this.apiKey && this.apiKey.trim() !== '') {
          headers['x-api-key'] = this.apiKey;
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
          headers['anthropic-version'] = '2023-06-01';
        } else {
          console.warn('No API key provided for Anthropic API request');
        }
      } else if (this.apiKey && this.apiKey.trim() !== '') { // Only add Authorization header if apiKey is present and not empty
        headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
      } else {
        console.warn('No API key provided, skipping Authorization header');
      }
      
      headers['Content-Type'] = 'application/json';

      // Check if we need to chunk the user prompt to stay under token limits
      const MAX_TOKEN_LIMIT = 4000;
      let response;
      
      // We're only concerned with chunking the user prompt (last message)
      const systemMessage = messages[0];
      let userMessage = messages[1];
      
      // Rough estimate of tokens (4 chars ~= 1 token)
      const estimatedTokens = userMessage.content.length / 4;
      
      if (estimatedTokens > MAX_TOKEN_LIMIT) {
        // We need to split into chunks
        response = await this.sendChunkedMessages(systemMessage, userMessage, headers);
      } else {
        // We can send in a single request
        // Prepare the base request data
        const requestData = {
          model: this.model,
          messages: messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens
        };
        
        // Add structured output format if enabled
        if (this.useStructuredOutput) {
          console.log('Using structured output format for API request');
          requestData.response_format = {
            type: "json_schema",
            json_schema: {
              name: "media_recommendations",
              schema: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        reasoning: { type: "string" },
                        rating: { type: "string" },
                        streaming: { type: "string" }
                      },
                      required: ["title", "description", "reasoning", "rating", "streaming"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              },
              strict: true
            }
          };
        } else {
          console.log('Using legacy format for API request (structured output disabled)');
        }
        
        // Try proxy first, then fall back to direct request
        try {
          console.log(`Attempting to proxy request to: ${this.apiUrl}`);
          response = await apiService.proxyRequest({
            url: this.apiUrl,
            method: 'POST',
            data: requestData,
            headers
          });
        } catch (proxyError) {
          console.log(`Proxy request failed, falling back to direct request: ${proxyError.message}`);
          response = await axios({
            url: this.apiUrl,
            method: 'POST',
            data: requestData,
            headers
          });
        }
      }

      // Check if response contains expected data structure
      if (!response.data || response.data.error) {
        console.error('API Error:', response.data?.error || 'Unknown error');
        throw new Error(response.data?.error || 'The AI API returned an error. Please check your API key and try again.');
      }
      
      if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        console.error('Unexpected API response format:', response.data);
        throw new Error('The API returned an unexpected response format. Please check your API key and endpoint configuration.');
      }
      
      // Get the structured JSON response
      const responseContent = response.data.choices[0].message.content;
      console.log("Response content type:", typeof responseContent);
      
      let parsedRecommendations = [];
      
      // Parse the JSON response (if it's a string) or use it directly (if it's already an object)
      try {
        let recommendationsData;
        
        // Handle different response formats
        if (typeof responseContent === 'string') {
          // Log the first part of the content to help debug
          console.log("Response content preview:", responseContent.substring(0, 100));
          
          // Clean the response if needed - some models might return invalid JSON with comments or prefixes
          let cleanedContent = responseContent.trim();
          
          // If response starts with markdown code block indicators, clean them up
          if (cleanedContent.startsWith('```json')) {
            cleanedContent = cleanedContent.replace(/^```json\n/, '').replace(/\n```$/, '');
          } else if (cleanedContent.startsWith('```')) {
            cleanedContent = cleanedContent.replace(/^```\n/, '').replace(/\n```$/, '');
          }
          
          // Try to parse the JSON
          try {
            recommendationsData = JSON.parse(cleanedContent);
          } catch (initialParseError) {
            console.warn('Initial JSON parse failed, attempting fallback cleanup:', initialParseError);
            
            // Handle case where content might have strange characters at start
            if (cleanedContent.length > 10) {
              // Try cleaning by finding first { and last }
              const firstBrace = cleanedContent.indexOf('{');
              const lastBrace = cleanedContent.lastIndexOf('}');
              
              if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
                try {
                  const extractedJson = cleanedContent.substring(firstBrace, lastBrace + 1);
                  recommendationsData = JSON.parse(extractedJson);
                  console.log('Successfully parsed JSON after extracting braces');
                } catch (extractError) {
                  throw new Error(`Failed to parse extracted JSON: ${extractError.message}`);
                }
              } else {
                throw new Error('Could not find matching JSON braces in response');
              }
            } else {
              throw initialParseError;
            }
          }
        } else {
          // If it's already an object, use it directly
          recommendationsData = responseContent;
        }
        
        // Extract recommendations from the structured response
        if (recommendationsData && recommendationsData.recommendations) {
          parsedRecommendations = recommendationsData.recommendations.map(rec => ({
            ...rec,
            // Add fullText for backward compatibility
            fullText: `${rec.title}:\nDescription: ${rec.description}\nWhy you might like it: ${rec.reasoning}\nRecommendarr Rating: ${rec.rating}\nAvailable on: ${rec.streaming}`
          }));
        } else {
          console.warn('Response is missing recommendations array:', recommendationsData);
        }
      } catch (parseError) {
        console.error('Error parsing structured response:', parseError);
        console.log('Falling back to legacy parsing for content:', responseContent);
        // Fall back to legacy parsing if JSON parsing fails
        parsedRecommendations = this.parseRecommendations(responseContent);
      }
      
      // We'll add a verification check later when we have context about existing items
      return parsedRecommendations;
    } catch (error) {
      console.error('Error getting recommendations from AI:', error);
      throw error;
    }
  }
  
  /**
   * Send chunked messages to the API to stay under token limits
   * @param {Object} systemMessage - The system message
   * @param {Object} userMessage - The user message to chunk
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} - The API response
   */
  async sendChunkedMessages(systemMessage, userMessage, headers) {
    // Import dependencies dynamically
    const axios = (await import('axios')).default;
    const apiService = (await import('./ApiService')).default;
    
    // Chunk size in characters (roughly 3000 tokens)
    const CHUNK_SIZE = 12000;
    
    // Split the user content into chunks
    const userContent = userMessage.content;
    const chunks = [];
    
    // Break the content into chunks
    for (let i = 0; i < userContent.length; i += CHUNK_SIZE) {
      chunks.push(userContent.slice(i, i + CHUNK_SIZE));
    }
    
    // Initialize conversation with system message
    let conversationMessages = [systemMessage];
    
    // Send all but the final chunk as separate messages
    for (let i = 0; i < chunks.length - 1; i++) {
      conversationMessages.push({
        role: "user",
        content: `Part ${i+1}/${chunks.length} of my request: ${chunks[i]}\n\nThis is part of a multi-part message. Please wait for all parts before responding.`
      });
      
      const requestData = {
        model: this.model,
        messages: conversationMessages,
        temperature: this.temperature,
        max_tokens: 50  // Small token limit since we just need acknowledgment
      };
      
      // Try to send via proxy first, then fall back to direct request
      try {
        console.log(`Attempting to proxy chunk ${i+1}/${chunks.length} to: ${this.apiUrl}`);
        await apiService.proxyRequest({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      } catch (proxyError) {
        console.log(`Proxy request for chunk ${i+1}/${chunks.length} failed, using direct request: ${proxyError.message}`);
        await axios({
          url: this.apiUrl,
          method: 'POST',
          data: requestData,
          headers
        });
      }
      
      // Add expected assistant acknowledgment to maintain conversation context
      conversationMessages.push({
        role: "assistant",
        content: "I'll wait for the complete message before responding."
      });
    }
    
    // Send the final chunk and request full response
    conversationMessages.push({
      role: "user",
      content: `Final part ${chunks.length}/${chunks.length}: ${chunks[chunks.length - 1]}\n\nThat's the complete request. Please provide recommendations based on all parts of my message.`
    });
    
    // Prepare the base request data for final chunk
    const finalRequestData = {
      model: this.model,
      messages: conversationMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens
    };
    
    // Add structured output format if enabled
    if (this.useStructuredOutput) {
      console.log('Using structured output format for final chunked request');
      finalRequestData.response_format = {
        type: "json_schema",
        json_schema: {
          name: "media_recommendations",
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    reasoning: { type: "string" },
                    rating: { type: "string" },
                    streaming: { type: "string" }
                  },
                  required: ["title", "description", "reasoning", "rating", "streaming"],
                  additionalProperties: false
                }
              }
            },
            required: ["recommendations"],
            additionalProperties: false
          },
          strict: true
        }
      };
    } else {
      console.log('Using legacy format for final chunked request (structured output disabled)');
    }
    
    // Send final chunk using proxy first, then fall back to direct request
    try {
      console.log(`Attempting to proxy final chunk to: ${this.apiUrl}`);
      return await apiService.proxyRequest({
        url: this.apiUrl,
        method: 'POST',
        data: finalRequestData,
        headers
      });
    } catch (proxyError) {
      console.log(`Proxy request for final chunk failed, using direct request: ${proxyError.message}`);
      return await axios({
        url: this.apiUrl,
        method: 'POST',
        data: finalRequestData,
        headers
      });
    }
  }

  /**
   * Verify recommendations don't include any existing items
   * @param {Array} recommendations - List of recommendations to verify
   * @param {Array} libraryItems - List of items in user's library
   * @param {Array} likedItems - List of items user has liked
   * @param {Array} dislikedItems - List of items user has disliked
   * @param {Array} previousRecommendations - List of previously recommended items
   * @returns {Array} - Filtered list of recommendations
   */
  verifyRecommendations(recommendations, libraryItems = [], likedItems = [], dislikedItems = [], previousRecommendations = []) {
    if (!recommendations || !recommendations.length) {
      return [];
    }

    // Create normalized sets for faster lookups
    const librarySet = new Set(libraryItems.map(item => typeof item === 'string' ? 
      item.toLowerCase() : item.title.toLowerCase()));
    
    const likedSet = new Set(likedItems.map(item => typeof item === 'string' ? 
      item.toLowerCase() : item.title.toLowerCase()));
    
    const dislikedSet = new Set(dislikedItems.map(item => typeof item === 'string' ? 
      item.toLowerCase() : item.title.toLowerCase()));
    
    const previousRecsSet = new Set(previousRecommendations.map(item => typeof item === 'string' ? 
      item.toLowerCase() : item.title.toLowerCase()));

    // Filter out any recommendations that match existing items
    const filteredRecommendations = recommendations.filter(rec => {
      const normalizedTitle = rec.title.toLowerCase().trim();
      
      // Check for exact matches
      if (librarySet.has(normalizedTitle) ||
          likedSet.has(normalizedTitle) ||
          dislikedSet.has(normalizedTitle) ||
          previousRecsSet.has(normalizedTitle)) {
        return false;
      }
      
      // Check for title contained within library items (handles substring matches)
      // This helps with variations like "The Matrix" vs "Matrix" or "Star Wars: A New Hope" vs "Star Wars"
      for (const libraryTitle of librarySet) {
        if (normalizedTitle.length > 4 && libraryTitle.length > 4) {
          if (normalizedTitle.includes(libraryTitle) || libraryTitle.includes(normalizedTitle)) {
            return false;
          }
        }
      }
      
      // Also check against liked items using the same approach
      for (const likedTitle of likedSet) {
        if (normalizedTitle.length > 4 && likedTitle.length > 4) {
          if (normalizedTitle.includes(likedTitle) || likedTitle.includes(normalizedTitle)) {
            return false;
          }
        }
      }
      
      // Also check against disliked items using the same approach
      for (const dislikedTitle of dislikedSet) {
        if (normalizedTitle.length > 4 && dislikedTitle.length > 4) {
          if (normalizedTitle.includes(dislikedTitle) || dislikedTitle.includes(normalizedTitle)) {
            return false;
          }
        }
      }
      
      // Also check against previous recommendations using the same approach
      for (const prevRecTitle of previousRecsSet) {
        if (normalizedTitle.length > 4 && prevRecTitle.length > 4) {
          if (normalizedTitle.includes(prevRecTitle) || prevRecTitle.includes(normalizedTitle)) {
            return false;
          }
        }
      }
      
      return true;
    });

    // Log any removed recommendations
    const removedCount = recommendations.length - filteredRecommendations.length;
    if (removedCount > 0) {
      console.log(`Final verification removed ${removedCount} recommendations that matched existing items`);
    }

    return filteredRecommendations;
  }

  /**
   * Parse recommendations from the AI response
   * @param {string} content - The AI response content
   * @returns {Array} - List of parsed recommendations
   */
  parseRecommendations(content) {
    // Optimized parsing method
    const recommendations = [];
    const seenTitles = new Set(); // Track seen titles to prevent duplicates
    
    // Validate content
    if (!content || typeof content !== 'string') {
      console.error('Invalid content for parsing:', content);
      return recommendations; // Return empty array instead of throwing
    }
    
    // Split the response by numbered entries (1., 2., etc.)
    const sections = content.split(/\d+\.\s+/).filter(Boolean);
    
    if (sections.length > 0) {
      // Process each section
      for (const section of sections) {
        // Skip intro text like "Here are five recommendations..."
        if (section.toLowerCase().includes("here are") && 
            (section.toLowerCase().includes("recommendation") || 
             section.toLowerCase().includes("tv show") ||
             section.toLowerCase().includes("movie"))) {
          continue;
        }
        
        // Extract title (first line or up to first colon)
        let title = '';
        let details = section;
        
        if (section.includes(':')) {
          const firstColonIndex = section.indexOf(':');
          title = section.substring(0, firstColonIndex).trim();
          // Remove any markdown formatting and brackets
          title = title.replace(/\*\*/g, '').trim();
          title = title.replace(/^\[|\]$/g, '').trim();
          details = section.substring(firstColonIndex + 1).trim();
        } else {
          // If no colon, try to get the first line
          const firstLineBreak = section.indexOf('\n');
          if (firstLineBreak > 0) {
            title = section.substring(0, firstLineBreak).trim();
            // Remove any markdown formatting and brackets
            title = title.replace(/\*\*/g, '').trim();
            title = title.replace(/^\[|\]$/g, '').trim();
            details = section.substring(firstLineBreak + 1).trim();
          } else {
            title = section.trim();
            // Remove any markdown formatting and brackets
            title = title.replace(/\*\*/g, '').trim();
            title = title.replace(/^\[|\]$/g, '').trim();
            details = '';
          }
        }
        
        // Handle case where title might be surrounded by brackets
        // Some LLMs might return "[Title Name]:" instead of "Title Name:"
        const bracketMatch = title.match(/^\[(.*)\]$/);
        if (bracketMatch && bracketMatch[1]) {
          title = bracketMatch[1].trim();
        }
        
        // Skip if the title looks like an introduction or section header rather than a show name
        if (title.toLowerCase().includes("here are") || 
            title.toLowerCase().includes("recommendation") ||
            title.toLowerCase().includes("available on") ||
            title.toLowerCase() === "why you might like it" ||
            title.toLowerCase() === "description" ||
            title.length > 50) {
          continue;
        }
        
        // Fix case where "Description:" is malformed into the title portion
        if (title.toLowerCase().includes("description")) {
          // Try to extract the actual title from before "description"
          const descIndex = title.toLowerCase().indexOf("description");
          if (descIndex > 0) {
            const possibleTitle = title.substring(0, descIndex).trim();
            // Only use it if it seems like a reasonable title
            if (possibleTitle.length > 0 && possibleTitle.length < 50 && 
                !possibleTitle.toLowerCase().includes("here are")) {
              title = possibleTitle;
            }
          }
        }
        
        // Check if this title is a duplicate (case-insensitive)
        const titleLower = title.toLowerCase();
        if (seenTitles.has(titleLower)) {
          console.log(`Skipping duplicate recommendation: "${title}"`);
          continue;
        }
        
        // Extract common fields using helper method with fallbacks for flexibility
        let description = this.extractFieldFromText(details, 'Description', 'Why you might like it');
        let reasoning = this.extractFieldFromText(details, 'Why you might like it', 'Recommendarr Rating');
        let rating = this.extractFieldFromText(details, 'Recommendarr Rating', 'Available on');
        let streaming = this.extractFieldFromText(details, 'Available on', null);
        
        // Try alternative patterns if primary extraction failed
        if (!description) {
          description = this.extractFieldFromText(details, 'description', 'why you might like it') ||
                        this.extractFieldFromText(details, 'Synopsis', 'Why') ||
                        this.extractFieldFromText(details, 'About', 'Why');
        }
        
        if (!reasoning) {
          reasoning = this.extractFieldFromText(details, 'why you might like it', 'recommendarr rating') ||
                      this.extractFieldFromText(details, 'Why', 'Rating') ||
                      this.extractFieldFromText(details, 'Appeal', 'Rating');
        }
        
        if (!rating) {
          rating = this.extractFieldFromText(details, 'recommendarr rating', 'available on') ||
                  this.extractFieldFromText(details, 'Rating', 'Available') ||
                  this.extractFieldFromText(details, 'Score', 'Available');
        }
        
        if (!streaming) {
          streaming = this.extractFieldFromText(details, 'available on', null) ||
                     this.extractFieldFromText(details, 'Streaming', null) ||
                     this.extractFieldFromText(details, 'Watch on', null);
        }
        
        // Skip entries where we couldn't extract meaningful content after fallbacks
        if (!description && !reasoning && !streaming) {
          continue;
        }
        
        // Add title to seen titles set to prevent duplicates
        seenTitles.add(titleLower);
        
        recommendations.push({
          title,
          description: description || '',
          reasoning: reasoning || '',
          rating: rating || 'N/A',
          streaming: streaming || 'Unknown',
          fullText: section.trim()
        });
      }
    } else if (content.trim()) {
      // If parsing failed, return whole content
      recommendations.push({
        title: 'Recommendations',
        description: '',
        reasoning: '',
        rating: 'N/A',
        streaming: '',
        fullText: content.trim()
      });
    }
    
    return recommendations;
  }
  
  /**
   * Helper method to extract a field from text
   * @param {string} text - The text to extract from
   * @param {string} startMarker - The start marker to look for
   * @param {string} endMarker - The end marker to look for (optional)
   * @returns {string|null} - The extracted field or null if not found
   */
  extractFieldFromText(text, startMarker, endMarker) {
    // Use case-insensitive search for reliability
    const lowerText = text.toLowerCase();
    const lowerStartMarker = startMarker.toLowerCase();
    const lowerEndMarker = endMarker ? endMarker.toLowerCase() : null;
    
    let startIndex = lowerText.indexOf(lowerStartMarker);
    if (startIndex === -1) return null;
    
    // Get the actual case from the original text
    const actualStartMarker = text.substring(startIndex, startIndex + startMarker.length);
    startIndex += actualStartMarker.length;
    
    // Skip colon and whitespace if present
    if (text[startIndex] === ':') startIndex++;
    while (startIndex < text.length && /\s/.test(text[startIndex])) startIndex++;
    
    let endIndex;
    if (lowerEndMarker) {
      endIndex = lowerText.indexOf(lowerEndMarker, startIndex);
      if (endIndex === -1) endIndex = text.length;
    } else {
      endIndex = text.length;
    }
    
    // Get result, ensuring we don't grab section markers
    const result = text.substring(startIndex, endIndex).trim();
    
    // Sanity check - if result is too short or just punctuation, return null
    if (result.length < 2 || /^[.,;:\s]*$/.test(result)) {
      return null;
    }
    
    return result;
  }
}

// Create a singleton instance
const openAIService = new OpenAIService();

export default openAIService;