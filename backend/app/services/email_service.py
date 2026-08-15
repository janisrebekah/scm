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

    # Build the reorder management link
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reorder_link = f"{frontend_url}?page=reorder"

    try:
        result = resend.Emails.send({
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "html": f"""
                <h2>&#x1F6A8; Smart Restock Alert</h2>
                <p>{html_message}</p>
                <br>
                <a href="{reorder_link}"
                   style="display:inline-block;padding:12px 28px;
                          background-color:#7c5cfc;color:#ffffff;
                          text-decoration:none;border-radius:6px;
                          font-weight:600;font-size:14px;">
                    Review Reorder
                </a>
                <br><br>
                <p style="font-size:12px;color:#888;">
                    This button takes you to the Reorder Management page
                    where you can review, edit, and complete the reorder.
                </p>
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