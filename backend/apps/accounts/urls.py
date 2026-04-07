
from django.urls import path
from .views import LoginView, MeView, ChangePasswordView, UserListView
from . import views
urlpatterns = [
    path("login/",           LoginView.as_view()),
    path("me/",              MeView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
    path("users/",           UserListView.as_view()),
    path("iclock/getrequest.aspx", views.iclock_data),
    path("iclock/cdata.aspx", views.iclock_data),
]
