
from django.urls import path
from .views import LoginView, MeView, ChangePasswordView, UserListView

urlpatterns = [
    path("login/",           LoginView.as_view()),
    path("me/",              MeView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
    path("users/",           UserListView.as_view()),
]
