from django.urls import path
from . import views

app_name = 'ideation' # Optional: Define an app namespace

urlpatterns = [
    path('', views.index, name='index'), # The main page
    path('api/expand/', views.api_expand_prompt, name='api_expand'), # API endpoint for expansion
    path('api/complete/', views.api_complete_dream, name='api_complete'), # API endpoint for completion
]