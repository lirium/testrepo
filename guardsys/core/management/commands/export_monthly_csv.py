import csv
from datetime import date
from django.core.management.base import BaseCommand
from django.utils import timezone

from guardsys.maintenance.models import MaintenanceEvent


class Command(BaseCommand):
    help = "Экспорт статистики ТО за месяц по ответственным в CSV (stdout)"

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, default=timezone.now().year)
        parser.add_argument('--month', type=int, default=timezone.now().month)

    def handle(self, *args, **options):
        year = options['year']
        month = options['month']
        first = date(year, month, 1)
        if month == 12:
            last = date(year + 1, 1, 1) - timezone.timedelta(days=1)
        else:
            last = date(year, month + 1, 1) - timezone.timedelta(days=1)

        qs = MaintenanceEvent.objects.select_related('object__main_responsible').all()
        writer = csv.writer(self.stdout)
        writer.writerow(['Ответственный', 'Объект', 'Следующее ТО', 'Просрочено'])
        for e in qs:
            writer.writerow([
                e.object.main_responsible.get_full_name() or e.object.main_responsible.username,
                e.object.name,
                e.next_due_at,
                'да' if e.is_overdue else 'нет'
            ])

