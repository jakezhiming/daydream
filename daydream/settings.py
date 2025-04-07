import os
from pathlib import Path
from dotenv import load_dotenv # Add this import

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(os.path.join(BASE_DIR, '.env')) # Add this line

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-default-secret-key-in-dev') # Use env var

DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True' # Use env var

ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost').split(',') # Use env var

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ideation', # Add your app
    # Add 'corsheaders' if needed for frontend dev server communication
    # 'corsheaders',
]

MIDDLEWARE = [
    # Add 'corsheaders.middleware.CorsMiddleware' if using it, usually near the top
    # 'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware', # Important for POST requests from forms/AJAX
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'daydream.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'], # Optional: Project-level templates
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / "static"] # Optional: Project-level static files
STATIC_ROOT = BASE_DIR / "staticfiles" # For collectstatic during deployment

# --- LLM Configuration ---
LLM_API_KEY = os.getenv('LLM_API_KEY')
LLM_API_ENDPOINT = os.getenv('LLM_API_ENDPOINT', 'https://api.openai.com/v1/chat/completions') # Example for OpenAI
LLM_MODEL = os.getenv('LLM_MODEL', 'gpt-4o-mini') # Example

# --- CORS Configuration (if needed) ---
# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:3000", # Example if frontend runs on a different port
#     "http://127.0.0.1:3000",
# ]
# CORS_ALLOW_CREDENTIALS = True # If you need cookies/auth headers