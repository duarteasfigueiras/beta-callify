import { supabase } from './supabase';

// Type for run result compatibility
interface RunResult {
  lastID?: number;
  changes?: number;
}

// Promisified database methods compatible with existing code
export const dbRun = async (sql: string, params: unknown[] = []): Promise<RunResult> => {
  // Convert SQL to Supabase operation
  const sqlLower = sql.toLowerCase().trim();

  // Handle INSERT
  if (sqlLower.startsWith('insert')) {
    const tableMatch = sql.match(/insert\s+into\s+(\w+)/i);
    if (!tableMatch) throw new Error('Invalid INSERT statement');
    const table = tableMatch[1];

    // Parse columns and values
    const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
    const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim()) : [];

    const data: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      data[col] = params[i];
    });

    const { data: result, error } = await supabase.from(table).insert(data).select('id').single();
    if (error) throw error;
    return { lastID: result?.id, changes: 1 };
  }

  // Handle UPDATE
  if (sqlLower.startsWith('update')) {
    const tableMatch = sql.match(/update\s+(\w+)\s+set/i);
    if (!tableMatch) throw new Error('Invalid UPDATE statement');
    const table = tableMatch[1];

    // Parse SET clause
    const setMatch = sql.match(/set\s+(.+?)\s+where/i);
    if (!setMatch) throw new Error('UPDATE without WHERE not supported');

    const setParts = setMatch[1].split(',').map(s => s.trim());
    const data: Record<string, unknown> = {};
    let paramIndex = 0;

    setParts.forEach(part => {
      const [col] = part.split('=').map(s => s.trim());
      data[col] = params[paramIndex++];
    });

    // Parse WHERE clause - assume last param is the ID
    const whereMatch = sql.match(/where\s+(.+)/i);
    if (whereMatch) {
      const whereCol = whereMatch[1].split('=')[0].trim();
      const whereVal = params[paramIndex];

      const { error, count } = await supabase.from(table).update(data).eq(whereCol, whereVal);
      if (error) throw error;
      return { changes: count || 1 };
    }

    throw new Error('UPDATE without WHERE not supported');
  }

  // Handle DELETE
  if (sqlLower.startsWith('delete')) {
    const tableMatch = sql.match(/delete\s+from\s+(\w+)/i);
    if (!tableMatch) throw new Error('Invalid DELETE statement');
    const table = tableMatch[1];

    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*\?/i);
    if (whereMatch) {
      const whereCol = whereMatch[1];
      const { error, count } = await supabase.from(table).delete().eq(whereCol, params[0]);
      if (error) throw error;
      return { changes: count || 1 };
    }

    throw new Error('DELETE without WHERE not supported');
  }

  // For other statements (CREATE, etc), just return success
  return { changes: 0 };
};

export const dbGet = async <T>(sql: string, params: unknown[] = []): Promise<T | undefined> => {
  const results = await dbAll<T>(sql, params);
  return results[0];
};

export const dbAll = async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const sqlLower = sql.toLowerCase().trim();

  // Parse SELECT statement
  const tableMatch = sql.match(/from\s+(\w+)/i);
  if (!tableMatch) throw new Error('Invalid SELECT statement');
  const table = tableMatch[1];

  // Get columns
  const selectMatch = sql.match(/select\s+(.+?)\s+from/i);
  const selectPart = selectMatch ? selectMatch[1].trim() : '*';

  let query = supabase.from(table).select(selectPart === '*' ? '*' : selectPart.replace(/\s+as\s+\w+/gi, ''));

  // Parse WHERE clause
  const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+limit|\s+group|\s*$)/i);
  if (whereMatch) {
    const whereClauses = whereMatch[1].split(/\s+and\s+/i);
    let paramIndex = 0;

    for (const clause of whereClauses) {
      const eqMatch = clause.match(/(\w+(?:\.\w+)?)\s*=\s*\?/);
      const likeMatch = clause.match(/(\w+)\s+like\s+\?/i);
      const gtMatch = clause.match(/(\w+)\s*>\s*\?/);
      const gteMatch = clause.match(/(\w+)\s*>=\s*\?/);
      const ltMatch = clause.match(/(\w+)\s*<\s*\?/);
      const lteMatch = clause.match(/(\w+)\s*<=\s*\?/);
      const inMatch = clause.match(/(\w+)\s+in\s*\(/i);

      if (eqMatch) {
        const col = eqMatch[1].replace(/^\w+\./, ''); // Remove table prefix
        query = query.eq(col, params[paramIndex++]);
      } else if (likeMatch) {
        const col = likeMatch[1];
        const val = String(params[paramIndex++]).replace(/%/g, '*');
        query = query.ilike(col, val);
      } else if (gtMatch) {
        query = query.gt(gtMatch[1], params[paramIndex++]);
      } else if (gteMatch) {
        query = query.gte(gteMatch[1], params[paramIndex++]);
      } else if (ltMatch) {
        query = query.lt(ltMatch[1], params[paramIndex++]);
      } else if (lteMatch) {
        query = query.lte(lteMatch[1], params[paramIndex++]);
      } else if (inMatch) {
        // Handle IN clause - count the ? marks
        const inParams: unknown[] = [];
        const questionMarks = clause.match(/\?/g) || [];
        for (let i = 0; i < questionMarks.length; i++) {
          inParams.push(params[paramIndex++]);
        }
        query = query.in(inMatch[1], inParams);
      }
    }
  }

  // Parse ORDER BY
  const orderMatch = sql.match(/order\s+by\s+(\w+(?:\.\w+)?)\s*(asc|desc)?/i);
  if (orderMatch) {
    const col = orderMatch[1].replace(/^\w+\./, '');
    const ascending = !orderMatch[2] || orderMatch[2].toLowerCase() === 'asc';
    query = query.order(col, { ascending });
  }

  // Parse LIMIT
  const limitMatch = sql.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    query = query.limit(parseInt(limitMatch[1]));
  }

  // Parse OFFSET
  const offsetMatch = sql.match(/offset\s+(\d+)/i);
  if (offsetMatch) {
    const offset = parseInt(offsetMatch[1]);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 1000;
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
};

// Export supabase client for direct use when needed
export { supabase };

// Dummy default export for compatibility
export default { supabase };
