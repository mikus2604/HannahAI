class DataExtractor:
    def extract_data(self, collected_data):
        # Extract specific data from the collected data
        try:
            # Assuming we need to extract data from 'source1'
            if 'source1' not in collected_data:
                raise ValueError("Source1 data is missing")
            return collected_data['source1']
        except Exception as e:
            raise RuntimeError(f"Error during data extraction: {e}")