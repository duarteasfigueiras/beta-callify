import { Router, Response } from 'express';
import { supabase } from '../db/supabase';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { isDeveloper, isAdminOrDeveloper } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all companies (developer only)
router.get('/companies', requireRole('developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    // Get user counts for each company
    const companiesWithCounts = await Promise.all(
      (companies || []).map(async (company: any) => {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .neq('role', 'developer');

        return {
          ...company,
          users_count: count || 0
        };
      })
    );

    res.json(companiesWithCounts);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Create company (developer only)
router.post('/companies', requireRole('developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, invite_limit } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Check if company name already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Company with this name already exists' });
    }

    const insertData: any = { name: name.trim() };
    if (invite_limit !== undefined && invite_limit > 0) {
      insertData.invite_limit = invite_limit;
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ ...company, users_count: 0 });
  } catch (error: any) {
    console.error('Error creating company:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: 'Failed to create company', details: error?.message || error });
  }
});

// Delete company (developer only) - CASCADE delete all related data
router.delete('/companies/:id', requireRole('developer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = parseInt(req.params.id);

    // Verify company exists
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    console.log(`Deleting company ${companyId} (${company.name}) and all related data...`);

    // Delete in order to respect foreign key constraints:
    // 1. First delete alerts (references calls and users)
    const { error: alertsError } = await supabase
      .from('alerts')
      .delete()
      .eq('company_id', companyId);
    if (alertsError) console.error('Error deleting alerts:', alertsError);

    // 2. Delete call_feedback (references calls and users)
    // Need to get call IDs first
    const { data: calls } = await supabase
      .from('calls')
      .select('id')
      .eq('company_id', companyId);

    if (calls && calls.length > 0) {
      const callIds = calls.map(c => c.id);

      // Delete call_feedback for these calls
      const { error: feedbackError } = await supabase
        .from('call_feedback')
        .delete()
        .in('call_id', callIds);
      if (feedbackError) console.error('Error deleting call_feedback:', feedbackError);

      // Delete call_criteria_results for these calls
      const { error: criteriaResultsError } = await supabase
        .from('call_criteria_results')
        .delete()
        .in('call_id', callIds);
      if (criteriaResultsError) console.error('Error deleting call_criteria_results:', criteriaResultsError);
    }

    // 3. Delete calls
    const { error: callsError } = await supabase
      .from('calls')
      .delete()
      .eq('company_id', companyId);
    if (callsError) console.error('Error deleting calls:', callsError);

    // 4. Delete invitations
    const { error: invitationsError } = await supabase
      .from('invitations')
      .delete()
      .eq('company_id', companyId);
    if (invitationsError) console.error('Error deleting invitations:', invitationsError);

    // 5. Delete criteria
    const { error: criteriaError } = await supabase
      .from('criteria')
      .delete()
      .eq('company_id', companyId);
    if (criteriaError) console.error('Error deleting criteria:', criteriaError);

    // 6. Delete alert_settings
    const { error: alertSettingsError } = await supabase
      .from('alert_settings')
      .delete()
      .eq('company_id', companyId);
    if (alertSettingsError) console.error('Error deleting alert_settings:', alertSettingsError);

    // 7. Delete category_metadata
    const { error: categoryError } = await supabase
      .from('category_metadata')
      .delete()
      .eq('company_id', companyId);
    if (categoryError) console.error('Error deleting category_metadata:', categoryError);

    // 8. Delete users (after calls, since calls reference users via agent_id)
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('company_id', companyId);
    if (usersError) console.error('Error deleting users:', usersError);

    // 9. Finally delete the company
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;

    console.log(`Company ${companyId} deleted successfully with all related data`);
    res.json({ message: 'Company and all related data deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

// Get all users (admin or developer)
router.get('/', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== GET USERS ===');
    console.log('Requesting user ID:', req.user!.userId);
    console.log('Requesting user role:', req.user!.role);
    console.log('Requesting user companyId:', req.user!.companyId);

    let query = supabase
      .from('users')
      .select('id, company_id, username, role, custom_role_name, categories, display_name, phone_number, language_preference, theme_preference, created_at, updated_at, companies(name)')
      .order('created_at', { ascending: false });

    if (isDeveloper(req.user!.role)) {
      // Developer sees all users except other developers
      console.log('Developer mode - seeing all users');
      query = query.neq('role', 'developer');
    } else {
      // Admin sees only users from their company (excluding developers)
      console.log('Admin mode - filtering by company_id:', req.user!.companyId);
      query = query
        .eq('company_id', req.user!.companyId)
        .neq('role', 'developer');
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('Supabase error fetching users:', error);
      throw error;
    }

    console.log('Found', users?.length || 0, 'users');
    console.log('=================');

    // Transform data to include company_name
    const transformedUsers = (users || []).map((user: any) => ({
      ...user,
      company_name: user.companies?.name || null,
      companies: undefined
    }));

    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get current user
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, company_id, username, role, custom_role_name, categories, display_name, phone_number, language_preference, theme_preference, created_at, updated_at')
      .eq('id', req.user!.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update current user preferences (including phone number and display name)
router.patch('/me/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { language_preference, theme_preference, phone_number, display_name } = req.body;

    // Validate inputs
    if (language_preference && !['pt', 'en'].includes(language_preference)) {
      return res.status(400).json({ error: 'Invalid language preference. Must be "pt" or "en"' });
    }
    if (theme_preference && !['light', 'dark'].includes(theme_preference)) {
      return res.status(400).json({ error: 'Invalid theme preference. Must be "light" or "dark"' });
    }

    // Validate phone number format (basic validation)
    if (phone_number !== undefined && phone_number !== null && phone_number !== '') {
      const phoneRegex = /^\+?[0-9]{9,15}$/;
      if (!phoneRegex.test(phone_number.replace(/[\s-]/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }

      // Check if phone number is already used by another user in the same company
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', req.user!.companyId)
        .eq('phone_number', phone_number.replace(/[\s-]/g, ''))
        .neq('id', req.user!.userId)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'Phone number already in use by another user in your company' });
      }
    }

    // Build update object
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (language_preference) updateData.language_preference = language_preference;
    if (theme_preference) updateData.theme_preference = theme_preference;
    if (phone_number !== undefined) {
      updateData.phone_number = phone_number === '' ? null : phone_number?.replace(/[\s-]/g, '') || null;
    }
    if (display_name !== undefined) {
      updateData.display_name = display_name === '' ? null : display_name?.trim() || null;
    }

    if (Object.keys(updateData).length === 1) {
      return res.status(400).json({ error: 'No preferences to update' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user!.userId)
      .select('id, company_id, username, role, custom_role_name, categories, display_name, phone_number, language_preference, theme_preference, created_at, updated_at')
      .single();

    if (error) throw error;

    res.json(user);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get current user's company info (for admin to see invite_limit)
router.get('/me/company', requireRole('admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user!.companyId) {
      return res.status(400).json({ error: 'User does not belong to a company' });
    }

    const { data: company, error } = await supabase
      .from('companies')
      .select('id, name, invite_limit, created_at, updated_at')
      .eq('id', req.user!.companyId)
      .single();

    if (error || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: 'Failed to fetch company info' });
  }
});

// Get user by ID (admin or developer)
router.get('/:id', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabase
      .from('users')
      .select('id, company_id, username, role, custom_role_name, categories, display_name, phone_number, language_preference, theme_preference, created_at, updated_at, companies(name)')
      .eq('id', req.params.id)
      .neq('role', 'developer');  // Never expose developer accounts

    // If not developer, restrict to same company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: user, error } = await query.single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform to include company_name
    const transformedUser = {
      ...user,
      company_name: (user as any).companies?.name || null,
      companies: undefined
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Invite user (admin or developer)
router.post('/invite', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, company_id, custom_role_name } = req.body;

    // Determine the company for the invitation
    let targetCompanyId: number;
    let inviteRole: string;
    let roleDisplayName: string | null = custom_role_name?.trim() || null;

    if (isDeveloper(req.user!.role)) {
      // Developer can ONLY invite admin_managers to companies
      inviteRole = 'admin_manager';

      // Developer must specify company_id
      if (!company_id) {
        return res.status(400).json({ error: 'Company ID is required for developer invitations' });
      }
      // Verify company exists
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single();

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      targetCompanyId = company_id;
    } else {
      // Admin can invite agents (check their company's invite limit)
      if (!role || !['admin_manager', 'agent'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (admin_manager or agent)' });
      }
      inviteRole = role;
      targetCompanyId = req.user!.companyId!;

      // Check invite limit for admin
      const { data: company } = await supabase
        .from('companies')
        .select('invite_limit')
        .eq('id', targetCompanyId)
        .single();

      if (company) {
        // Count existing users in this company (excluding admins from count, only count agents)
        const { count: usersCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', targetCompanyId)
          .eq('role', 'agent');

        // Count pending invitations for agents
        const { count: pendingInvites } = await supabase
          .from('invitations')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', targetCompanyId)
          .eq('role', 'agent')
          .eq('used', false)
          .gt('expires_at', new Date().toISOString());

        const totalAgents = (usersCount || 0) + (pendingInvites || 0);

        if (inviteRole === 'agent' && totalAgents >= (company.invite_limit || 10)) {
          return res.status(400).json({
            error: `Invite limit reached. Maximum ${company.invite_limit || 10} agents allowed for this company.`
          });
        }
      }
    }

    // Generate invite token
    const token = Buffer.from(`${targetCompanyId}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const { error } = await supabase.from('invitations').insert({
      company_id: targetCompanyId,
      invited_by: req.user!.userId,
      token,
      role: inviteRole,
      custom_role_name: roleDisplayName,
      used: false,
      expires_at: expiresAt
    });

    if (error) throw error;

    res.json({
      token,
      inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`,
      expiresAt,
      company_id: targetCompanyId,
      role: inviteRole,
      custom_role_name: roleDisplayName
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// Update user phone number (admin or developer)
router.patch('/:id/phone', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { phone_number } = req.body;

    // Build query based on role
    let query = supabase
      .from('users')
      .select('id, company_id')
      .eq('id', userId)
      .neq('role', 'developer');  // Can never modify developer accounts

    // Admin can only modify users in their company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: user } = await query.single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate phone number format (basic validation)
    if (phone_number !== undefined && phone_number !== null && phone_number !== '') {
      const phoneRegex = /^\+?[0-9]{9,15}$/;
      if (!phoneRegex.test(phone_number.replace(/[\s-]/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }

      // Check if phone number is already used by another user in the same company
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('phone_number', phone_number.replace(/[\s-]/g, ''))
        .neq('id', userId)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'Phone number already in use by another user in this company' });
      }
    }

    const cleanedPhone = phone_number === '' || phone_number === null ? null : phone_number?.replace(/[\s-]/g, '') || null;

    const { error } = await supabase
      .from('users')
      .update({ phone_number: cleanedPhone, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    res.json({ message: 'User phone number updated successfully', phone_number: cleanedPhone });
  } catch (error) {
    console.error('Error updating user phone:', error);
    res.status(500).json({ error: 'Failed to update user phone number' });
  }
});

// Helper function to map custom_role_name to a valid UserCategory
const mapToUserCategory = (customRoleName: string | null): string => {
  if (!customRoleName) return 'all';
  const lowerName = customRoleName.toLowerCase();
  if (lowerName.includes('comercial') || lowerName.includes('sales') || lowerName.includes('vendas') || lowerName.includes('vendedor')) {
    return 'comercial';
  }
  if (lowerName.includes('suporte') || lowerName.includes('support')) {
    return 'suporte';
  }
  if (lowerName.includes('tecnico') || lowerName.includes('técnico') || lowerName.includes('technical')) {
    return 'tecnico';
  }
  if (lowerName.includes('supervisor')) {
    return 'supervisor';
  }
  return 'all';
};

// Update user categories (supports multiple categories) - admin or developer
router.patch('/:id/category', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { custom_role_name, categories } = req.body;

    // Support both old format (custom_role_name string) and new format (categories array)
    let categoriesArray: string[] = [];
    if (categories && Array.isArray(categories)) {
      categoriesArray = categories.filter((c: string) => c && c.trim()).map((c: string) => c.trim());
    } else if (custom_role_name) {
      categoriesArray = [custom_role_name.trim()];
    }

    // Build query based on role
    let query = supabase
      .from('users')
      .select('id, role, company_id')
      .eq('id', userId)
      .neq('role', 'developer');  // Can never modify developer accounts

    // Admin can only modify users in their company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: user } = await query.single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow changing category for agents (users), not admins
    if (user.role !== 'agent') {
      return res.status(400).json({ error: 'Category can only be set for users (agents), not admins' });
    }

    // Use first category as custom_role_name for backwards compatibility
    const cleanedRoleName = categoriesArray.length > 0 ? categoriesArray[0] : null;
    const userCategory = mapToUserCategory(cleanedRoleName);

    // Update the user's categories (both old field and new array)
    const { error } = await supabase
      .from('users')
      .update({
        custom_role_name: cleanedRoleName,
        categories: categoriesArray,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Check if default criteria already exist for each category in this company
    for (const categoryName of categoriesArray) {
      if (!categoryName) continue;
      // For custom categories, use the actual category name (lowercase) instead of 'all'
      // This allows each custom category to have its own set of criteria
      const mappedCategory = mapToUserCategory(categoryName);
      const categoryToCheck = mappedCategory === 'all'
        ? categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_')
        : mappedCategory;

      const { data: existingCriterion } = await supabase
        .from('criteria')
        .select('id')
        .eq('company_id', user.company_id)
        .eq('category', categoryToCheck)
        .limit(1);

      // If no criterion exists for this category, create default criteria set
      if (!existingCriterion || existingCriterion.length === 0) {
        const categoryDisplayName = categoryName;

        // Create a full set of default criteria for this category
        const defaultCriteria = [
          {
            company_id: user.company_id,
            name: `Saudação/Abertura - ${categoryDisplayName}`,
            description: `Cumprimento e abertura adequados para ${categoryDisplayName}`,
            weight: 1,
            is_active: true,
            category: categoryToCheck
          },
          {
            company_id: user.company_id,
            name: `Identificação da necessidade - ${categoryDisplayName}`,
            description: `Identificação das necessidades específicas de ${categoryDisplayName}`,
            weight: 2,
            is_active: true,
            category: categoryToCheck
          },
          {
            company_id: user.company_id,
            name: `Clareza na comunicação - ${categoryDisplayName}`,
            description: `Comunicação clara e compreensível para ${categoryDisplayName}`,
            weight: 1,
            is_active: true,
            category: categoryToCheck
          },
          {
            company_id: user.company_id,
            name: `Tom profissional - ${categoryDisplayName}`,
            description: `Manutenção de tom profissional em ${categoryDisplayName}`,
            weight: 1,
            is_active: true,
            category: categoryToCheck
          },
          {
            company_id: user.company_id,
            name: `Resolução do problema - ${categoryDisplayName}`,
            description: `Capacidade de resolver problemas específicos de ${categoryDisplayName}`,
            weight: 3,
            is_active: true,
            category: categoryToCheck
          },
          {
            company_id: user.company_id,
            name: `Próximo passo definido - ${categoryDisplayName}`,
            description: `Definição clara do próximo passo para ${categoryDisplayName}`,
            weight: 2,
            is_active: true,
            category: categoryToCheck
          },
          {
            company_id: user.company_id,
            name: `Fecho da chamada - ${categoryDisplayName}`,
            description: `Encerramento profissional da chamada de ${categoryDisplayName}`,
            weight: 1,
            is_active: true,
            category: categoryToCheck
          }
        ];

        await supabase.from('criteria').insert(defaultCriteria);
        console.log(`Created ${defaultCriteria.length} default criteria for category "${categoryToCheck}" (${categoryDisplayName}) in company ${user.company_id}`);
      }
    }

    res.json({
      message: 'User category updated successfully',
      custom_role_name: cleanedRoleName,
      categories: categoriesArray
    });
  } catch (error) {
    console.error('Error updating user category:', error);
    res.status(500).json({ error: 'Failed to update user category' });
  }
});

// Update user role (admin or developer)
router.patch('/:id/role', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !['admin_manager', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin_manager or agent)' });
    }

    // Cannot change your own role
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Build query based on role
    let query = supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .neq('role', 'developer');  // Can never modify developer accounts

    // Admin can only modify users in their company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: user } = await query.single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error } = await supabase
      .from('users')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    res.json({ message: 'User role updated successfully', role });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (admin or developer)
router.delete('/:id', requireRole('developer', 'admin_manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    // Cannot delete yourself
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Build query based on role
    let query = supabase
      .from('users')
      .select('id, role, company_id')
      .eq('id', userId)
      .neq('role', 'developer');  // Can never delete developer accounts

    // Admin can only delete users in their company
    if (!isDeveloper(req.user!.role)) {
      query = query.eq('company_id', req.user!.companyId);
    }

    const { data: user } = await query.single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all calls from this user
    const { data: userCalls } = await supabase
      .from('calls')
      .select('id')
      .eq('agent_id', userId);

    if (userCalls && userCalls.length > 0) {
      const callIds = userCalls.map(c => c.id);

      // Delete call_criteria_results for these calls
      await supabase
        .from('call_criteria_results')
        .delete()
        .in('call_id', callIds);

      // Delete call_feedback for these calls
      await supabase
        .from('call_feedback')
        .delete()
        .in('call_id', callIds);

      // Delete alerts for these calls
      await supabase
        .from('alerts')
        .delete()
        .in('call_id', callIds);

      // Delete the calls themselves
      await supabase
        .from('calls')
        .delete()
        .eq('agent_id', userId);
    }

    // Delete any remaining alerts where this user is the agent
    const { error: alertsError } = await supabase
      .from('alerts')
      .delete()
      .eq('agent_id', userId);

    if (alertsError) {
      console.error('Error deleting user alerts:', alertsError);
    }

    // Delete user's feedback on other calls (field is author_id)
    const { error: feedbackError } = await supabase
      .from('call_feedback')
      .delete()
      .eq('author_id', userId);

    if (feedbackError) {
      console.error('Error deleting user feedback:', feedbackError);
    }

    // Delete invitations created by this user
    const { error: invitationsError } = await supabase
      .from('invitations')
      .delete()
      .eq('invited_by', userId);

    if (invitationsError) {
      console.error('Error deleting user invitations:', invitationsError);
    }

    // Delete user
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
