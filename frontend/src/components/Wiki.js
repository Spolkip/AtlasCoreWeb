import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Wiki.css';

// Component for rendering a single category and its children in the sidebar.
const CategoryListItem = ({ category, onSelectCategory, activeCategoryId, expandedCategories, onToggleExpand, level = 0 }) => {
    const isExpanded = !!expandedCategories[category.id];
    const hasChildren = category.children && category.children.length > 0;

    return (
        <li className="wiki-category-item">
            <div className="category-button-container">
                {/* Show expand icon only if there are children */}
                {hasChildren && (
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleExpand(category.id); }}>
                        ▶
                    </span>
                )}
                <button 
                    onClick={() => onSelectCategory(category)}
                    className={activeCategoryId === category.id ? 'active' : ''}
                    // Adjust padding based on level and presence of children
                    style={{ paddingLeft: hasChildren ? '0.5rem' : `${1 + level * 1.5}rem`}}
                >
                    {category.name}
                </button>
            </div>
            {/* Recursively render child categories if the category is expanded */}
            {hasChildren && (
                <ul className={`wiki-subcategory-list ${isExpanded ? 'expanded' : ''}`}>
                    {category.children.map(child => (
                        <CategoryListItem 
                            key={child.id} 
                            category={child} 
                            onSelectCategory={onSelectCategory}
                            activeCategoryId={activeCategoryId}
                            expandedCategories={expandedCategories}
                            onToggleExpand={onToggleExpand}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

// Main Wiki component
const Wiki = ({ user }) => {
    const [categories, setCategories] = useState([]);
    const [pages, setPages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPage, setSelectedPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});

    // Toggles the expanded/collapsed state of a category.
    const handleToggleExpand = useCallback((categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    }, []);

    // Handles selecting a category, fetching its pages, and managing UI state.
    const handleCategorySelect = useCallback(async (category) => {
        setSelectedCategory(category);
        setSelectedPage(null); // Reset page selection
        setPages([]); // Clear previous pages
        
        // If the category has children, expand it.
        if (category.children && category.children.length > 0) {
            handleToggleExpand(category.id);
        }
        
        try {
            const { data } = await axios.get(`http://localhost:5000/api/v1/wiki/pages/by-category/${category.id}`);
            if (data.success) {
                setPages(data.pages);
            }
        } catch (err) {
            setError(`Failed to load pages for ${category.name}.`);
        }
    }, [handleToggleExpand]);

    // Fetch initial category data on component mount.
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('http://localhost:5000/api/v1/wiki/categories');
                if (data.success) {
                    setCategories(data.categories);
                    // Automatically select and expand the first category if it exists.
                    if (data.categories.length > 0) {
                        const firstCategory = data.categories[0];
                        await handleCategorySelect(firstCategory); // Await the selection and page fetch
                        setExpandedCategories(prev => ({ ...prev, [firstCategory.id]: true }));
                    }
                }
            } catch (err) {
                setError('Failed to load wiki categories.');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [handleCategorySelect]);

    // Handles selecting a specific page to view its content.
    const handlePageSelect = (page) => {
        setSelectedPage(page);
    };

    if (loading) {
        return <div className="loading-container">Loading Wiki...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <div className="wiki-container">
            <aside className="wiki-sidebar">
                <h2>Categories</h2>
                <ul className="wiki-category-list">
                    {categories.map(cat => (
                        <CategoryListItem 
                            key={cat.id} 
                            category={cat} 
                            onSelectCategory={handleCategorySelect}
                            activeCategoryId={selectedCategory?.id}
                            expandedCategories={expandedCategories}
                            onToggleExpand={handleToggleExpand}
                        />
                    ))}
                </ul>
            </aside>
            <main className="wiki-main-content">
                {user && user.isAdmin && (
                    <Link to="/admin/wiki" className="admin-wiki-button">
                        Manage Wiki
                    </Link>
                )}
                {selectedPage ? (
                    // Display the content of the selected page
                    <div className="wiki-page-content">
                        <h1>{selectedPage.title}</h1>
                        {/* Render HTML content safely */}
                        <div dangerouslySetInnerHTML={{ __html: selectedPage.content }} />
                    </div>
                ) : (
                    // Display the category description and list of pages
                    <div>
                        <h2>{selectedCategory ? selectedCategory.name : 'Select a category'}</h2>
                        {/* Display category description */}
                        {selectedCategory?.description && (
                            <p className="wiki-category-description">{selectedCategory.description}</p>
                        )}
                        <ul className="wiki-page-list">
                            {pages.map(page => (
                                <li key={page.id} className="wiki-page-item">
                                    <button onClick={() => handlePageSelect(page)}>{page.title}</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Wiki;
