import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VoterApp from './components/VoterApp';
import AdminLiveLeaderboard from "./components/AdminLiveLeaderboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VoterApp />} />
        <Route path="/admin-live" element={<AdminLiveLeaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
