from django.shortcuts import get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.contrib import messages

from guardsys.core.models import GuardedObject
from .models import Document
from .forms import DocumentForm


@login_required
def upload_document(request, object_id: int):
    obj = get_object_or_404(GuardedObject, pk=object_id)
    if request.method == 'POST':
        form = DocumentForm(request.POST, request.FILES)
        if form.is_valid():
            f = form.cleaned_data['file']
            try:
                Document.objects.create(
                    object=obj,
                    file=f,
                    original_name=f.name,
                    content_type=getattr(f, 'content_type', '') or '',
                )
                messages.success(request, 'Файл загружен')
            except IntegrityError:
                messages.error(request, 'Файл с таким именем уже существует для этого объекта')
    return redirect('object_detail', pk=obj.pk)

from django.shortcuts import render

# Create your views here.
