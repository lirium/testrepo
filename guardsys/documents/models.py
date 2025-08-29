from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from guardsys.core.models import GuardedObject


def validate_file_size(value):
    max_bytes = 100 * 1024 * 1024  # 100 MB
    if value.size > max_bytes:
        raise ValidationError(_("Файл превышает 100 МБ"))


class Document(models.Model):
    object = models.ForeignKey(GuardedObject, on_delete=models.CASCADE, related_name="documents")
    file = models.FileField(upload_to="documents/%Y/%m/", validators=[validate_file_size])
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["object", "original_name"],
                name="uq_document_object_filename",
            )
        ]

    def __str__(self) -> str:
        return self.original_name

# Create your models here.
