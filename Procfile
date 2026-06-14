web: gunicorn oracle-rex.wsgi:application
# Optional durable worker. Only needed when AI_JOB_BACKEND=django_q; the default
# 'thread' backend runs jobs in-process on the web service.
worker: python manage.py qcluster
