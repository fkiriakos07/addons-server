# Generated by Django 4.2.17 on 2024-12-11 13:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('abuse', '0046_contentdecision_override_of'),
    ]

    operations = [
        migrations.AddField(
            model_name='cinderpolicy',
            name='present_in_cinder',
            field=models.BooleanField(null=True),
        ),
        migrations.AlterField(
            model_name='cinderpolicy',
            name='default_cinder_action',
            field=models.PositiveSmallIntegerField(blank=True, choices=[(1, 'User ban'), (2, 'Add-on disable'), (3, 'Forward add-on to reviewers'), (5, 'Rating delete'), (6, 'Collection delete'), (7, 'Approved (no action)'), (8, 'Add-on version reject'), (9, 'Add-on version delayed reject warning'), (10, 'Approved (new version approval)'), (11, 'Invalid report, so ignored'), (12, 'Content already removed (no action)'), (13, 'Forward add-on to legal')], null=True),
        ),
        migrations.AlterField(
            model_name='contentdecision',
            name='action',
            field=models.PositiveSmallIntegerField(choices=[(1, 'User ban'), (2, 'Add-on disable'), (3, 'Forward add-on to reviewers'), (5, 'Rating delete'), (6, 'Collection delete'), (7, 'Approved (no action)'), (8, 'Add-on version reject'), (9, 'Add-on version delayed reject warning'), (10, 'Approved (new version approval)'), (11, 'Invalid report, so ignored'), (12, 'Content already removed (no action)'), (13, 'Forward add-on to legal')]),
        ),
    ]
