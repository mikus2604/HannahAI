from dataclasses import dataclass, field
from typing import List
from appointment import Appointment

@dataclass
class Scheduler:
    appointments: List[Appointment] = field(default_factory=list)

    def add_appointment(self, appointment: Appointment) -> None:
        self.appointments.append(appointment)

    def list_appointments(self) -> List[Appointment]:
        return self.appointments