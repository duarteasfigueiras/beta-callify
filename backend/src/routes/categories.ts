import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { isDeveloper } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Predefined colors for categories
// - bg/text: pastel colors for badges (subtle)
// - preview: vibrant colors for the color picker modal
const PREDEFINED_COLORS = [
  { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-800', darkBg: 'dark:bg-blue-900', darkText: 'dark:text-blue-200', preview: 'bg-blue-500' },
  { id: 'green', bg: 'bg-green-100', text: 'text-green-800', darkBg: 'dark:bg-green-900', darkText: 'dark:text-green-200', preview: 'bg-green-500' },
  { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-800', darkBg: 'dark:bg-purple-900', darkText: 'dark:text-purple-200', preview: 'bg-purple-500' },
  { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-800', darkBg: 'dark:bg-orange-900', darkText: 'dark:text-orange-200', preview: 'bg-orange-500' },
  { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-800', darkBg: 'dark:bg-pink-900', darkText: 'dark:text-pink-200', preview: 'bg-pink-500' },
  { id: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800', darkBg: 'dark:bg-yellow-900', darkText: 'dark:text-yellow-200', preview: 'bg-yellow-500' },
  { id: 'red', bg: 'bg-red-100', text: 'text-red-800', darkBg: 'dark:bg-red-900', darkText: 'dark:text-red-200', preview: 'bg-red-500' },
  { id: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-800', darkBg: 'dark:bg-indigo-900', darkText: 'dark:text-indigo-200', preview: 'bg-indigo-500' },
  { id: 'teal', bg: 'bg-teal-100', text: 'text-teal-800', darkBg: 'dark:bg-teal-900', darkText: 'dark:text-teal-200', preview: 'bg-teal-500' },
  { id: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-800', darkBg: 'dark:bg-cyan-900', darkText: 'dark:text-cyan-200', preview: 'bg-cyan-500' },
  { id: 'lime', bg: 'bg-lime-100', text: 'text-lime-800', darkBg: 'dark:bg-lime-900', darkText: 'dark:text-lime-200', preview: 'bg-lime-500' },
  { id: 'amber', bg: 'bg-amber-100', text: 'text-amber-800', darkBg: 'dark:bg-amber-900', darkText: 'dark:text-amber-200', preview: 'bg-amber-500' },
  { id: 'violet', bg: 'bg-violet-100', text: 'text-violet-800', darkBg: 'dark:bg-violet-900', darkText: 'dark:text-violet-200', preview: 'bg-violet-500' },
  { id: 'rose', bg: 'bg-rose-100', text: 'text-rose-800', darkBg: 'dark:bg-rose-900', darkText: 'dark:text-rose-200', preview: 'bg-rose-500' },
  { id: 'gray', bg: 'bg-gray-100', text: 'text-gray-800', darkBg: 'dark:bg-gray-700', darkText: 'dark:text-gray-200', preview: 'bg-gray-500' },
];

// No built-in categories - all categories are created dynamically

// Helper to normalize category key
const normalizeKey = (name: string): string => {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Get color classes for a color_id
const getColorClasses = (colorId: string): string => {
  const color = PREDEFINED_COLORS.find(c => c.id === colorId) || PREDEFINED_COLORS[0];
  return `${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`;
};

// Get all categories for a company (combines category_metadata table + users' custom_role_name)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { company_id } = req.query;

    let companyId = req.user!.companyId;
    if (isDeveloper(req.user!.role) && company_id) {
      companyId = Number(company_id);
    }

    const categoriesMap = new Map<string, { key: string; name: string; color_id: string; color_classes: string; is_builtin: boolean }>();

    // 1. Get categories from category_metadata table (these have priority for colors)
    let metadataQuery = supabase
      .from('category_metadata')
      .select('*')
      .order('name', { ascending: true });

    if (companyId) {
      metadataQuery = metadataQuery.eq('company_id', companyId);
    }

    const { data: categoryData, error: metadataError } = await metadataQuery;

    if (!metadataError && categoryData) {
      for (const cat of categoryData) {
        categoriesMap.set(cat.key, {
          key: cat.key,
          name: cat.name,
          color_id: cat.color_id,
          color_classes: getColorClasses(cat.color_id),
          is_builtin: false
        });
      }
    }

    // 2. Get unique categories from users' custom_role_name (add those not already in metadata)
    let usersQuery = supabase
      .from('users')
      .select('custom_role_name')
      .not('custom_role_name', 'is', null);

    if (companyId) {
      usersQuery = usersQuery.eq('company_id', companyId);
    }

    const { data: usersData, error: usersError } = await usersQuery;

    if (!usersError && usersData) {
      const uniqueUserCategories = [...new Set(usersData.map(u => u.custom_role_name).filter(Boolean))];
      let colorIndex = categoriesMap.size; // Start from where metadata left off

      for (const name of uniqueUserCategories) {
        const key = normalizeKey(name);
        // Only add if not already in metadata
        if (!categoriesMap.has(key)) {
          const colorId = PREDEFINED_COLORS[colorIndex % PREDEFINED_COLORS.length].id;
          categoriesMap.set(key, {
            key,
            name,
            color_id: colorId,
            color_classes: getColorClasses(colorId),
            is_builtin: false
          });
          colorIndex++;
        }
      }
    }

    // Convert map to array and sort by name
    const categories = Array.from(categoriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get available colors
router.get('/colors', async (_req: AuthenticatedRequest, res: Response) => {
  res.json(PREDEFINED_COLORS);
});

// Create a new category (saves to category_metadata)
router.post('/', requireRole('admin_manager', 'developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, color_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const cleanName = name.trim();
    const key = normalizeKey(cleanName);

    // Get company_id (for developer, use provided or fail)
    let companyId = req.user!.companyId;
    if (isDeveloper(req.user!.role)) {
      companyId = req.body.company_id || companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'company_id is required for developer' });
      }
    }

    // Check if category with same key already exists in metadata
    const { data: existing } = await supabase
      .from('category_metadata')
      .select('id')
      .eq('company_id', companyId)
      .eq('key', key)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    // Validate color
    const colorData = PREDEFINED_COLORS.find(c => c.id === color_id) || PREDEFINED_COLORS[0];

    // Save category metadata (with color)
    const { error: metadataError } = await supabase.from('category_metadata').insert({
      company_id: companyId,
      key: key,
      name: cleanName,
      color_id: colorData.id
    });

    if (metadataError) {
      console.error('Error creating category metadata:', metadataError);
      throw metadataError;
    }

    console.log(`Created category "${key}" with color "${colorData.id}" in company ${companyId}`);

    res.status(201).json({
      key: key,
      name: cleanName,
      color_id: colorData.id,
      color_classes: getColorClasses(colorData.id),
      is_builtin: false
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category (rename and/or change color)
router.put('/:key', requireRole('admin_manager', 'developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const oldKey = req.params.key;
    const { name, color_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Get company_id - only developers can override, and must be a valid number
    let companyId = req.user!.companyId;
    if (isDeveloper(req.user!.role) && req.body.company_id) {
      companyId = Number(req.body.company_id);
      if (isNaN(companyId) || companyId <= 0) {
        return res.status(400).json({ error: 'Invalid company_id' });
      }
    }

    if (!companyId) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    const cleanName = name.trim();
    const newKey = normalizeKey(cleanName);

    // Check if the old category exists in metadata
    const { data: existingMetadata } = await supabase
      .from('category_metadata')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('key', oldKey)
      .limit(1);

    // If category doesn't exist in metadata, it might have been created from user custom_role_name
    // In this case, we need to create the metadata entry first
    let categoryExistsInMetadata = existingMetadata && existingMetadata.length > 0;

    if (!categoryExistsInMetadata) {
      // Check if category exists via users' custom_role_name
      const { data: usersWithCategory } = await supabase
        .from('users')
        .select('custom_role_name')
        .eq('company_id', companyId)
        .not('custom_role_name', 'is', null);

      const categoryFromUsers = usersWithCategory?.find(u => {
        const userKey = normalizeKey(u.custom_role_name || '');
        return userKey === oldKey;
      });

      if (!categoryFromUsers) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Create the metadata entry for this category
      const defaultColorId = PREDEFINED_COLORS[0].id;
      const { error: createError } = await supabase
        .from('category_metadata')
        .insert({
          company_id: companyId,
          key: oldKey,
          name: categoryFromUsers.custom_role_name,
          color_id: defaultColorId
        });

      if (createError) {
        console.error('Error creating category metadata:', createError);
        return res.status(500).json({ error: 'Failed to initialize category' });
      }

      categoryExistsInMetadata = true;
      console.log(`Created metadata entry for category "${oldKey}" from user custom_role_name`);
    }

    // If key is changing, check if new key already exists
    if (newKey !== oldKey) {
      const { data: conflicting } = await supabase
        .from('category_metadata')
        .select('id')
        .eq('company_id', companyId)
        .eq('key', newKey)
        .limit(1);

      if (conflicting && conflicting.length > 0) {
        return res.status(400).json({ error: 'A category with this name already exists' });
      }

      // Update all criteria to use the new category key
      const { error: criteriaError } = await supabase
        .from('criteria')
        .update({ category: newKey, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('category', oldKey);

      if (criteriaError) {
        console.error('Error updating criteria category:', criteriaError);
      }

      // Update users with this category
      const { data: oldMetadata } = await supabase
        .from('category_metadata')
        .select('name')
        .eq('company_id', companyId)
        .eq('key', oldKey)
        .single();

      if (oldMetadata) {
        const { error: usersError } = await supabase
          .from('users')
          .update({ custom_role_name: cleanName, updated_at: new Date().toISOString() })
          .eq('company_id', companyId)
          .ilike('custom_role_name', oldMetadata.name);

        if (usersError) {
          console.error('Error updating user categories:', usersError);
        }
      }
    }

    // Get color classes
    const colorData = PREDEFINED_COLORS.find(c => c.id === color_id) || PREDEFINED_COLORS[0];

    // Update category metadata
    const { error: updateError } = await supabase
      .from('category_metadata')
      .update({
        key: newKey,
        name: cleanName,
        color_id: colorData.id,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('key', oldKey);

    if (updateError) throw updateError;

    console.log(`Updated category "${oldKey}" to "${newKey}" with color "${colorData.id}" in company ${companyId}`);

    res.json({
      key: newKey,
      name: cleanName,
      color_id: colorData.id,
      color_classes: getColorClasses(colorData.id),
      is_builtin: false
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category and its criteria
router.delete('/:key', requireRole('admin_manager', 'developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categoryKey = req.params.key;

    // Get company_id
    let companyId = req.user!.companyId;
    if (isDeveloper(req.user!.role) && req.query.company_id) {
      companyId = Number(req.query.company_id);
    }

    if (!companyId) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    // Check if category exists in metadata
    const { data: existingMetadata } = await supabase
      .from('category_metadata')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('key', categoryKey)
      .single();

    if (!existingMetadata) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Delete category metadata
    const { error: metadataError } = await supabase
      .from('category_metadata')
      .delete()
      .eq('company_id', companyId)
      .eq('key', categoryKey);

    if (metadataError) {
      console.error('Error deleting category metadata:', metadataError);
      throw metadataError;
    }

    // Delete all criteria associated with this category
    const { data: deletedCriteria } = await supabase
      .from('criteria')
      .delete()
      .eq('company_id', companyId)
      .eq('category', categoryKey)
      .select('id');

    // Clear custom_role_name from users with this category
    const { data: usersToUpdate } = await supabase
      .from('users')
      .select('id, custom_role_name')
      .eq('company_id', companyId)
      .not('custom_role_name', 'is', null);

    if (usersToUpdate && usersToUpdate.length > 0) {
      const normalizeForComparison = (str: string): string => {
        return str.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();
      };

      const normalizedKey = normalizeForComparison(categoryKey);
      const normalizedName = normalizeForComparison(existingMetadata.name);

      const userIdsToUpdate = usersToUpdate
        .filter(u => {
          if (!u.custom_role_name) return false;
          const normalizedUserRole = normalizeForComparison(u.custom_role_name);
          return normalizedUserRole === normalizedKey || normalizedUserRole === normalizedName;
        })
        .map(u => u.id);

      if (userIdsToUpdate.length > 0) {
        const { error: usersError } = await supabase
          .from('users')
          .update({ custom_role_name: null, updated_at: new Date().toISOString() })
          .in('id', userIdsToUpdate);

        if (usersError) {
          console.error('Error clearing user categories:', usersError);
        } else {
          console.log(`Cleared custom_role_name from ${userIdsToUpdate.length} users`);
        }
      }
    }

    console.log(`Deleted category "${categoryKey}" and ${deletedCriteria?.length || 0} criteria from company ${companyId}`);

    res.json({
      message: 'Category deleted successfully',
      deleted_criteria: deletedCriteria?.length || 0
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
