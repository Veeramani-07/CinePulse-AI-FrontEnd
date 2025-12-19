import React, { useState, useEffect } from 'react';
import './App.css';
import * as Icon from "react-icons/bs"; 

const App = () => {
  const [movies, setMovies] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [allReviews, setAllReviews] = useState([]); 
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('cinepulse-auth') === 'true');
  const [creds, setCreds] = useState({ user: localStorage.getItem('cinepulse-user') || '', pass: '' });

  const API_KEY = 'f63c52c1';
  const BACKEND_URL = "http://localhost:5000/api/watchlist";

  const moodMap = {
    "Feeling Low": "Comedy", "Friday Night Party": "Music", "Adventure Seekers": "Adventure",
    "Mind Bending": "Sci-Fi", "Heartbroken": "Romance", "Adrenaline Rush": "Thriller",
    "Deep Thought": "Philosophical", "Family Time": "Animation"
  };

  const moods = ['Feeling Low', 'Friday Night Party', 'Mind Bending', 'Adrenaline Rush', 'Action', 'Tamil', 'Horror', 'Sci-Fi', 'Comedy', 'Romance', 'Crime', 'Sports', 'Thriller', 'Animation', 'Adventure', 'Fantasy', 'History', 'War', 'Music', 'Documentary', 'Mystery', 'Malayalam', 'Telugu', 'Drama', 'Supernatural', 'Biography', 'Western', 'Family', 'Noir', 'Psychological', 'Musical', 'Epic', 'Classic', 'Space', 'Superhero', 'Zombies', 'Spy', 'Cyberpunk', 'Post-Apocalyptic', 'Heist', 'Disaster', 'Survival', 'Vampire', 'Time Travel', 'Slasher', 'Detective', 'Courtroom', 'Political', 'Social', 'Nature', 'Travel', 'Educational', 'Paranormal', 'Psychosis', 'Gothic', 'Satire', 'Mockumentary', 'Slapstick', 'Dark Comedy', 'Coming of Age', 'Road Movie', 'Neo-Noir', 'Steampunk', 'Urban Fantasy', 'Legal Thriller', 'Medical Drama', 'Psychological Thriller', 'Found Footage', 'Monster', 'Martial Arts', 'Sword and Sorcery', 'Period Piece', 'Teen', 'Holiday', 'Silent Film', 'Experimental', 'Surreal', 'Short Film', 'Anime', 'Live Action', 'Indie', 'Cult Classic', 'B-Movie', 'Grindhouse', 'Folklore', 'Mythology', 'Alien', 'AI', 'Robots', 'Virtual Reality', 'Existential', 'Philosophical', 'Faith', 'Inspirational', 'Romantic Comedy', 'Tragedy', 'Melodrama', 'Action Comedy', 'Crime Thriller', 'War Drama', 'Historical Fiction', 'Biographical Drama', 'Sports Drama', 'Erotic'];

  useEffect(() => {
    const getWatchlist = async () => {
      if (isLoggedIn && creds.user) {
        try {
          const res = await fetch(`${BACKEND_URL}/${creds.user}`);
          const data = await res.json();
          // Filter to only show active watchlist items (Soft Delete Logic)
          setWatchlist(data.filter(item => item.watched !== false));
        } catch (err) { console.error("DB Error:", err); }
      }
    };
    getWatchlist();
  }, [isLoggedIn, creds.user]);

  const fetchData = async (p) => {
    setLoading(true);
    try {
      const res = await fetch(`https://www.omdbapi.com/?${p}&apikey=${API_KEY}`);
      const data = await res.json();
      setLoading(false);
      return data;
    } catch (err) { setLoading(false); return { Search: [] }; }
  };

  const suggest = async (m) => { 
    setMood(m); 
    const searchQuery = moodMap[m] || m;
    const d = await fetchData(`s=${searchQuery}`); 
    setMovies(d.Search || []); 
  };
  
  const view = async (id) => {
    const d = await fetchData(`i=${id}&plot=full`);
    const otts = ["Netflix", "Prime Video", "Disney+ Hotstar", "Zee5", "SonyLIV"];
    
    // FETCH REVIEWS: Pulls all feedback for this movie across ALL users
    try {
        const res = await fetch(`${BACKEND_URL}/movie/${id}`);
        const reviews = await res.json();
        setAllReviews(reviews);
    } catch (err) { console.error("Review Fetch Error:", err); setAllReviews([]); }

    setSelected({ 
      ...d, 
      ott: otts[Math.floor(Math.random() * 5)], 
      trailer: `https://www.youtube.com/results?search_query=${encodeURIComponent(d.Title)}+trailer` 
    });
  };

  const addToWatchlist = async (movie) => {
    const item = { ...movie, username: creds.user, userRating: 0, feedback: "", watched: true };
    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      
      if (res.ok) {
        // Refresh local watchlist state after adding
        const updated = await fetch(`${BACKEND_URL}/${creds.user}`).then(r => r.json());
        setWatchlist(updated.filter(i => i.watched !== false));
      } else {
        const err = await res.json();
        alert(err.message || "Error adding movie");
      }
    } catch (err) { alert("Server Error!"); }
  };

  const updateWatchlist = async (id, updates) => {
    setWatchlist(prev => prev.map(x => x.imdbID === id ? { ...x, ...updates } : x));
    try {
      await fetch(`${BACKEND_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, username: creds.user })
      });
    } catch (err) { console.error("Database Save Failed:", err); }
  };

  const removeFromWatchlist = async (id) => {
    try {
      // SOFT DELETE: Marks item as watched:false instead of deleting feedback
      const res = await fetch(`${BACKEND_URL}/${id}/${creds.user}`, { method: 'DELETE' });
      if (res.ok) {
        setWatchlist(watchlist.filter(x => x.imdbID !== id));
      }
    } catch (err) { console.error("Deletion Error:", err); }
  };

  const login = (e) => { 
    e.preventDefault(); 
    if(creds.user && creds.pass) { 
        setIsLoggedIn(true); 
        localStorage.setItem('cinepulse-auth', 'true'); 
        localStorage.setItem('cinepulse-user', creds.user);
    } 
  };

  if (!isLoggedIn) return (
    <div className="login-screen">
      <form className="login-card glass" onSubmit={login}>
        <h1 className="logo-text">🎬 CinePulse AI</h1>
        <div className="input-grp"><Icon.BsPersonFill /><input type="text" placeholder="Username" value={creds.user} onChange={e => setCreds({...creds, user: e.target.value})} /></div>
        <div className="input-grp"><Icon.BsLockFill /><input type="password" placeholder="Password" onChange={e => setCreds({...creds, pass: e.target.value})} /></div>
        <button type="submit" className="login-btn">Explore Cinema</button>
      </form>
    </div>
  );

  return (
    <div className="container">
      {selected ? (
        <div className="details-view">
          <button onClick={() => setSelected(null)} className="back-button rich"><Icon.BsArrowLeftCircle /> Back to Gallery</button>
          <div className="details-card glass">
            <img src={selected.Poster !== "N/A" ? selected.Poster : "https://via.placeholder.com/300x450"} className="details-poster" alt="p" />
            <div className="details-info">
              <h1>{selected.Title} ({selected.Year})</h1>
              <div className="spec-grid">
                <span><b>Director:</b> {selected.Director}</span>
                <span><b>Cast:</b> {selected.Actors}</span>
                <span><b>IMDb Rating:</b> ⭐ {selected.imdbRating}</span>
                <span><b>Box Office:</b> {selected.BoxOffice !== "N/A" ? selected.BoxOffice : "TBA"}</span>
                <span><b>Achievements:</b> {selected.Awards !== "N/A" ? selected.Awards : "N/A"}</span>
                <span><b>Platform:</b> {selected.ott}</span>
              </div>
              <p className="plot"><b>Story:</b> {selected.Plot}</p>
              
              <div className="community-reviews glass">
                <h3>💬 Community Pulse ({allReviews.length})</h3>
                <div className="reviews-list">
                  {allReviews.length > 0 ? allReviews.map((r, i) => (
                    <div key={i} className="review-item">
                      <span className="reviewer-name">@{r.username}</span>
                      <div className="reviewer-stars">{"⭐".repeat(r.userRating || 0)}</div>
                      <p className="reviewer-text">"{r.feedback || "No comment provided"}"</p>
                    </div>
                  )) : <p>No reviews yet. Be the first!</p>}
                </div>
              </div>

              <div className="btn-group">
                <a href={selected.trailer} target="_blank" rel="noreferrer" className="trailer-btn-link"><Icon.BsPlayCircle /> Watch Trailer</a>
                <button onClick={() => addToWatchlist(selected)} className="add-btn-final">+ Add to Watchlist</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <header>
            <div className="header-top"><h1 className="logo-text">🎬 CinePulse AI</h1><button className="logout-btn rich" onClick={() => {setIsLoggedIn(false); localStorage.clear(); window.location.reload();}}>Logout</button></div>
            <div className="mood-grid">{moods.map(m => <button key={m} className={`mood-btn ${mood === m ? 'active' : ''}`} onClick={() => suggest(m)}>{m}</button>)}</div>
            <form className="search-box" onSubmit={(e) => {e.preventDefault(); suggest(query)}}><input placeholder="Search movies..." value={query} onChange={e => setQuery(e.target.value)} /><button type="submit"><Icon.BsSearch /></button></form>
          </header>

          {loading && <div className="loading-spinner">✨ Finding the perfect pulse...</div>}

          <div className="grid">
            {movies.map(m => (
              <div key={m.imdbID} className="card" onClick={() => view(m.imdbID)}>
                <img src={m.Poster !== "N/A" ? m.Poster : "https://via.placeholder.com/300x450"} alt="p" /><div className="card-overlay"><h3>{m.Title}</h3><span className="view-details">Full Specs</span></div>
              </div>
            ))}
          </div>
          <section className="watchlist-section">
            <h2 className="section-title">⭐ Your Watchlist ({watchlist.length})</h2>
            <div className="analytics-bar"><Icon.BsBarChartFill /> Binge Status: {watchlist.length * 2.5} Hours</div>
            <div className="grid">{watchlist.map(m => (
              <div key={m.imdbID} className="card saved glass">
                <img src={m.Poster} alt="p" />
                <div className="user-controls">
                  <div className="star-rating-box">
                    {[1,2,3,4,5].map(s => (
                      <Icon.BsStarFill key={s} onClick={() => updateWatchlist(m.imdbID, { userRating: s })} color={s <= (m.userRating || 0) ? "#f1c40f" : "#444"} />
                    ))}
                  </div>
                  <textarea placeholder="Your review..." value={m.feedback || ""} onChange={(e) => updateWatchlist(m.imdbID, { feedback: e.target.value })} className="feedback-input" />
                </div>
                <button className="remove-btn-final" onClick={() => removeFromWatchlist(m.imdbID)}>Remove</button>
              </div>
            ))}</div>
          </section>
        </>
      )}
    </div>
  );
};

export default App;