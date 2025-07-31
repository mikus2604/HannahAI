import re
from dataclasses import dataclass
from typing import Optional, Dict

@dataclass
class CallData:
    name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None

class TranscriptParser:
    @staticmethod
    def parse_transcript(transcript: str) -> Dict[str, Optional[str]]:
        # Regular expressions for extracting phone numbers and emails
        phone_regex = r'\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b'
        email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'

        # Extract phone numbers and emails
        phone_numbers = re.findall(phone_regex, transcript)
        emails = re.findall(email_regex, transcript)

        # Extract name (assuming the first word in the transcript is the name)
        name = transcript.split()[0] if transcript else None

        # Create CallData object
        call_data = CallData(
            name=name,
            phone_number=phone_numbers[0] if phone_numbers else None,
            email=emails[0] if emails else None
        )

        return call_data.__dict__