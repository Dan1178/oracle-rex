# Generated by Django 5.1.7 on 2025-03-31 23:34

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='player',
            name='faction',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.faction'),
        ),
    ]
