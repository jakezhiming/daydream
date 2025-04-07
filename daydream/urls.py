from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('ideation.urls')), # Include app-specific URLs
]

# Add this section to serve static files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    # Note: This typically serves files collected by collectstatic in STATIC_ROOT.
    # For serving app-level static files directly during development without collectstatic,
    # ensure 'django.contrib.staticfiles' is in INSTALLED_APPS and APP_DIRS=True in TEMPLATES.
    # The default runserver handles this automatically, but Gunicorn might need explicit help.
    # If using APP_DIRS doesn't work with Gunicorn, consider using WhiteNoise (see below).

# --- Optional: WhiteNoise Configuration (Recommended for Production & simpler dev setup) ---
# If you uncomment WhiteNoise in requirements.txt and install it:
# 1. Add 'whitenoise.middleware.WhiteNoiseMiddleware' to MIDDLEWARE (usually after SecurityMiddleware)
# 2. Set STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
# WhiteNoise can serve static files efficiently in both development and production.