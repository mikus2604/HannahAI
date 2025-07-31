from data_collector import DataCollector
from data_extractor import DataExtractor
from data_processor import DataProcessor

def main():
    collector = DataCollector()
    extractor = DataExtractor()
    processor = DataProcessor()

    try:
        collected_data = collector.collect_data()
        extracted_data = extractor.extract_data(collected_data)
        processor.process_data(extracted_data)
        print("Data processing completed successfully.")
    except Exception as e:
        print(f"Failed to extract collected data: {e}")

if __name__ == "__main__":
    main()