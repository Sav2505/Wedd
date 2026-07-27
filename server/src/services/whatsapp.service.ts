// whatsapp.service.ts

import axios from 'axios';

export async function sendTestMessage(to: string) {
    const url = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
            body: 'שלום 👋 זאת הודעת בדיקה ממערכת החתונות שלי!'
        }
    };

    const response = await axios.post(url, body, {
        headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });

    return response.data;
}