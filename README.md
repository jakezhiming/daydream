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
    # Now edit .env with your settings (e.g., database credentials, secret key)
    ```

## Collecting Static Files

For production deployments, or sometimes during development depending on your setup, you need to collect all static files (CSS, JavaScript, images) into a single directory.

Run the following command:

```bash
python manage.py collectstatic --noinput
```

This command gathers static files from all your applications into the directory specified by `STATIC_ROOT` in your `settings.py`.

## Running the Development Server

To start the development server, run the following command:

```bash
python manage.py runserver
```

The application will typically be available at `http://127.0.0.1:8000/`.