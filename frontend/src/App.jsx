import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import OrderForm from './OrderForm';

function App() {
  const [count, setCount] = useState(0);

  return (
    <Router>
      <Routes>
        {/* Default route (original Vite + React content) */}
        <Route
          path="/"
          element={
            <>
              <div className="flex items-center justify-center flex-row min-h-screen bg-red-900">
                <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
                  <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
                  <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
              </div>
              <h1 className="bg-gray-900 text-white">Vite + React</h1>

              <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                  count is {count}
                </button>
                <p>
                  Edit <code>src/App.jsx</code> and save to test HMR
                </p>
                <p>
                  Go to{' '}
                  <a href="/create-order" className="underline text-blue-300">
                    Create Order
                  </a>
                </p>
              </div>
              <p className="read-the-docs">
                Click on the Vite and React logos to learn more
              </p>
            </>
          }
        />

        {/* Route for the Order Form */}
        <Route path="/create-order" element={<OrderForm />} />
      </Routes>
    </Router>
  );
}

export default App;