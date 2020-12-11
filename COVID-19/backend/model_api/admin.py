from django.contrib import admin
from .models import Area, Covid19DataPoint, Covid19CumulativeDataPoint, Covid19Model, Covid19PredictionDataPoint

# Register your models here.

admin.site.register(Area)
admin.site.register(Covid19DataPoint)
admin.site.register(Covid19CumulativeDataPoint)
admin.site.register(Covid19Model)
admin.site.register(Covid19PredictionDataPoint)
