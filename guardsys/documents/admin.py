from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("object", "original_name", "uploaded_at")
    search_fields = ("original_name",)
    autocomplete_fields = ("object",)

# Register your models here.
