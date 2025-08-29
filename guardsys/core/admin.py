from django.contrib import admin

from .models import Organization, GuardedObject, AuditLog


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "inn", "kpp")
    search_fields = ("name", "inn", "kpp")


@admin.register(GuardedObject)
class GuardedObjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "address", "organization", "main_responsible", "deputy_responsible", "status", "is_deleted")
    list_filter = ("status", "is_deleted", "organization")
    search_fields = ("name", "address")
    autocomplete_fields = ("organization", "main_responsible", "deputy_responsible")


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "action", "entity", "entity_id", "user")
    list_filter = ("entity", "action")
    search_fields = ("message", "entity_id")

# Register your models here.
