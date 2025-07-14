// frontend/src/components/ProfileSearch.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/ProfileSearch.css';

const ProfileSearch = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (searchTerm.length < 3) {
            setError('Please enter at least 3 characters to search.');
            return;
        }
        setLoading(true);
        setError('');
        setSearched(true);
        try {
            const response = await axios.get(`http://localhost:5000/api/v1/public-profiles/search/${searchTerm}`);
            if (response.data.success) {
                setResults(response.data.users);
            } else {
                setError(response.data.message || 'Search failed.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during the search.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-search-container">
            <h1>Search for a Player</h1>
            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter a username..."
                    className="search-input"
                />
                <button type="submit" className="mc-button primary" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && <p className="search-error">{error}</p>}

            <div className="search-results">
                {loading ? (
                    <p>Loading...</p>
                ) : searched && results.length > 0 ? (
                    results.map(user => (
                        <div key={user.id} className="result-item">
                            <Link to={`/profile/${user.username}`}>{user.username}</Link>
                        </div>
                    ))
                ) : searched ? (
                    <p>No public profiles found with that name.</p>
                ) : (
                    <p>Enter a username to find a player's public profile.</p>
                )}
            </div>
        </div>
    );
};

export default ProfileSearch;
