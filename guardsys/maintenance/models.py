from django.db import models
from django.utils import timezone
from django.conf import settings

from guardsys.core.models import GuardedObject


class PeriodicityTemplate(models.Model):
    class Kind(models.TextChoices):
        MONTHLY = "MONTHLY", "Ежемесячно"
        QUARTERLY = "QUARTERLY", "Ежеквартально"
        CUSTOM = "CUSTOM", "Кастом"

    name = models.CharField(max_length=128)
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.MONTHLY)
    interval_days = models.PositiveIntegerField(default=30)

    def compute_next_date(self, from_date):
        if self.kind == self.Kind.MONTHLY:
            return from_date + timezone.timedelta(days=30)
        if self.kind == self.Kind.QUARTERLY:
            return from_date + timezone.timedelta(days=90)
        return from_date + timezone.timedelta(days=self.interval_days)

    def __str__(self) -> str:
        return self.name


class MaintenanceEvent(models.Model):
    object = models.ForeignKey(GuardedObject, on_delete=models.CASCADE, related_name="maintenances")
    periodicity = models.ForeignKey(PeriodicityTemplate, on_delete=models.PROTECT, related_name="events")
    last_done_at = models.DateField(null=True, blank=True)
    next_due_at = models.DateField()
    is_overdue = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def recalc_overdue(self):
        today = timezone.localdate()
        self.is_overdue = self.next_due_at < today

    def mark_done(self, when=None, save=True):
        when = when or timezone.localdate()
        self.last_done_at = when
        self.next_due_at = self.periodicity.compute_next_date(when)
        self.recalc_overdue()
        if save:
            self.save()

    def __str__(self) -> str:
        return f"ТО для {self.object.name}: след. {self.next_due_at}"

# Create your models here.
