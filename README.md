# Recommendarr

![image](https://github.com/user-attachments/assets/19d332af-f90d-4b6d-8750-4be07bc45161)

Recommendarr is a web application that generates personalized TV show and movie recommendations based on your Sonarr, Radarr, Plex, and Jellyfin libraries using AI.

## 🌟 Features

- **AI-Powered Recommendations**: Get personalized TV show and movie suggestions based on your existing library
- **Sonarr & Radarr Integration**: Connects directly to your media servers to analyze your TV and movie collections
- **Plex, Jellyfin & Tautulli Integration**: Analyzes your watch history to provide better recommendations based on what you've actually watched
- **Flexible AI Support**: Works with OpenAI, local models (Ollama/LM Studio), or any OpenAI-compatible API
- **Customization Options**: Adjust recommendation count, model parameters, and more
- **Dark/Light Mode**: Toggle between themes based on your preference
- **Poster Images**: Displays media posters with fallback generation

## 📋 Prerequisites

- [Sonarr](https://sonarr.tv/) instance with API access (for TV recommendations)
- [Radarr](https://radarr.video/) instance with API access (for movie recommendations)
- [Plex](https://www.plex.tv/), [Jellyfin](https://jellyfin.org/), or [Tautulli](https://tautulli.com/) instance with API access (for watch history analysis) - optional
- An OpenAI API key or any OpenAI-compatible API (like local LLM servers)
- Node.js (v14+) and npm for development

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run Recommendarr with all features is to use Docker Compose:

```bash
# Clone the repository (which includes the docker-compose.yml file)
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Start the application
docker-compose up -d --build
```

This will:
1. Build both the frontend and API server images locally
2. Configure them to work together with the proper networking
3. Start both services with the correct configuration

Then visit `http://localhost:3030` in your browser to access the application.

The API server runs on port 3050 and provides secure credential storage and proxy functionality for accessing services that may be blocked by CORS restrictions.

### Option 2: Docker (Frontend Only)

You can also run just the frontend container:

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container
docker run -d \
  --name recommendarr \
  -p 3030:80 \
  tannermiddleton/recommendarr:latest
```

Then visit `http://localhost:3030` in your browser. Note that without the API server, credential storage will be limited to your browser's local storage.

For more Docker options, see the [Docker Support](#-docker-support) section below.

### Option 3: Manual Installation

1. Clone the repository:
```bash
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run serve
```

4. Visit `http://localhost:3030` in your browser.

## 🔧 Configuration

### 1. Connect to Sonarr, Radarr, and/or Plex/Jellyfin

1. When you first open Recommendarr, you'll be prompted to connect to your services
2. For Sonarr (TV shows):
   - Enter your Sonarr URL (e.g., `http://localhost:8989` or `https://sonarr.yourdomain.com`)
   - Enter your Sonarr API key (found in Sonarr under Settings → General)
   - Click "Connect"
3. For Radarr (Movies):
   - Enter your Radarr URL (e.g., `http://localhost:7878` or `https://radarr.yourdomain.com`)
   - Enter your Radarr API key (found in Radarr under Settings → General)
   - Click "Connect"
4. For Plex (Optional - Watch History):
   - Enter your Plex URL (e.g., `http://localhost:32400` or `https://plex.yourdomain.com`)
   - Enter your Plex token (can be found by following [these instructions](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/))
   - Click "Connect"
5. For Jellyfin (Optional - Watch History):
   - Enter your Jellyfin URL (e.g., `http://localhost:8096` or `https://jellyfin.yourdomain.com`)
   - Enter your Jellyfin API key (found in Jellyfin under Dashboard → API Keys)
   - Enter your Jellyfin user ID (found in Jellyfin user settings)
   - Click "Connect"
6. For Tautulli (Optional - Watch History):
   - Enter your Tautulli URL (e.g., `http://localhost:8181` or `https://tautulli.yourdomain.com`)
   - Enter your Tautulli API key (found in Tautulli under Settings → Web Interface → API)
   - Click "Connect"

You can connect to any combination of these services based on your needs.

### 2. Set Up AI Service

1. Navigate to Settings
2. Select the AI Service tab
3. Enter your AI service details:
   - **API URL**: For OpenAI, use `https://api.openai.com/v1`. For local models, use your server URL (e.g., `http://localhost:1234/v1`)
   - **API Key**: Your OpenAI API key or appropriate key for other services (not needed for some local servers)
   - **Model**: Select a model from the list or leave as default
   - **Parameters**: Adjust max tokens and temperature as needed
4. Click "Save Settings"

### 3. Get Recommendations

1. Navigate to TV Recommendations or Movie Recommendations page
2. Adjust the number of recommendations you'd like to receive using the slider
3. If connected to Plex, Jellyfin, or Tautulli, choose whether to include your watch history in the recommendations
4. Click "Get Recommendations"
5. View your personalized media suggestions with posters and descriptions

## 🐋 Docker Support

### Using docker-compose.remote.yml

For convenience, a pre-configured `docker-compose.remote.yml` file is included in the repository that uses the Docker Hub images:

```bash
# Stop any existing instances first
docker-compose down

# Pull the latest images and start the services
docker-compose -f docker-compose.remote.yml pull && docker-compose -f docker-compose.remote.yml up -d
```

### Option 1: Pull and Run Pre-built Image

The easiest way to run Recommendarr:

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container
docker run -d \
  --name recommendarr \
  -p 3030:80 \
  tannermiddleton/recommendarr:latest
```

### Option 2: Build and Run Locally

If you want to build the Docker image yourself:

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git

# Navigate to the project directory
cd recommendarr

# Build the Docker image
docker build -t recommendarr:local .

# Run the container
docker run -d \
  --name recommendarr \
  -p 3030:80 \
  recommendarr:local
```

### Option 3: Using Pre-built Docker Images

If you prefer not to build the images locally and want to use the pre-built images from Docker Hub:

```bash
# Create a new directory
mkdir recommendarr && cd recommendarr

# Create a docker-compose.yml file with the following content:
cat > docker-compose.yml << 'EOF'
version: '3'
services:
  recommendarr:
    image: tannermiddleton/recommendarr:latest
    container_name: recommendarr
    depends_on:
      - api
    ports:
      - "3030:80"
    restart: unless-stopped

  api:
    image: tannermiddleton/recommendarr-api:latest
    container_name: recommendarr-api
    ports:
      - "3050:3050"
    environment:
      - NODE_ENV=production
      - DOCKER_ENV=true
    volumes:
      - ./server/data:/app/server/data
    restart: unless-stopped
EOF

# Create the data directory
mkdir -p server/data

# Start with docker-compose
docker-compose up -d
```

This will pull the pre-built images from Docker Hub and start the services on ports 3030 (frontend) and 3050 (API server).

**Key benefits of using either Docker Compose method:**
- The API server data directory is mounted as a volume, ensuring your credentials persist across container restarts
- The frontend and API server are automatically configured to work together
- All your service credentials are stored securely using encryption
- CORS issues are automatically handled through the proxy service

**Note:** If you want to customize port mappings or other settings, edit the `docker-compose.yml` file before running the command.

## 🖥️ Compatible AI Services

Recommendarr works with various AI services:

- **OpenAI API**: Standard integration with models like GPT-3.5 and GPT-4
- **Ollama**: Self-hosted models with OpenAI-compatible API
- **LM Studio**: Run models locally on your computer
- **Anthropic Claude**: Via OpenAI-compatible endpoints
- **Self-hosted models**: Any service with OpenAI-compatible chat completions API

### Recommended Models

Here are some recommendations for models that work well with Recommendarr:

#### Free/Low-Cost Options via OpenRouter
- **Meta Llama 3.3 70B Instruct**: Great performance for free
- **Gemini 2.0 models** (Flash/Pro/Thinking): Excellent recommendation quality
- **DeepSeek R1 models**: Strong performance across variants

#### Premium Models (Affordable via OpenRouter)
- **Claude 3.7/3.5 Haiku**: Exceptional for understanding your library preferences
- **GPT-4o mini**: Excellent balance of performance and cost
- **Grok Beta**: Good recommendations at reasonable prices
- **Amazon Nova Pro**: Strong media understanding capabilities

#### Local Models
- **DeepSeek R1 7B Qwen Distill**: Good performance for a smaller model (via LM Studio)

For best results, try setting max tokens to 4000 and temperature between 0.6-0.8 depending on the model.

## 🎬 TV and Movie Recommendations

### TV Recommendations
- Connect to your Sonarr instance to get personalized TV show recommendations
- The AI analyzes your TV library to understand your preferences
- Optional Plex, Jellyfin, or Tautulli integration enhances recommendations based on what you've actually watched
- Receives detailed recommendations with show descriptions and reasoning

### Movie Recommendations
- Connect to your Radarr instance to get personalized movie recommendations
- The AI analyzes your movie collection to understand genres and preferences you enjoy
- Optional Plex, Jellyfin, or Tautulli integration provides watch history data for better personalization
- Get suggested movies with descriptions, reasoning, and poster images
- Easily discover new films based on your existing collection

## 📊 Tautulli

### Setting Up Tautulli Integration

Tautulli provides advanced insights into your Plex Media Server, tracking user activity and media statistics. Integrating Tautulli with Recommendarr enhances recommendations by analyzing your actual watch history.

1. In the Recommendarr interface, go to **Settings** and connect to your Tautulli instance
2. Enter your Tautulli URL (e.g., `http://localhost:8181` or `http://your-server-ip:8181`)
3. Enter your Tautulli API key (found in Tautulli under Settings → Web Interface → API)
4. Test the connection and save

### Benefits

- **Enhanced Recommendations**: Your watch history is analyzed to provide more personalized recommendations
- **Viewing Insights**: See what content is most popular in your household
- **Better Context**: The AI uses your actual viewing patterns to understand your preferences

Watch history from Tautulli complements your media library data, giving the AI a more complete picture of your preferences beyond just what content you've collected.

## 🔒 Privacy & Security

Your data never leaves your control:
- When using the API server (via Docker Compose):
  - Sonarr, Radarr, Plex, Jellyfin, and Tautulli API credentials are stored securely using encryption
  - AI API keys are stored encrypted and used only for your requests
  - The API server acts as a proxy, preventing CORS issues when accessing your services
  - All sensitive data is encrypted at rest on the server
- Media library and watch history data is sent only to the AI service you configure
- No analytics or tracking are included in the application

## 💻 Development

### Setting Up a Development Environment

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Install dependencies
npm install

# Start both the frontend and API server concurrently (recommended)
npm run dev

# Or start components individually:
# Run frontend development server with hot-reload
npm run serve

# Run API server separately
npm run api

# Compile and minify for production
npm run build

# Lint and fix files
npm run lint
```

<<<<<<< Updated upstream
The development server will start at http://localhost:8080 (frontend) and http://localhost:3050 (API server).
=======
Visit `http://localhost:8080` in your browser (development) or use a web server to serve the files from the dist directory (production).

## 🔧 Configuration

> **Note:** The application needs both ports to function correctly: 3030 for the web interface and 3050 for the API server that handles requests to external services.

### Connect Your Services

Connect to any combination of these services:

**Media Libraries:**
- **Sonarr**: Enter URL and API key (found in Settings → General)
- **Radarr**: Enter URL and API key (found in Settings → General)

**Watch History (Optional):**
- **Plex**: Enter URL and [Plex token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)
- **Jellyfin**: Enter URL, API key and user ID
- **Tautulli**: Enter URL and API key (found in Settings → Web Interface → API)

### Configure AI Service

1. Navigate to Settings → AI Service
2. Enter your AI details:
   - **API URL**: OpenAI (`https://api.openai.com/v1`) or other compatible endpoint
   - **API Key**: Your API key (may not be needed for some local services)
   - **Model**: Select or enter a model name
   - **Parameters**: Adjust max tokens (4000 recommended) and temperature (0.7-0.8 recommended)

### Get Recommendations

1. Select TV or Movie recommendations
2. Adjust filters (genre, language, mood/vibe) if desired
3. Click "Get Recommendations"
4. View personalized suggestions with posters and descriptions

## 🐋 Docker Tips

### Using Docker Desktop UI

You can also set up Recommendarr using Docker Desktop's graphical interface:

1. **Pull the Image**:
   - Open Docker Desktop
   - Go to the "Images" tab
   - Click "Pull" and enter `tannermiddleton/recommendarr:latest`

2. **Create a Container**:
   - Click on the pulled image, then select "Run"
   - Configure the container:
     - Set the Container Name to `recommendarr`
     - Under "Port mapping", add:
       - Host port: `3030` → Container port: `80`
       - Host port: `3050` → Container port: `3050`
     - Under "Volumes", add:
       - Host path: Select a folder for data storage (e.g., `/path/to/data`)
       - Container path: `/app/server/data`
   - Click "Run"

3. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3030`

### Update Your Installation

If using docker run:
```bash
docker stop recommendarr
docker rm recommendarr
docker pull tannermiddleton/recommendarr:latest
docker run -d --name recommendarr -p 3030:80 -p 3050:3050 -v $(pwd)/server/data:/app/server/data tannermiddleton/recommendarr:latest
```

If using docker compose:
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

### Build Locally Instead of Using Remote Image

```bash
# Build and run locally
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr
# Using docker compose
docker-compose up -d --build
# Or direct build and run
docker build -t recommendarr:local .
docker run -d --name recommendarr -p 3030:80 -p 3050:3050 -v $(pwd)/server/data:/app/server/data recommendarr:local
```

**Key Benefits:**
- Persistent credentials across container restarts
- Automatic CORS handling through the proxy service
- Secure encrypted credential storage

## 🖥️ Compatible AI Services

Recommendarr works with any OpenAI-compatible API:

- **OpenAI**: GPT-3.5-Turbo, GPT-4, GPT-4o models
- **Anthropic Claude**: Via Claude-compatible endpoints
- **Local Models**: Ollama, LM Studio, self-hosted solutions
- **Model Providers**: OpenRouter, Groq, Together.ai and others

### Recommended Models

**Free/Low-Cost Options:**
- Meta Llama 3.3 70B Instruct (via OpenRouter)
- Gemini 2.0 models (via OpenRouter)
- DeepSeek R1 models

**Premium Models:**
- Claude 3.7/3.5 Haiku: Exceptional media recommendations
- GPT-4o mini: Excellent balance of performance and cost

**Local Options:**
- DeepSeek R1 models via Ollama or LM Studio

For best results: 4000 max tokens, temperature 0.7-0.8

## 🎬 Recommendation Features

### What You Get
- **Personalized Suggestions**: Based on your existing library and watch history
- **Detailed Information**: Descriptions, reasoning, and rating estimates
- **Filter Options**: Genre, language, and mood/vibe preferences
- **Watch History Analysis**: More accurate recommendations based on what you actually watch
- **One-Click Adding**: Add recommended content directly to Sonarr/Radarr

### Media Insights
- AI analyzes patterns in your library to understand your preferences
- Watch history data significantly improves recommendation quality
- Customization options let you fine-tune the suggestion algorithm

### Using Watch History
Connect any of these services for enhanced recommendations:
- **Plex**: Direct watch history integration
- **Jellyfin**: Similar to Plex but for Jellyfin users
- **Tautulli**: Advanced Plex statistics and user-specific history

## 🔒 Privacy & Security

**Your data stays under your control:**
- All service credentials are encrypted at rest
- API server acts as a proxy, preventing CORS issues
- Media data is sent only to your chosen AI service
- No analytics or tracking included

## 💻 Development

```bash
# Set up environment
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr
npm install

# Development mode (frontend + API)
npm run dev

# Production build
npm run build
```

Development servers: Frontend http://localhost:8080, API http://localhost:3050
>>>>>>> Stashed changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Vue.js](https://vuejs.org/) - The progressive JavaScript framework
- [Sonarr](https://sonarr.tv/) - For the amazing API that powers TV recommendations
- [Radarr](https://radarr.video/) - For the API that enables movie recommendations
- [Plex](https://www.plex.tv/) - For the API that provides watch history data
- [Jellyfin](https://jellyfin.org/) - For the API that provides additional watch history data
- [Tautulli](https://tautulli.com/) - For the API that provides detailed Plex watch statistics
- [OpenRouter](https://openrouter.ai/docs/quickstart) - For the API that powers AI-based suggestions
