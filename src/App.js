import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreateBudgetPage from './pages/create-budget';
// Import other pages here

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-budget" element={<CreateBudgetPage />} />
        {/* Add routes for other pages here */}
      </Routes>
    </Router>
  );
};

export default App;