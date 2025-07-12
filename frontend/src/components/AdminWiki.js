import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import '../css/AdminWiki.css';

/**
 * A rich-text editor component with buttons for common HTML formatting.
 * It allows admins to easily style wiki page content.
 * @param {object} props - The component props.
 * @param {string} props.value - The current HTML content of the editor.
 * @param {function} props.onChange - The callback function to call when the content changes.
 * @param {Array} props.pages - A list of available pages for linking.
 */
const RichTextEditor = ({ value, onChange, pages }) => {
    const textareaRef = useRef(null);
    const [showPageLinker, setShowPageLinker] = useState(false);

    const applyTag = (tag, isBlock = false) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const lineBreak = isBlock ? '\n' : '';
        
        const newText = `${value.substring(0, start)}${lineBreak}<${tag}>${selectedText}</${tag}>${lineBreak}${value.substring(end)}`;
        
        if (onChange) {
            onChange({ target: { name: 'content', value: newText } });
        }
    };
    
    const applyList = (listTag) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const lines = selectedText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        const listItems = lines.map(line => `  <li>${line.trim()}</li>`).join('\n');
        const listHtml = `\n<${listTag}>\n${listItems}\n</${listTag}>\n`;
        
        const newText = `${value.substring(0, start)}${listHtml}${value.substring(end)}`;
        if (onChange) {
            onChange({ target: { name: 'content', value: newText } });
        }
    };

    const insertTag = (tag) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const newText = `${value.substring(0, start)}\n${tag}\n${value.substring(start)}`;
        if (onChange) {
            onChange({ target: { name: 'content', value: newText } });
        }
    };

    const applyLink = () => {
        const url = prompt('Enter the URL:', 'https://');
        if (!url) return;

        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end) || 'link text';
        
        const newText = `${value.substring(0, start)}<a href="${url}" target="_blank">${selectedText}</a>${value.substring(end)}`;
        if (onChange) {
            onChange({ target: { name: 'content', value: newText } });
        }
    };

    const linkPage = (pageId) => {
        const selectedPage = pages.find(p => p.id === pageId);
        if (!selectedPage) return;

        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end) || selectedPage.title;
        
        const newText = `${value.substring(0, start)}<a href="/wiki/page/${selectedPage.id}">${selectedText}</a>${value.substring(end)}`;
        if (onChange) {
            onChange({ target: { name: 'content', value: newText } });
        }
        setShowPageLinker(false);
    };

    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <button type="button" title="Bold" onClick={() => applyTag('b')}><b>B</b></button>
                <button type="button" title="Italic" onClick={() => applyTag('i')}><i>I</i></button>
                <button type="button" title="Underline" onClick={() => applyTag('u')}><u>U</u></button>
                <div className="toolbar-divider"></div>
                <button type="button" title="Heading 2" onClick={() => applyTag('h2', true)}>H2</button>
                <button type="button" title="Heading 3" onClick={() => applyTag('h3', true)}>H3</button>
                <button type="button" title="Paragraph" onClick={() => applyTag('p', true)}>P</button>
                <div className="toolbar-divider"></div>
                <button type="button" title="Unordered List" onClick={() => applyList('ul')}>UL</button>
                <button type="button" title="Ordered List" onClick={() => applyList('ol')}>OL</button>
                <div className="toolbar-divider"></div>
                <button type="button" title="Horizontal Rule" onClick={() => insertTag('<hr />')}>HR</button>
                <button type="button" title="Link" onClick={applyLink}>Link</button>
                <div className="page-linker-container">
                    <button type="button" title="Link to Page" onClick={() => setShowPageLinker(!showPageLinker)}>Link Page</button>
                    {showPageLinker && (
                        <div className="page-linker-dropdown">
                            {pages.length > 0 ? pages.map(page => (
                                <div key={page.id} onClick={() => linkPage(page.id)} className="page-linker-item">
                                    {page.title}
                                </div>
                            )) : <div className="page-linker-item">No pages to link.</div>}
                        </div>
                    )}
                </div>
            </div>
            <textarea 
                ref={textareaRef} 
                name="content" 
                value={value} 
                onChange={onChange} 
                placeholder="Page content (HTML is allowed for formatting)"
                rows="20"
            />
        </div>
    );
};


