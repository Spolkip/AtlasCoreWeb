import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../css/AdminWiki.css';

const RichTextEditor = ({ value, onChange }) => {
    const textareaRef = useRef(null);

    const applyTag = (tag) => {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const newText = `${value.substring(0, start)}<${tag}>${selectedText}</${tag}>${value.substring(end)}`;
        onChange({ target: { name: 'content', value: newText } });
    };

    return (
        <div className="editor-container">
            <div className="editor-toolbar">
                <button type="button" onClick={() => applyTag('b')}><b>B</b></button>
                <button type="button" onClick={() => applyTag('i')}><i>I</i></button>
                <button type="button" onClick={() => applyTag('u')}><u>U</u></button>
            </div>
            <textarea ref={textareaRef} name="content" value={value} onChange={onChange} placeholder="Page content (HTML allowed)"></textarea>
        </div>
    );
};


const AdminWiki = () => {
    const [categories, setCategories] = useState([]);
    const [pages, setPages] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    
    const [newCategory, setNewCategory] = useState({ name: '', description: '', parentId: '' });
    const [newPage, setNewPage] = useState({ title: '', content: '', categoryId: '' });
    
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingPage, setEditingPage] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const fetchData = async () => {
        setLoading(true);
        clearMessages();
        try {
            const catResponse = await axios.get('http://localhost:5000/api/v1/wiki/categories', config);
            if (catResponse.data.success) {
                const flattenCategories = (cats, level = 0) => {
                    let flat = [];
                    cats.forEach(cat => {
                        flat.push({id: cat.id, name: `${'--'.repeat(level)} ${cat.name}`, originalName: cat.name, description: cat.description, parentId: cat.parentId});
                        if (cat.children && cat.children.length > 0) {
                            flat = flat.concat(flattenCategories(cat.children, level + 1));
                        }
                    });
                    return flat;
                }
                const flatCats = flattenCategories(catResponse.data.categories);
                setCategories(flatCats);

                if (flatCats.length > 0 && !newPage.categoryId) {
                    setNewPage(p => ({ ...p, categoryId: flatCats[0].id }));
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load wiki categories.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSelectCategory = async (category) => {
        clearMessages();
        setSelectedCategory(category);
        setNewPage(p => ({ ...p, categoryId: category.id }));
        setEditingPage(null);
        try {
            const pagesResponse = await axios.get(`http://localhost:5000/api/v1/wiki/pages/by-category/${category.id}`, config);
            if (pagesResponse.data.success) {
                setPages(pagesResponse.data.pages);
            }
        } catch (err) {
            setError(`Failed to load pages for ${category.name}.`);
            setPages([]);
        }
    };

    const handleInputChange = (setter, field) => (e) => {
        setter(prev => ({ ...prev, [field]: e.target.value }));
    };
    
    const handleEditorChange = (setter, field) => (e) => {
        setter(prev => ({ ...prev, [field]: e.target.value }));
    };

    // --- Category CRUD ---
    const handleAddCategory = async (e) => {
        e.preventDefault();
        clearMessages();
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/wiki/categories', newCategory, config);
            if (data.success) {
                fetchData();
                setNewCategory({ name: '', description: '', parentId: '' });
                setSuccess('Category added successfully.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add category.');
        }
    };

    const handleUpdateCategory = async (e) => {
        e.preventDefault();
        clearMessages();
        try {
            const categoryToUpdate = {
                name: editingCategory.name,
                description: editingCategory.description,
                parentId: editingCategory.parentId || null
            };
            await axios.put(`http://localhost:5000/api/v1/wiki/categories/${editingCategory.id}`, categoryToUpdate, config);
            fetchData();
            setEditingCategory(null);
            setSuccess('Category updated successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update category.');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (window.confirm('Are you sure? Deleting a category will also delete all its pages.')) {
            clearMessages();
            try {
                await axios.delete(`http://localhost:5000/api/v1/wiki/categories/${categoryId}`, config);
                fetchData();
                if (selectedCategory?.id === categoryId) {
                    setSelectedCategory(null);
                    setPages([]);
                }
                setSuccess('Category deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete category.');
            }
        }
    };

    // --- Page CRUD ---
    const handleAddPage = async (e) => {
        e.preventDefault();
        clearMessages();
        try {
            const { data } = await axios.post('http://localhost:5000/api/v1/wiki/pages', newPage, config);
            if (data.success) {
                setPages([...pages, data.page]);
                setNewPage({ title: '', content: '', categoryId: newPage.categoryId });
                setSuccess('Page added successfully.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add page.');
        }
    };

    const handleUpdatePage = async (e) => {
        e.preventDefault();
        clearMessages();
        try {
            await axios.put(`http://localhost:5000/api/v1/wiki/pages/${editingPage.id}`, editingPage, config);
            setPages(pages.map(p => p.id === editingPage.id ? editingPage : p));
            setEditingPage(null);
            setSuccess('Page updated successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update page.');
        }
    };

    const handleDeletePage = async (pageId) => {
        if (window.confirm('Are you sure you want to delete this page?')) {
            clearMessages();
            try {
                await axios.delete(`http://localhost:5000/api/v1/wiki/pages/${pageId}`, config);
                setPages(pages.filter(p => p.id !== pageId));
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
                        <input type="text" name="description" value={newCategory.description} onChange={handleInputChange(setNewCategory, 'description')} placeholder="Category Description" />
                        <select name="parentId" value={newCategory.parentId} onChange={handleInputChange(setNewCategory, 'parentId')}>
                            <option value="">None (Top Level)</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button type="submit" className="mc-button primary">Add Category</button>
                    </form>
                    <div className="admin-wiki-list">
                        {categories.map(cat => (
                            <div key={cat.id} className={`admin-wiki-list-item ${selectedCategory?.id === cat.id ? 'selected' : ''}`}>
                                {editingCategory?.id === cat.id ? (
                                    <form onSubmit={handleUpdateCategory} className="edit-form-inline">
                                        <input type="text" value={editingCategory.name} onChange={handleInputChange(setEditingCategory, 'name')} />
                                        <select name="parentId" value={editingCategory.parentId || ''} onChange={handleInputChange(setEditingCategory, 'parentId')}>
                                            <option value="">None (Top Level)</option>
                                            {categories.filter(c => c.id !== cat.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button type="submit" className="mc-button small">Save</button>
                                        <button type="button" onClick={() => setEditingCategory(null)} className="mc-button small danger">Cancel</button>
                                    </form>
                                ) : (
                                    <>
                                        <span onClick={() => handleSelectCategory(cat)}>{cat.name}</span>
                                        <div className="admin-wiki-actions">
                                            <button onClick={() => setEditingCategory({...cat, name: cat.originalName})} className="mc-button small">Edit</button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="mc-button small danger">Delete</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-wiki-section">
                    <h2>Pages {selectedCategory && `in ${selectedCategory.originalName}`}</h2>
                    {selectedCategory ? (
                        <>
                            <form onSubmit={handleAddPage} className="admin-wiki-form">
                                <input type="text" name="title" value={newPage.title} onChange={handleInputChange(setNewPage, 'title')} placeholder="New Page Title" required />
                                <RichTextEditor value={newPage.content} onChange={handleEditorChange(setNewPage, 'content')} />
                                <button type="submit" className="mc-button primary">Add Page</button>
                            </form>
                             <div className="admin-wiki-list">
                                {pages.map(page => (
                                     <div key={page.id} className="admin-wiki-list-item">
                                         {editingPage?.id === page.id ? (
                                             <form onSubmit={handleUpdatePage} className="edit-form-inline">
                                                 <input type="text" value={editingPage.title} onChange={handleInputChange(setEditingPage, 'title')} />
                                                 <RichTextEditor value={editingPage.content} onChange={handleEditorChange(setEditingPage, 'content')} />
                                                 <button type="submit" className="mc-button small">Save</button>
                                                 <button type="button" onClick={() => setEditingPage(null)} className="mc-button small danger">Cancel</button>
                                             </form>
                                         ) : (
                                             <>
                                                <span>{page.title}</span>
                                                <div className="admin-wiki-actions">
                                                    <button onClick={() => setEditingPage(page)} className="mc-button small">Edit</button>
                                                    <button onClick={() => handleDeletePage(page.id)} className="mc-button small danger">Delete</button>
                                                </div>
                                             </>
                                         )}
                                     </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p>Select a category to manage its pages.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminWiki;