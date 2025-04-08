# Daydream

Daydream is an interactive web application designed for brainstorming and creative idea generation. Users start with an initial prompt, and the application leverages a Large Language Model (LLM) to iteratively expand upon the idea based on user choices, culminating in a final generated summary or "dream".

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
    Edit `static-site/js/config.js` to match your proxy server settings:
    ```javascript
    const config = {
        proxyUrl: 'http://localhost:10000/api/openai', // Update this URL to your Render-hosted proxy server
    };
    ```

## Setting Up the Proxy Server

The application uses a proxy server to handle API calls to OpenAI, which helps avoid CORS issues and adds an extra layer of security.

1. **Configure the proxy server:**
   Ensure your `.env` file has the following entries:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   PROXY_TOKEN=your_secure_proxy_token_here
   CORS_ALLOW_ORIGIN=http://localhost:8000
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
   You can use any static file server to serve the contents of the `static-site` directory. For example, using Python's built-in HTTP server:
   ```bash
   cd static-site
   python -m http.server 8000
   ```

The application will be available at `http://127.0.0.1:8000/`.