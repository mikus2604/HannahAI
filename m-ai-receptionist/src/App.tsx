import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Receptionist from './components/Receptionist';

const App: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Receptionist />
      </main>
      <Footer />
    </div>
  );
};

export default App;