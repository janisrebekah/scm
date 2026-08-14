from twilio.rest import Client
from app.config import settings


def send_sms(recipient: str, message: str) -> dict:
    """Send an SMS using Twilio."""

    if not settings.twilio_account_sid:
        raise RuntimeError("TWILIO_ACCOUNT_SID is not configured")

    if not settings.twilio_auth_token:
        raise RuntimeError("TWILIO_AUTH_TOKEN is not configured")

    if not settings.twilio_phone_number:
        raise RuntimeError("TWILIO_PHONE_NUMBER is not configured")

    client = Client(
        settings.twilio_account_sid,
        settings.twilio_auth_token
    )

    twilio_message = client.messages.create(
        body=message,
        from_=settings.twilio_phone_number,
        to=recipient,
    )

    return {
        "success": True,
        "provider": "twilio",
        "status": twilio_message.status,
        "message_sid": twilio_message.sid,
        "to": recipient,
    }