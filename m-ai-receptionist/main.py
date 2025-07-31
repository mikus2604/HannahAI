from receptionist import Receptionist
from visitor import Visitor
from scheduler import Scheduler

def main():
    scheduler = Scheduler()
    receptionist = Receptionist(scheduler=scheduler)

    visitor = Visitor(name="John Doe", contact_info="john.doe@example.com")
    print(receptionist.greet_visitor(visitor))

    appointment_time = "10:00 AM"
    print(receptionist.schedule_appointment(visitor, appointment_time))

    print("Current Appointments:")
    for appointment in scheduler.list_appointments():
        print(f"{appointment.visitor.name} at {appointment.time}")

if __name__ == "__main__":
    main()