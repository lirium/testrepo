from django.core.exceptions import PermissionDenied


def check_can_edit_object(user, obj):
    if user.is_superuser or getattr(user, 'role', None) == 'ADMIN':
        return True
    if getattr(user, 'role', None) == 'RESPONSIBLE':
        return obj.main_responsible_id == user.id or obj.deputy_responsible_id == user.id
    # Observers have no edit rights
    return False


def ensure_can_edit_object(user, obj):
    if not check_can_edit_object(user, obj):
        raise PermissionDenied("Недостаточно прав для изменения объекта")


def ensure_can_archive(user, obj):
    if user.is_superuser or getattr(user, 'role', None) == 'ADMIN':
        return True
    if getattr(user, 'can_soft_delete', False):
        if obj.main_responsible_id == user.id or obj.deputy_responsible_id == user.id:
            return True
    raise PermissionDenied("Недостаточно прав для архивирования объекта")

