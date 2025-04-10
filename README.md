# Daydream

Daydream is an interactive web application designed for brainstorming and creative idea generation. Users start with an initial prompt, and the application leverages AI to iteratively expand upon the idea based on user choices, culminating in a final generated summary or "dream".

You can now use Daydream directly in your browser (web and mobile) -
[https://jakezhiming.github.io/daydream/](https://jakezhiming.github.io/daydream/)

## Application Overview

Daydream creates an engaging creative thinking environment where ideas evolve organically:

- **Interactive Exploration**: Start with a seed idea and watch it branch into multiple directions
- **User-Guided Development**: Choose which pathways to explore at each step
- **AI-Powered Creativity**: Utilizes OpenAI's GPT models to generate novel connections and ideas
- **Visual Journey**: Clean, intuitive interface that focuses on the creative process
- **Final Summary**: Produces a cohesive "dream" that captures the essence of your exploration

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jakezhiming/daydream.git
    cd daydream
    ```

2.  **Set up environment variables:**
    Copy the example environment file and fill in your specific configurations:
    ```bash
    cp .env.example .env
    # Now edit .env with your settings (e.g., OpenAI API key, proxy token)
    ```

3.  **Update the frontend configuration:**
    Edit `docs/js/config.js` to match your proxy server settings:
    ```javascript
    const appConfig = {
        PROXY_SERVER_URL: 'http://localhost:10000/', // Update this URL to your proxy server
    };
    ```

## Setting Up the Proxy Server

The application uses a proxy server to handle API calls to OpenAI, which helps avoid CORS issues and adds an extra layer of security.

1. **Configure the proxy server:**
   Ensure your `.env` file has the following entries:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_RATE_LIMIT=60
   PROXY_TOKEN=your_secure_proxy_token_here
   CORS_ALLOW_ORIGIN=http://127.0.0.1:8000 // Update this URL to your static file server
   ```

2. **Start the proxy server:**
   ```bash
   python proxy_server.py
   ```
   The proxy server will run on port 10000 by default and create an endpoint at `/api/openai`.

## Running the Application

1. **First, ensure the proxy server is running**
   ```bash
   python proxy_server.py
   ```

2. **Serve the static site:**
   You can use any static file server to serve the contents of the `docs` directory. For example, using Python's built-in HTTP server:
   ```bash
   cd docs
   python -m http.server 8000
   ```

The application will be available at `http://127.0.0.1:8000/`.

## Author

- GitHub: [https://github.com/jakezhiming](https://github.com/jakezhiming)
- LinkedIn: [https://www.linkedin.com/in/jakezhiming/](https://www.linkedin.com/in/jakezhiming/)

If you enjoy using Daydream, consider:
- ⭐ Starring the repository on GitHub
- 🐛 Reporting any bugs or issues
- 🔄 Contributing to the project