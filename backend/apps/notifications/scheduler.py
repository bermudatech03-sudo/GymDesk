import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore
from django.conf import settings

logger = logging.getLogger(__name__)

_scheduler = None


def start():
    """
    Start the in-process APScheduler. Idempotent — if already started in this process,
    it's a no-op. Uses Django's TIME_ZONE so cron hour/minute values are interpreted in IST.
    """
    global _scheduler
    if _scheduler is not None:
        logger.info("APScheduler already started in this process — skipping.")
        return

    # Multi-worker guard: only start scheduler in one worker.
    # Set RUN_SCHEDULER=1 on exactly ONE worker (or leave it unset for single-worker dev).
    # If you run multiple gunicorn workers, add `--preload` or set RUN_SCHEDULER on worker 0 only.
    if os.environ.get("RUN_SCHEDULER") == "0":
        logger.info("RUN_SCHEDULER=0 — scheduler disabled in this process.")
        return

    scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
    scheduler.add_jobstore(DjangoJobStore(), "default")

    from apps.notifications.jobs import (
        send_renewal_reminders,
        send_expiry_notices,
        send_daily_notice,
        send_message_for_absentees,
        send_message_for_pt_absentees,
        send_staff_absent_notifications,
        send_diet_notifications,
        retry_failed_notifications,
        send_enquiry_followups,
        run_auto_mark_absent,
    )

    scheduler.add_job(
        send_renewal_reminders,
        trigger="cron", hour=9, minute=0,
        id="send_renewal_reminders", replace_existing=True,
    )

    scheduler.add_job(
        send_expiry_notices,
        trigger="cron", hour=9, minute=0,
        id="send_expiry_notices", replace_existing=True,
    )

    scheduler.add_job(
        send_daily_notice,
        trigger="cron", hour=9, minute=0,
        id="send_daily_notice", replace_existing=True,
    )

    scheduler.add_job(
        send_message_for_absentees,
        trigger="cron", hour=23, minute=30,
        id="send_message_for_absentees", replace_existing=True,
    )

    scheduler.add_job(
        send_message_for_pt_absentees,
        trigger="cron", hour=22, minute=0,
        id="send_message_for_pt_absentees", replace_existing=True,
    )

    scheduler.add_job(
        send_staff_absent_notifications,
        trigger="cron", hour=22, minute=0,
        id="send_staff_absent_notifications", replace_existing=True,
    )

    scheduler.add_job(
        send_diet_notifications,
        trigger="cron", minute="*/5",
        id="send_diet_notifications", replace_existing=True,
    )

    scheduler.add_job(
        retry_failed_notifications,
        trigger="cron", minute="*/30",
        id="retry_failed_notifications", replace_existing=True,
    )

    scheduler.add_job(
        send_enquiry_followups,
        trigger="cron", hour=9, minute=0,
        id="send_enquiry_followups", replace_existing=True,
    )

    # Nightly: backfill attendance rows so calendar reflects absences even if
    # admins never open the calendar page.
    scheduler.add_job(
        run_auto_mark_absent,
        trigger="cron", hour=1, minute=0,
        id="run_auto_mark_absent", replace_existing=True,
    )

    scheduler.start()
    _scheduler = scheduler

    logger.info("APScheduler started (timezone=%s). Registered jobs:", settings.TIME_ZONE)
    for job in scheduler.get_jobs():
        logger.info("  - %s → next run: %s", job.id, job.next_run_time)
