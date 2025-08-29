from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Персональные данные", {"fields": ("first_name", "last_name", "email", "phone", "position")}),
        ("Права", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions", "can_soft_delete")}),
        ("Даты", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'role', 'email', 'first_name', 'last_name'),
        }),
    )
    list_display = ("username", "get_full_name", "role", "is_active", "can_soft_delete")
    list_filter = ("role", "is_active", "can_soft_delete", "is_staff")
    search_fields = ("username", "first_name", "last_name", "email")
    ordering = ("username",)

# Register your models here.
