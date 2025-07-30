import React, { useState, useContext } from 'react';
import YouTubeList from './components/YouTubeList';
import './App.css';
import { ThemeContext } from './main';

function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState([]);
  const { theme, setTheme } = useContext(ThemeContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setVideos([]);
    try {
      const res = await fetch('http://localhost:4000/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });
      if (!res.ok) throw new Error('Failed to fetch video info');
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container theme-${theme}`}>
      <div style={{ marginBottom: 18, textAlign: 'right', width: '100%' }}>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
      </div>
      <h1>YouTube to MP3 Downloader</h1>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          placeholder="Paste YouTube video or playlist link"
          value={input}
          onChange={e => setInput(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>Fetch</button>
      </form>
      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading...</div>}
      {videos.length > 0 && <YouTubeList videos={videos} />}
    </div>
  );
}

export default App;
