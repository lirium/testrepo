from django import forms
from .models import GuardedObject


class GuardedObjectForm(forms.ModelForm):
    class Meta:
        model = GuardedObject
        fields = ['name', 'address', 'organization', 'equipment', 'main_responsible', 'deputy_responsible', 'notes']

