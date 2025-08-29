from django.db import models
from django.conf import settings
from django.utils import timezone


class Organization(models.Model):
    name = models.CharField(max_length=255)
    inn = models.CharField("ИНН", max_length=32, blank=True)
    kpp = models.CharField("КПП", max_length=32, blank=True)
    requisites = models.TextField("Реквизиты", blank=True)
    contacts = models.TextField("Контакты", blank=True)

    def __str__(self) -> str:
        return self.name


class GuardedObject(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Активен"
        ARCHIVED = "ARCHIVED", "В архиве"

    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, related_name="objects"
    )
    equipment = models.TextField("Оборудование")
    main_responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="main_objects",
    )
    deputy_responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="deputy_objects",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def archive(self, reason: str, by_user_id: int | None = None) -> None:
        self.is_deleted = True
        self.status = self.Status.ARCHIVED
        self.deleted_at = timezone.now()
        self.deleted_reason = reason
        self.save(update_fields=["is_deleted", "status", "deleted_at", "deleted_reason"])

    def restore(self) -> None:
        self.is_deleted = False
        self.status = self.Status.ACTIVE
        self.deleted_at = None
        self.save(update_fields=["is_deleted", "status", "deleted_at"])

    def __str__(self) -> str:
        return f"{self.name} — {self.address}"


class AuditLog(models.Model):
    class Entity(models.TextChoices):
        USER = "USER", "Пользователь"
        ORGANIZATION = "ORGANIZATION", "Организация"
        OBJECT = "OBJECT", "Объект"
        MAINTENANCE = "MAINTENANCE", "ТО"
        DOCUMENT = "DOCUMENT", "Документ"

    action = models.CharField(max_length=64)
    entity = models.CharField(max_length=32, choices=Entity.choices)
    entity_id = models.CharField(max_length=64)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    timestamp = models.DateTimeField(auto_now_add=True)
    message = models.TextField(blank=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return f"{self.timestamp:%Y-%m-%d %H:%M} {self.action} {self.entity}#{self.entity_id}"

# Create your models here.
