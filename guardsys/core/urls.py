from django.urls import path
from . import views


urlpatterns = [
    path('', views.ObjectListView.as_view(), name='object_list'),
    path('objects/create/', views.ObjectCreateView.as_view(), name='object_create'),
    path('objects/<int:pk>/', views.ObjectDetailView.as_view(), name='object_detail'),
    path('objects/<int:pk>/edit/', views.ObjectUpdateView.as_view(), name='object_edit'),
    path('objects/<int:pk>/archive/', views.object_archive, name='object_archive'),
    path('objects/<int:pk>/restore/', views.object_restore, name='object_restore'),
    path('objects/<int:pk>/mark_done/', views.mark_maintenance_done, name='mark_maintenance_done'),
    path('objects/<int:object_id>/upload/', views.upload_document, name='upload_document'),
]

