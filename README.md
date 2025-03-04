# Recommendarr

![image](https://github.com/user-attachments/assets/19d332af-f90d-4b6d-8750-4be07bc45161)

Recommendarr generates personalized TV show and movie recommendations based on your Sonarr, Radarr, Plex, and Jellyfin libraries using AI.

## 🌟 Features

- **AI-Powered Recommendations**: Personalized TV show and movie suggestions based on your library
- **Media Server Integration**: Works with Sonarr, Radarr, Plex, Jellyfin, and Tautulli
- **Flexible AI Support**: Compatible with OpenAI, local models, or any OpenAI-compatible API
- **Watch History Analysis**: Uses your actual viewing patterns for better recommendations
- **Customization**: Filter by genre, language, mood/vibe with adjustable recommendation count
- **Dark/Light Mode**: Toggle between themes for your preferred viewing experience

## 📋 Prerequisites

- [Sonarr](https://sonarr.tv/) and/or [Radarr](https://radarr.video/) with API access
- Optional: [Plex](https://www.plex.tv/), [Jellyfin](https://jellyfin.org/), or [Tautulli](https://tautulli.com/) 
- An OpenAI API key or any OpenAI-compatible API endpoint

## 🚀 Quick Start

### Option 1: Docker Pull & Run (Simplest)

```bash
# Pull the image
docker pull tannermiddleton/recommendarr:latest

# Run the container
docker run -d --name recommendarr -p 3030:80 -p 3050:3050 -v $(pwd)/server/data:/app/server/data tannermiddleton/recommendarr:latest
```

Visit `http://localhost:3030` in your browser.

> **Important:** The `-v $(pwd)/server/data:/app/server/data` volume mount ensures your credentials are saved between container restarts. Make sure to run the command from the directory where you want to store your data.

### Option 2: Build Locally with Docker Compose

```bash
# Clone the repository
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr

# Build and start with docker compose
docker-compose up -d --build
```

Visit `http://localhost:3030` in your browser.

### Option 3: Manual Installation

```bash
# Clone and set up
git clone https://github.com/fingerthief/recommendarr.git
cd recommendarr
npm install

# Run development server
npm run dev

# For production build
npm run build
```

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

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgements

Built with [Vue.js](https://vuejs.org/) and integrates with:
- [Sonarr](https://sonarr.tv/) & [Radarr](https://radarr.video/)
- [Plex](https://www.plex.tv/), [Jellyfin](https://jellyfin.org/), & [Tautulli](https://tautulli.com/)
- [OpenRouter](https://openrouter.ai/docs/quickstart) and other AI providers
