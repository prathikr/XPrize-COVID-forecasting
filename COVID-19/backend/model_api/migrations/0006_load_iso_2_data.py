# Generated by Django 3.0.4 on 2020-03-31 18:36

from django.db import migrations
import csv

ISO_2_CSV_PATH = "../data/iso_mapping.csv"


def load_iso_2_data(apps, schema_editor):
    Area = apps.get_model('model_api', 'Area')

    with open(ISO_2_CSV_PATH) as f:
        reader = csv.reader(f)

        # Skip header.
        next(reader, None)

        for row in reader:
            state = row[0]
            country = row[1]
            iso_2 = row[2]

            try:
                a = Area.objects.get(state=state, country=country)
                a.iso_2 = iso_2
                a.save()
            except Area.DoesNotExist:
                pass


def clear_iso_2_data(apps, schema_editor):
    Area = apps.get_model('model_api', 'Area')
    for a in Area.objects.all():
        a.iso_2 = ""
        a.save()


class Migration(migrations.Migration):

    dependencies = [
        ('model_api', '0005_area_iso_2'),
    ]

    operations = [
        migrations.RunPython(load_iso_2_data, clear_iso_2_data),
    ]
