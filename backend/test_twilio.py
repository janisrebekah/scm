from app.services.twilio_provider import send_sms
from app.config import settings


result = send_sms(
    settings.alert_phone_number,
    "Smart Restock test: Twilio SMS integration is working."
)

print(result)