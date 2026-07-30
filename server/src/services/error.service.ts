import { sendTemplateMessage } from "./whatsapp.service";


export interface AdminAlertInput {
    title: string;
    message: string;
    error?: unknown;
}

export async function sendAdminAlert(input: AdminAlertInput): Promise<void> {
    const adminWhatsapp = process.env.WHATSAPP_ADMIN_NUMBER;

    try {
    } catch (mailError) {
        console.error('Failed sending admin alert email', mailError);

        // 2. אם גם זה נכשל - שלח WhatsApp
        try {
            if (!adminWhatsapp) return;

            await sendTemplateMessage({
                to: adminWhatsapp,
                templateName: 'system_error',
                components: [
                    {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: input.title,
                            },
                            {
                                type: 'text',
                                text:
                                    `${input.message}\n\n` +
                                    `Original Error:\n${input.error instanceof Error ? input.error.stack : String(input.error)}`,
                            },
                        ],
                    },
                ],
            });
        } catch (whatsappError) {
            console.error('Failed sending admin alert WhatsApp', whatsappError);
        }
    }
}