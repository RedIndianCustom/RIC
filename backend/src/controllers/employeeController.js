import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export async function listEmployees(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to include phone and assigned_warehouse from metadata
    const employees = (data || []).map(emp => ({
      ...emp,
      phone: emp.metadata?.phone || null,
      assigned_warehouse: emp.metadata?.assigned_warehouse || null
    }));

    return res.json({ employees });
  } catch (err) {
    logger.error('Error listing employees:', err);
    return next(err);
  }
}

export async function createEmployee(req, res, next) {
  try {
    const { fullName, email, phone, employeeCode, role, department, assignedWarehouse } = req.body;

    // Generate code based on department if not provided
    let code = employeeCode;
    if (!code) {
      const prefix = department === 'Office' ? 'OF' :
                     department === 'Digital' ? 'DG' :
                     department === 'Warehouse Operations' ? 'WH' :
                     department === 'Sales & POS' ? 'SL' :
                     department === 'Inbound Logistics' ? 'IL' :
                     department === 'Floor Supervision' ? 'FS' : 'OP';
      code = `EMP-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Store phone and assignedWarehouse in metadata
    const metadata = {};
    if (phone) metadata.phone = phone;
    if (assignedWarehouse) metadata.assigned_warehouse = assignedWarehouse;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({
        full_name: fullName,
        email: email.trim().toLowerCase(),
        employee_code: code,
        employee_position: role || 'operational_staff',
        department: department || 'Warehouse Operations',
        is_used: false,
        metadata: metadata
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('activity_log').insert({
      user_id: req.user?.id || null,
      action: 'employee.registered',
      category: 'Security',
      severity: 'info',
      details: `Generated onboarding employee badge ${code} for ${fullName}`,
      metadata: { employeeCode: code, email, department },
    });

    return res.status(201).json({ employee: data });
  } catch (err) {
    logger.error('Error creating employee code:', err);
    return next(err);
  }
}

export async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const { fullName, email, phone, employeeCode, role, department, assignedWarehouse } = req.body;

    // Store phone and assignedWarehouse in metadata
    const metadata = {};
    if (phone) metadata.phone = phone;
    if (assignedWarehouse) metadata.assigned_warehouse = assignedWarehouse;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (fullName) updateData.full_name = fullName;
    if (email) updateData.email = email.trim().toLowerCase();
    if (employeeCode) updateData.employee_code = employeeCode;
    if (role) updateData.employee_position = role;
    if (department) updateData.department = department;
    if (Object.keys(metadata).length > 0) updateData.metadata = metadata;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('activity_log').insert({
      user_id: req.user?.id || null,
      action: 'employee.updated',
      category: 'Security',
      severity: 'info',
      details: `Updated employee ${fullName || 'record'}`,
      metadata: { employeeId: id, changes: updateData },
    });

    return res.json({ employee: data });
  } catch (err) {
    logger.error('Error updating employee:', err);
    return next(err);
  }
}

export async function deleteEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('employees').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdmin.from('activity_log').insert({
      user_id: req.user?.id || null,
      action: 'employee.deleted',
      category: 'Security',
      severity: 'warning',
      details: `Deleted employee record`,
      metadata: { employeeId: id },
    });

    return res.status(204).send();
  } catch (err) {
    logger.error('Error deleting employee:', err);
    return next(err);
  }
}

export async function bulkImportEmployees(req, res, next) {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'Invalid employees data' });
    }

    const employeesToInsert = employees.map(emp => {
      const metadata = {};
      if (emp.phone) metadata.phone = emp.phone;
      if (emp.assignedWarehouse) metadata.assigned_warehouse = emp.assignedWarehouse;

      return {
        full_name: emp.fullName,
        email: emp.email.trim().toLowerCase(),
        employee_code: emp.employeeCode,
        employee_position: emp.role || 'operational_staff',
        department: emp.department || 'Warehouse Operations',
        is_used: false,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      };
    });

    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert(employeesToInsert)
      .select();

    if (error) throw error;

    await supabaseAdmin.from('activity_log').insert({
      user_id: req.user?.id || null,
      action: 'employee.bulk_import',
      category: 'Security',
      severity: 'info',
      details: `Bulk imported ${employees.length} employee records`,
      metadata: { count: employees.length },
    });

    return res.status(201).json({
      success: true,
      imported: data.length,
      employees: data
    });
  } catch (err) {
    logger.error('Error importing employees:', err);
    return next(err);
  }
}
