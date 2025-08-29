import json
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import GuardedObject, AuditLog


def serialize_instance(instance):
    data = {}
    for field in instance._meta.fields:
        name = field.name
        try:
            value = getattr(instance, name)
            if hasattr(value, 'pk'):
                data[name] = value.pk
            else:
                data[name] = value
        except Exception:
            data[name] = None
    return data


@receiver(pre_save, sender=GuardedObject)
def guardobj_pre_save(sender, instance: GuardedObject, **kwargs):
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            instance._before_state = serialize_instance(old)
        except sender.DoesNotExist:
            instance._before_state = None
    else:
        instance._before_state = None


@receiver(post_save, sender=GuardedObject)
def guardobj_post_save(sender, instance: GuardedObject, created: bool, **kwargs):
    before = getattr(instance, '_before_state', None)
    after = serialize_instance(instance)
    AuditLog.objects.create(
        action='created' if created else 'updated',
        entity=AuditLog.Entity.OBJECT,
        entity_id=str(instance.pk),
        user=None,
        message='',
        before=before,
        after=after,
    )

