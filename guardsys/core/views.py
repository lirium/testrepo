from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.urls import reverse_lazy
from django.db.models import Q

from .models import GuardedObject, Organization
from guardsys.maintenance.models import MaintenanceEvent
from guardsys.maintenance.models import PeriodicityTemplate
from .forms import GuardedObjectForm
from .permissions import ensure_can_edit_object, ensure_can_archive
from guardsys.documents.views import upload_document  # re-export for url include


class ObjectListView(LoginRequiredMixin, ListView):
    model = GuardedObject
    template_name = 'core/object_list.html'
    context_object_name = 'objects'

    def get_queryset(self):
        qs = (
            GuardedObject.objects.select_related('organization', 'main_responsible', 'deputy_responsible')
            .filter(is_deleted=False)
        )
        search = self.request.GET.get('q')
        filter_my = self.request.GET.get('my')
        filter_overdue = self.request.GET.get('overdue')
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(address__icontains=search)
                | Q(organization__name__icontains=search)
                | Q(notes__icontains=search)
            )
        if filter_my == '1':
            user = self.request.user
            qs = qs.filter(Q(main_responsible=user) | Q(deputy_responsible=user))
        if filter_overdue == '1':
            qs = qs.filter(maintenances__is_overdue=True).distinct()
        return qs


class ObjectDetailView(LoginRequiredMixin, DetailView):
    model = GuardedObject
    template_name = 'core/object_detail.html'
    context_object_name = 'object'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['maintenance'] = MaintenanceEvent.objects.filter(object=self.object).first()
        ctx['documents'] = self.object.documents.all()
        return ctx


class ObjectCreateView(LoginRequiredMixin, CreateView):
    model = GuardedObject
    form_class = GuardedObjectForm
    template_name = 'core/object_form.html'
    success_url = reverse_lazy('object_list')

    def form_valid(self, form):
        response = super().form_valid(form)
        # Create maintenance schedule record based on selected periodicity
        periodicity_id = self.request.POST.get('periodicity_id')
        if periodicity_id:
            pt = PeriodicityTemplate.objects.get(pk=periodicity_id)
            MaintenanceEvent.objects.create(
                object=self.object,
                periodicity=pt,
                last_done_at=None,
                next_due_at=pt.compute_next_date(self.object.created_at.date()),
            )
        return response

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['periodicities'] = PeriodicityTemplate.objects.all()
        return ctx


class ObjectUpdateView(LoginRequiredMixin, UpdateView):
    model = GuardedObject
    form_class = GuardedObjectForm
    template_name = 'core/object_form.html'
    success_url = reverse_lazy('object_list')

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['periodicities'] = PeriodicityTemplate.objects.all()
        return ctx

    def dispatch(self, request, *args, **kwargs):
        obj = self.get_object()
        ensure_can_edit_object(request.user, obj)
        return super().dispatch(request, *args, **kwargs)


@login_required
def object_archive(request, pk):
    obj = get_object_or_404(GuardedObject, pk=pk, is_deleted=False)
    reason = request.POST.get('reason', '')
    ensure_can_archive(request.user, obj)
    obj.archive(reason=reason)
    return redirect('object_detail', pk=pk)


@login_required
def object_restore(request, pk):
    obj = get_object_or_404(GuardedObject, pk=pk, is_deleted=True)
    if request.user.is_superuser:
        obj.restore()
    return redirect('object_detail', pk=pk)


@login_required
def mark_maintenance_done(request, pk):
    obj = get_object_or_404(GuardedObject, pk=pk)
    me = MaintenanceEvent.objects.filter(object=obj).first()
    if me:
        me.mark_done()
    return redirect('object_detail', pk=pk)


# Create your views here.
