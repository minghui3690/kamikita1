const midtransClient = require('midtrans-client');
import prisma from '../lib/prisma';

export class MidtransService {
    private core: any;
    private snap: any;

    constructor() {
        this.initialize();
    }

    // Allow re-initialization if settings change (e.g. user updates config in DB)
    public async initialize() {
        const settings = await prisma.systemSettings.findFirst();
        const config = settings?.paymentConfig as any;
        const mtConfig = config?.midtrans || config || {}; // Support both nested and flat for safety
        
        const isProduction = mtConfig.isProduction || false; 
        const serverKey = mtConfig.serverKey || process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-TEST';
        const clientKey = mtConfig.clientKey || process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-TEST';

        this.snap = new midtransClient.Snap({
            isProduction: isProduction,
            serverKey: serverKey,
            clientKey: clientKey
        });

        this.core = new midtransClient.CoreApi({
            isProduction: isProduction,
            serverKey: serverKey,
            clientKey: clientKey
        });
    }

    public async createTransactionToken(transaction: any, user: any) {
        // Ensure initialized (simple check)
        if (!this.snap) await this.initialize();

        const parameter = {
            transaction_details: {
                order_id: transaction.id,
                gross_amount: Math.round(transaction.totalAmount)
            },
            credit_card: {
                secure: true
            },
            customer_details: {
                first_name: user.name,
                email: user.email,
                phone: user.phone || '08123456789'
            },
            // callbacks: {
            //     finish: "http://example.com/payment/finish"
            // }
        };

        try {
            const transactionToken = await this.snap.createTransactionToken(parameter);
            return transactionToken;
        } catch (error) {
            console.error('Midtrans Token Error:', error);
            throw error;
        }
    }

    public async verifyNotification(notificationJson: any) {
        if (!this.core) await this.initialize();
        
        try {
            const statusResponse = await this.core.transaction.notification(notificationJson);
            return statusResponse;
        } catch (error) {
            console.error('Midtrans Notification Error:', error);
            throw error;
        }
    }
}

export const midtransService = new MidtransService();
