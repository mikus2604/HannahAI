from dataclasses import dataclass
from visitor import Visitor

@dataclass
class Appointment:
    visitor: Visitor
    time: str