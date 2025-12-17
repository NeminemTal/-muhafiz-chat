import React from 'react';
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <div className="min-h-screen bg-transparent">
      {/* 
        The main app container is transparent because this is intended 
        to be embedded on top of an existing Webflow site.
      */}
      <ChatWidget />
    </div>
  );
}

export default App;
