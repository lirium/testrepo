from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q

from guardsys.maintenance.models import MaintenanceEvent


class Command(BaseCommand):
    help = "Отправляет ежедневный e-mail отчёт по пройденным и просроченным ТО"

    def handle(self, *args, **options):
        today = timezone.localdate()
        overdue = MaintenanceEvent.objects.filter(next_due_at__lt=today)
        normal = MaintenanceEvent.objects.filter(next_due_at__gte=today)

        # Рассылка ответственным (по объектам)
        for event in overdue.select_related('object__main_responsible'):
            recipient = event.object.main_responsible.email or None
            if not recipient:
                continue
            subject = f"Просрочено ТО по объекту: {event.object.name}"
            body = (
                f"Объект: {event.object.name}\n"
                f"Адрес: {event.object.address}\n"
                f"Следующее ТО было: {event.next_due_at}\n"
            )
            try:
                send_mail(subject, body, None, [recipient], fail_silently=False)
            except Exception as exc:
                admin_email = [e for _, e in (getattr(__import__('django.conf').conf.settings, 'ADMINS', []) or [])]
                if admin_email:
                    send_mail("Ошибка доставки отчёта", str(exc), None, [admin_email[0]], fail_silently=True)

        # Эскалация админу: просрочка >3 дней
        escalation = overdue.filter(next_due_at__lt=today - timezone.timedelta(days=3))
        if escalation.exists():
            subject = "Эскалация: просрочка ТО более 3 дней"
            lines = [f"{e.object.name} — просрочено с {e.next_due_at}" for e in escalation]
            body = "\n".join(lines)
            admin_email = [e for _, e in (getattr(__import__('django.conf').conf.settings, 'ADMINS', []) or [])]
            if admin_email:
                send_mail(subject, body, None, [admin_email[0]], fail_silently=True)

        self.stdout.write(self.style.SUCCESS("Ежедневный отчёт отправлен"))

