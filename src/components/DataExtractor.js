import React, { useState } from 'react';

// Helper function to extract data from transcript
const extractDataFromTranscript = (transcript) => {
  const data = {
    name: null,
    phoneNumber: null,
    email: null,
    message: null,
  };

  if (!transcript || typeof transcript !== "string") {
    console.warn("Transcript is invalid:", transcript);
    return data;
  }

  // Regex patterns
  const namePattern = /(?:name is|I'm|I am)\s+([A-Za-z\s]+)/i;
  const phonePattern = /(?:phone number is|call me at)\s+(\+?\d[\d\s-]{7,}\d)/i;
  const emailPattern = /(?:email is|reach me at)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const messagePattern = /(?:message is|I want to say)\s+(.+)/i;

  const nameMatch = transcript.match(namePattern);
  const phoneMatch = transcript.match(phonePattern);
  const emailMatch = transcript.match(emailPattern);
  const messageMatch = transcript.match(messagePattern);

  if (nameMatch) data.name = nameMatch[1].trim();
  if (phoneMatch) data.phoneNumber = phoneMatch[1].trim();
  if (emailMatch) data.email = emailMatch[1].trim();
  if (messageMatch) data.message = messageMatch[1].trim();

  return data;
};

const DataExtractor = ({ transcript, onExtractedData }) => {
  const [extractedData, setExtractedData] = useState(null);

  const handleExtractData = () => {
    console.log("TRANSCRIPT RECEIVED:", transcript); // Debug

    try {
      const data = extractDataFromTranscript(transcript);
      console.log("EXTRACTED DATA:", data); // Debug

      if (data.name || data.phoneNumber || data.email || data.message) {
        setExtractedData(data);
        if (onExtractedData) {
          onExtractedData(data);
        }
      } else {
        alert("No structured data could be extracted. Please fill manually.");
      }
    } catch (error) {
      console.error("Data extraction failed:", error);
      alert("Failed to extract collected data");
    }
  };

  return (
    <div>
      {!extractedData && (
        <button onClick={handleExtractData}>Extract Collected Data</button>
      )}
    </div>
  );
};

export default DataExtractor;
