from transcript_parser import TranscriptParser

class CallPage:
    def __init__(self):
        self.collected_data = {}

    def update_collected_data(self, transcript: str):
        # Parse the transcript to extract data
        parser = TranscriptParser()
        self.collected_data = parser.parse_transcript(transcript)

        # Update the UI with the collected data
        self.display_collected_data()

    def display_collected_data(self):
        # This method would update the UI with the collected data
        # For demonstration purposes, we'll just print it
        print("Collected Data:")
        for key, value in self.collected_data.items():
            print(f"{key.capitalize()}: {value if value else 'Not provided'}")