const AdminWiki = () => {
    const [categories, setCategories] = useState([]);
    const [allPages, setAllPages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingPage, setEditingPage] = useState(null);
    
    const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });
    
    const [activeTab, setActiveTab] = useState('content');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchData = useCallback(() => {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        setLoading(true);
        setError('');
        setSuccess('');

        Promise.all([
            axios.get('http://localhost:5000/api/v1/wiki/categories', config),
            axios.get('http://localhost:5000/api/v1/wiki/pages/by-category/all', config)
        ]).then(([catResponse, pageResponse]) => {
            if (catResponse.data.success) {
                const flattenCategories = (cats, level = 0) => {
                    let flat = [];
                    cats.forEach(cat => {
                        flat.push({ ...cat, name: `${'--'.repeat(level)} ${cat.name}`, originalName: cat.name });
                        if (cat.children && cat.children.length > 0) {
                            flat = flat.concat(flattenCategories(cat.children, level + 1));
                        }
                    });
                    return flat;
                }
                setCategories(flattenCategories(catResponse.data.categories));
            }
            if (pageResponse.data.success) {
                setAllPages(pageResponse.data.pages);
            }
        }).catch(err => {
            setError(err.response?.data?.message || 'Failed to load wiki data.');
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectCategory = (category) => {
        setSuccess('');
        setError('');
        setSelectedCategory(category);
        setEditingCategory({ ...category });
        setEditingPage(null);
        setActiveTab('content');
    };

    const handleSelectPageForEditing = (page) => {
        setEditingPage(page);
        setActiveTab('pages');
    };

    const handleInputChange = (setter, field) => (e) => {
        setter(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleEditorChange = (e) => {
        const { name, value } = e.target;
        if (activeTab === 'content' && editingCategory) {
            setEditingCategory(prev => ({ ...prev, [name]: value }));
        } else if (activeTab === 'pages' && editingPage) {
            setEditingPage(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.post('http://localhost:5000/api/v1/wiki/categories', { ...newCategory, content: '' }, config);
            fetchData();
            setNewCategory({ name: '', description: '', parentId: '' });
            setSuccess('Category added successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add category.');
        }
    };

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.put(`http://localhost:5000/api/v1/wiki/categories/${editingCategory.id}`, editingCategory, config);
            fetchData();
            setSuccess('Category content saved successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save category.');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Are you sure? Deleting a category will also delete its pages.')) {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/wiki/categories/${categoryId}`, config);
                fetchData();
                setSelectedCategory(null);
                setEditingCategory(null);
                setSuccess('Category deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete category.');
            }
        }
    };

    const handleSavePage = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const pageToSave = {
            title: editingPage.title,
            content: editingPage.content,
            categoryId: 'uncategorized'
        };

        try {
            if (editingPage.id) {
                await axios.put(`http://localhost:5000/api/v1/wiki/pages/${editingPage.id}`, pageToSave, config);
                setSuccess('Page updated successfully.');
            } else {
                await axios.post('http://localhost:5000/api/v1/wiki/pages', pageToSave, config);
                setSuccess('Page created successfully.');
            }
            fetchData();
            setEditingPage(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save page.');
        }
    };

    const handleDeletePage = async (pageId) => {
        if (window.confirm('Are you sure you want to delete this page?')) {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            try {
                await axios.delete(`http://localhost:5000/api/v1/wiki/pages/${pageId}`, config);
                fetchData();
                if(editingPage?.id === pageId) setEditingPage(null);
                setSuccess('Page deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete page.');
            }
        }
    };

    if (loading) return <div className="loading-container">Loading Wiki Management...</div>;

    return (
        <div className="admin-wiki-container">
            <h1>Manage Wiki</h1>
            {error && <div className="auth-error-message">{error}</div>}
            {success && <div className="auth-success-message">{success}</div>}

            <div className="admin-wiki-grid">
                <div className="admin-wiki-section">
                    <h2>Categories</h2>
                    <form onSubmit={handleAddCategory} className="admin-wiki-form">
                        <input type="text" name="name" value={newCategory.name} onChange={handleInputChange(setNewCategory, 'name')} placeholder="New Category Name" required />
                        <select name="parentId" value={newCategory.parentId} onChange={handleInputChange(setNewCategory, 'parentId')}>
                            <option value="">None (Top Level)</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button type="submit" className="mc-button primary">Add Category</button>
                    </form>
                    <div className="admin-wiki-list">
                        {categories.map(cat => (
                            <div key={cat.id} className={`admin-wiki-list-item ${selectedCategory?.id === cat.id ? 'selected' : ''}`} onClick={() => handleSelectCategory(cat)}>
                                <span>{cat.name}</span>
                                <div className="admin-wiki-actions">
                                    <button onClick={(e) => {e.stopPropagation(); handleDeleteCategory(cat.id)}} className="mc-button small danger">Del</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-wiki-section">
                    {selectedCategory ? (
                        <>
                            <div className="editor-tabs">
                                <button className={`tab-button ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>Edit Category Content</button>
                                <button className={`tab-button ${activeTab === 'pages' ? 'active' : ''}`} onClick={() => setActiveTab('pages')}>Manage Linkable Pages</button>
                            </div>

                            {activeTab === 'content' && editingCategory && (
                                <form onSubmit={handleSaveCategory} className="admin-wiki-form">
                                    <h3>Editing Content for: {editingCategory.originalName}</h3>
                                    <input type="text" value={editingCategory.name} onChange={handleInputChange(setEditingCategory, 'name')} placeholder="Category Name" />
                                    <input type="text" value={editingCategory.description || ''} onChange={handleInputChange(setEditingCategory, 'description')} placeholder="Category Description" />
                                    <RichTextEditor value={editingCategory.content || ''} onChange={handleEditorChange} pages={allPages} />
                                    <button type="submit" className="mc-button primary">Save Category Content</button>
                                </form>
                            )}

                            {activeTab === 'pages' && (
                                <div>
                                    {editingPage ? (
                                        <form onSubmit={handleSavePage} className="admin-wiki-form">
                                            <h3>Editing Page: {editingPage.id ? editingPage.title : 'New Page'}</h3>
                                            <input type="text" name="title" value={editingPage.title} onChange={handleInputChange(setEditingPage, 'title')} required />
                                            <RichTextEditor value={editingPage.content || ''} onChange={(e) => setEditingPage(p => ({...p, content: e.target.value}))} pages={allPages} />
                                            <div className="admin-wiki-actions">
                                                <button type="submit" className="mc-button primary">Save Page</button>
                                                <button type="button" onClick={() => setEditingPage(null)} className="mc-button danger">Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <h3>Manage Linkable Pages</h3>
                                            <button onClick={() => setEditingPage({ title: '', content: '' })} className="mc-button primary" style={{marginBottom: '1rem'}}>Create New Page</button>
                                            <div className="admin-wiki-list">
                                                {allPages.length > 0 ? allPages.map(page => (
                                                    <div key={page.id} className="admin-wiki-list-item">
                                                        <span className="page-title" onClick={() => handleSelectPageForEditing(page)}>{page.title}</span>
                                                        <div className="admin-wiki-actions">
                                                            <button onClick={() => handleDeletePage(page.id)} className="mc-button small danger">Delete</button>
                                                        </div>
                                                    </div>
                                                )) : <p>No pages created yet.</p>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <h2>Select a category to begin editing.</h2>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminWiki;
