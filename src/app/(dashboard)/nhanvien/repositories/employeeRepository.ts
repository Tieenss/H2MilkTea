// repositories/employeeRepository.ts
import apiService from '@/utils/apiService';
import type { Employee, EmployeeFormData } from '../types/employee';

export class EmployeeRepository {
  private tableName = 'employees';

  async getAll(options?: {
    search?: string;
    department?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) {
    const queryOptions: any = {};
    
    if (options?.search) {
      queryOptions.filter = {
        $or: [
          { 'Họ và Tên': options.search },
          { 'username': options.search },
          { 'Email': options.search }
        ]
      };
    }
    
    if (options?.department) {
      queryOptions.filter = { ...queryOptions.filter, 'Phòng': options.department };
    }
    
    if (options?.role) {
      queryOptions.filter = { ...queryOptions.filter, 'Phân quyền': options.role };
    }
    
    if (options?.page && options?.limit) {
      queryOptions.page = options.page;
      queryOptions.limit = options.limit;
    }
    
    return apiService.findAll<Employee>(this.tableName, queryOptions);
  }

  async getById(username: string) {
    return apiService.findById<Employee>(this.tableName, username);
  }

  async create(employee: EmployeeFormData) {
    // Validate unique username
    const existing = await this.getById(employee.username);
    if (existing.success) {
      throw new Error('Username already exists');
    }
    
    return apiService.create<Employee>(this.tableName, employee);
  }

  async update(username: string, updates: Partial<EmployeeFormData>) {
    return apiService.update<Employee>(this.tableName, username, updates);
  }

  async delete(username: string) {
    return apiService.delete(this.tableName, username);
  }

  async authenticate(username: string, password: string) {
    const response = await apiService.findAll<Employee>(this.tableName, {
      filter: { username, password }
    });
    
    if (response.success && response.data && response.data.length === 1) {
      return { success: true, data: response.data[0] };
    }
    
    return { success: false, error: 'Invalid credentials' };
  }
}

export const employeeRepository = new EmployeeRepository();