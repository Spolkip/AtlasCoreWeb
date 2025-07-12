const WikiCategory = require('../models/WikiCategory');
const WikiPage = require('../models/WikiPage');

const buildCategoryTree = (categories) => {
    const map = {};
    const roots = [];

    categories.forEach(category => {
        map[category.id] = { ...category, children: [] };
    });

    categories.forEach(category => {
        if (category.parentId && map[category.parentId]) {
            map[category.parentId].children.push(map[category.id]);
        } else {
            roots.push(map[category.id]);
        }
    });

    return roots;
};


exports.getWikiCategories = async (req, res) => {
  try {
    const categories = await WikiCategory.findAll();
    const categoryTree = buildCategoryTree(categories);
    res.status(200).json({ success: true, categories: categoryTree });
  } catch (error) {
    console.error("Error in getWikiCategories:", error);
    res.status(500).json({ success: false, message: 'Server error fetching wiki categories.' });
  }
};

exports.getWikiPagesByCategory = async (req, res) => {
  try {
    const pages = await WikiPage.findByCategoryId(req.params.categoryId);
    res.status(200).json({ success: true, pages });
  } catch (error) {
    console.error(`Error in getWikiPagesByCategory for category ${req.params.categoryId}:`, error);
    res.status(500).json({ success: false, message: 'Server error fetching wiki pages.' });
  }
};

exports.getWikiPage = async (req, res) => {
    try {
      const page = await WikiPage.findById(req.params.pageId);
      if (!page) return res.status(404).json({ success: false, message: 'Page not found' });
      res.status(200).json({ success: true, page });
    } catch (error) {
      console.error(`Error in getWikiPage for page ${req.params.pageId}:`, error);
      res.status(500).json({ success: false, message: 'Server error fetching wiki page.' });
    }
  };

exports.createWikiCategory = async (req, res) => {
    try {
        const newCategory = new WikiCategory(req.body);
        await newCategory.save();
        res.status(201).json({ success: true, category: newCategory });
    } catch (error) {
        console.error("Error in createWikiCategory:", error);
        res.status(500).json({ success: false, message: 'Server error creating category' });
    }
};

exports.createWikiPage = async (req, res) => {
    try {
        const newPage = new WikiPage(req.body);
        await newPage.save();
        res.status(201).json({ success: true, page: newPage });
    } catch (error) {
        console.error("Error in createWikiPage:", error);
        res.status(500).json({ success: false, message: 'Server error creating page' });
    }
};

exports.updateWikiCategory = async (req, res) => {
    try {
        const category = await WikiCategory.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        
        category.name = req.body.name;
        category.description = req.body.description;
        category.parentId = req.body.parentId || null;
        await category.save();

        res.status(200).json({ success: true, category });
    } catch (error) {
        console.error(`Error in updateWikiCategory for category ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error updating category' });
    }
};

exports.deleteWikiCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const pagesToDelete = await WikiPage.findByCategoryId(categoryId);
        
        const deletePromises = pagesToDelete.map(page => WikiPage.delete(page.id));
        await Promise.all(deletePromises);

        await WikiCategory.delete(categoryId);

        res.status(200).json({ success: true, message: 'Category and its pages deleted' });
    } catch (error) {
        console.error(`Error in deleteWikiCategory for category ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error deleting category' });
    }
};

exports.updateWikiPage = async (req, res) => {
    try {
        const page = await WikiPage.findById(req.params.id);
        if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

        page.title = req.body.title;
        page.content = req.body.content;
        page.categoryId = req.body.categoryId;
        await page.save();

        res.status(200).json({ success: true, page });
    } catch (error) {
        console.error(`Error in updateWikiPage for page ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error updating page' });
    }
};

exports.deleteWikiPage = async (req, res) => {
    try {
        await WikiPage.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Page deleted' });
    } catch (error) {
        console.error(`Error in deleteWikiPage for page ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Server error deleting page' });
    }
};
