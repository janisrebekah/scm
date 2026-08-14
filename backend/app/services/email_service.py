import os
from datetime import datetime, timezone

import resend


def send_email(
    recipient: str,
    subject: str,
    message: str,
) -> dict:
    """
    Send an email notification using Resend.
    """

    api_key = os.getenv("RESEND_API_KEY")

    if not api_key:
        return {
            "status": "FAILED",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "error": "RESEND_API_KEY is not configured",
        }

    from_email = os.getenv(
        "RESEND_FROM_EMAIL",
        "onboarding@resend.dev"
    )

    resend.api_key = api_key

    html_message = message.replace("\n", "<br>")

    try:
        result = resend.Emails.send({
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "html": f"""
                <h2>🚨 Smart Restock Alert</h2>
                <p>{html_message}</p>
            """,
        })

        return {
            "status": "SENT",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "provider_id": getattr(result, "id", None),
        }

    except Exception as exc:
        return {
            "status": "FAILED",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        }