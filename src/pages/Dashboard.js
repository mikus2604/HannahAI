import React from 'react';
import DataExtractor from '../components/DataExtractor';

const Dashboard = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <DataExtractor />
      {/* Removed the button labeled "Extract Collected Data" */}
      {/* <button>Extract Collected Data</button> */}
    </div>
  );
};

export default Dashboard;