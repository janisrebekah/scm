"""
Mock SMS Provider

Simulates sending SMS messages. Returns SENT or FAILED status.
Replace this module with a real provider (e.g., Twilio) for production.
"""
import random
from datetime import datetime, timezone


# Success rate for the mock provider (90% success by default)
MOCK_SUCCESS_RATE = 0.9


def send_sms(recipient: str, message: str) -> dict:
    """
    Simulate sending an SMS message.

    Args:
        recipient: Phone number or identifier of the recipient
        message: The SMS message body

    Returns:
        dict with:
            - status: "SENT" or "FAILED"
            - sent_at: ISO timestamp if sent, None if failed
            - provider: identifier of the SMS provider
            - error: error message if failed, None if sent
    """
    # Simulate network call with random success/failure
    success = random.random() < MOCK_SUCCESS_RATE

    if success:
        return {
            "status": "SENT",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "provider": "mock_sms",
            "error": None,
        }
    else:
        return {
            "status": "FAILED",
            "sent_at": None,
            "provider": "mock_sms",
            "error": "Mock SMS delivery failed (simulated failure)",
        }
