from dataclasses import dataclass
from visitor import Visitor
from appointment import Appointment
from scheduler import Scheduler

@dataclass
class Receptionist:
    scheduler: Scheduler

    def greet_visitor(self, visitor: Visitor) -> str:
        return f"Hello {visitor.name}, welcome to our office!"

    def schedule_appointment(self, visitor: Visitor, time: str) -> str:
        appointment = Appointment(visitor=visitor, time=time)
        self.scheduler.add_appointment(appointment)
        return f"Appointment scheduled for {visitor.name} at {time}."