from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',         include('apps.accounts.urls')),
    path("", include("apps.accounts.urls")),
    path('api/members/',      include('apps.members.urls')),
    path('api/staff/',        include('apps.staff.urls')),
    path('api/equipment/',    include('apps.equipment.urls')),
    path('api/finances/',     include('apps.finances.urls')),
    path('api/notifications/',include('apps.notifications.urls')),
    path('api/token/refresh/',TokenRefreshView.as_view(), name='token_refresh'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
