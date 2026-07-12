import { pool } from '../db/pool';
import { WeddingRequest } from '../types';

export interface CreateWeddingRequest {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
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
      wedding_date
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
        [
            data.bride_name,
            data.groom_name,
            data.wedding_date,
        ],
    );

    return rows[0];
}