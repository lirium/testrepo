from django.contrib import admin

from .models import PeriodicityTemplate, MaintenanceEvent


@admin.register(PeriodicityTemplate)
class PeriodicityTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "interval_days")
    list_filter = ("kind",)
    search_fields = ("name",)


@admin.register(MaintenanceEvent)
class MaintenanceEventAdmin(admin.ModelAdmin):
    list_display = ("object", "next_due_at", "last_done_at", "is_overdue")
    list_filter = ("is_overdue",)
    autocomplete_fields = ("object", "periodicity")

# Register your models here.
