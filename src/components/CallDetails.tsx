import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface CallDetailsProps {
  callId: string;
}

interface CollectedData {
  name: string;
  contactNumber: string;
  email: string;
}

const CallDetails: React.FC<CallDetailsProps> = ({ callId }) => {
  const [collectedData, setCollectedData] = useState<CollectedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCallDetails = async () => {
      try {
        const response = await axios.get(`/api/call-details/${callId}`);
        setCollectedData(response.data);
      } catch (err) {
        setError('Failed to extract collected data');
      }
    };

    fetchCallDetails();
  }, [callId]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!collectedData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Collected Data</h2>
      <p>Name: {collectedData.name}</p>
      <p>Contact Number: {collectedData.contactNumber}</p>
      <p>Email: {collectedData.email}</p>
    </div>
  );
};

export default CallDetails;