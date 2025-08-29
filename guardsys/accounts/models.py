from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = "ADMIN", "Администратор"
        RESPONSIBLE = "RESPONSIBLE", "Ответственный"
        OBSERVER = "OBSERVER", "Наблюдатель"

    role = models.CharField(
        max_length=32,
        choices=Roles.choices,
        default=Roles.RESPONSIBLE,
        help_text="Роль пользователя в системе",
    )
    phone = models.CharField(max_length=32, blank=True)
    position = models.CharField(max_length=128, blank=True)
    can_soft_delete = models.BooleanField(
        default=False,
        help_text="Разрешение на мягкое удаление объектов (архивирование)",
    )

    def is_admin(self) -> bool:
        return self.role == self.Roles.ADMIN or self.is_superuser

    def is_responsible(self) -> bool:
        return self.role == self.Roles.RESPONSIBLE

    def is_observer(self) -> bool:
        return self.role == self.Roles.OBSERVER

    def __str__(self) -> str:
        return f"{self.get_full_name() or self.username}"

# Create your models here.
