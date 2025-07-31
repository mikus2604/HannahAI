import React, { useState } from 'react';
import DataExtractor from '../components/DataExtractor';

const ExtractPage = ({ transcript }) => {
  const [collectedData, setCollectedData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    message: '',
  });

  const handleExtractedData = (data) => {
    setCollectedData(data);
  };

  return (
    <div>
      <h1>Call Transcript</h1>
      <p>{transcript}</p>

      <h2>Collected Data</h2>
      <div>
        <p>Name: {collectedData.name}</p>
        <p>Phone Number: {collectedData.phoneNumber}</p>
        <p>Email: {collectedData.email}</p>
        <p>Message: {collectedData.message}</p>
      </div>

      {!collectedData.name && !collectedData.phoneNumber && !collectedData.email && !collectedData.message && (
        <DataExtractor transcript={transcript} onExtractedData={handleExtractedData} />
      )}
    </div>
  );
};

export default ExtractPage;