import { api } from '@/lib/api';

export interface SystemConfig {
  products: {
    equipmentDiscountAmount: number;
    equipmentDiscountCurrency: string;
  };
}

export const systemConfigApi = {

  async getSystemConfig(): Promise<SystemConfig> {
    try {
      const response = await api.get('/system-config');
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch system configuration"
      );
    }
  },
};

