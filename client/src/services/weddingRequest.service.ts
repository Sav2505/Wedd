import api from './api';
import { ApiResponse, WeddingRequest } from '../types/domain';

export interface CreateWeddingRequest {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    phone_number?: string;
    email: string;
}

export async function createWeddingRequest(
    payload: CreateWeddingRequest,
): Promise<WeddingRequest> {
    const { data } = await api.post<ApiResponse<WeddingRequest>>(
        '/wedding-requests',
        payload,
    );

    if (!data.success || !data.data) {
        throw new Error(data.message ?? 'שגיאה בשליחת הבקשה');
    }

    return data.data;
}