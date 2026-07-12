import { pool } from '../db/pool';
import { WeddingRequest } from '../types';

export interface CreateWeddingRequest {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    email: string;
    phone_number?: string;
}

export async function createWeddingRequest(
    data: CreateWeddingRequest,
): Promise<WeddingRequest> {

    const { rows } = await pool.query<WeddingRequest>(
        `
    INSERT INTO wedding_requests
    (
      bride_name,
      groom_name,
      wedding_date,
      phone_number,
      email
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
        [
            data.bride_name,
            data.groom_name,
            data.wedding_date,
            data.phone_number ?? null,
            data.email ?? null,
        ],
    );

    return rows[0];
}