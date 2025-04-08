# Daydream

Daydream is an interactive web application designed for brainstorming and creative idea generation. Users start with an initial prompt, and the application leverages a Large Language Model (LLM) to iteratively expand upon the idea based on user choices, culminating in a final generated summary or "dream".

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jakezhiming/daydream.git
    cd daydream
    ```

2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *(You might need to create a `requirements.txt` file if you don't have one: `pip freeze > requirements.txt`)*

4.  **Set up environment variables:**
    Copy the example environment file and fill in your specific configurations:
    ```bash
    cp .env.example .env
    # Now edit .env with your settings (e.g., OpenAI API key, proxy token)
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


## Collecting Static Files

For production deployments, or sometimes during development depending on your setup, you need to collect all static files (CSS, JavaScript, images) into a single directory.

Run the following command:

```bash
python manage.py collectstatic --noinput
```

This command gathers static files from all your applications into the directory specified by `STATIC_ROOT` in your `settings.py`.

## Running the Development Server

1. **First, ensure the proxy server is running**
   ```bash
   python proxy_server.py
   ```

2. **Start the Django development server:**
   ```bash
   python manage.py runserver
   ```

The application will typically be available at `http://127.0.0.1:8000/`.