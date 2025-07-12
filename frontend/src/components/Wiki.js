import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/Wiki.css';

const CategoryListItem = ({ category, onSelectCategory, activeCategoryId, expandedCategories, onToggleExpand, level = 0 }) => {
    const isExpanded = !!expandedCategories[category.id];
    const hasChildren = category.children && category.children.length > 0;

    return (
        <li className="wiki-category-item">
            <div className="category-button-container">
                {hasChildren && (
                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleExpand(category.id); }}>
                        ▶
                    </span>
                )}
                <button 
                    onClick={() => onSelectCategory(category)}
                    className={activeCategoryId === category.id ? 'active' : ''}
                    style={{ paddingLeft: hasChildren ? '0.5rem' : `${1 + level * 1.5}rem`}}
                >
                    {category.name}
                </button>
            </div>
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

const Wiki = ({ user }) => {
    const [categories, setCategories] = useState([]);
    const [pages, setPages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedPage, setSelectedPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/v1/wiki/categories');
                if (data.success) {
                    setCategories(data.categories);
                    if (data.categories.length > 0) {
                        handleCategorySelect(data.categories[0]);
                    }
                }
            } catch (err) {
                setError('Failed to load wiki categories.');
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const handleToggleExpand = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleCategorySelect = async (category) => {
        setSelectedCategory(category);
        setSelectedPage(null);
        setPages([]);
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
    };

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
                    <div className="wiki-page-content">
                        <h1>{selectedPage.title}</h1>
                        <div dangerouslySetInnerHTML={{ __html: selectedPage.content }} />
                    </div>
                ) : (
                    <div>
                        <h2>{selectedCategory ? selectedCategory.name : 'Select a category'}</h2>
                        <p>{selectedCategory ? selectedCategory.description : 'Welcome to the AtlasCore Wiki. Select a category to get started.'}</p>
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