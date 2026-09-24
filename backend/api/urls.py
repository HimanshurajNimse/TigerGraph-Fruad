from django.urls import path
from . import views

urlpatterns = [
    path('investigate/', views.investigate, name='investigate'),
]
