from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_jobstore(DjangoJobStore(),"default")
    from apps.notifications.jobs import send_renewal_reminders, send_expiry_notices, send_daily_notice

    scheduler.add_job(
        send_renewal_reminders,
        trigger="cron",
        hour=9,
        minute=0,
        id="send_renewal_reminders",
        replace_existing=True,
    )

    scheduler.add_job(
        send_expiry_notices,
        trigger="cron",
        hour=9,
        minute=0,
        id="send_expiry_notices",
        replace_existing=True,
    )

    scheduler.add_job(
        send_daily_notice,
        trigger = "cron",
        hour = 9,
        minute=0,
        id="send_daily_notice",
        replace_existing=True,
    )

    scheduler.start()