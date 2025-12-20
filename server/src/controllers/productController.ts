import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany();
        // Return mapped for frontend compatibility if needed, OR update frontend.
        // User requested name -> nameproduct change in DB. 
        // Best to send raw DB shape usually, but if we want to minimize frontend breakage we could map.
        // BUT the user explicitely asked for "nameproduct" in DB. I should update Frontend too.
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { nameproduct, price, points, description, image, pdfUrl, customRedirectUrl, isConsultation, consultationQuota, activeDays } = req.body;
        const product = await prisma.product.create({
            data: { 
                nameproduct, 
                price: Number(price), 
                points: Number(points), 
                description, 
                image, 
                pdfUrl, 
                customRedirectUrl,
                isConsultation: Boolean(isConsultation),
                consultationQuota: Number(consultationQuota || 0),
                activeDays: Number(activeDays || 0)
            }
        });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error creating product', error });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nameproduct, price, points, description, image, pdfUrl, customRedirectUrl, isConsultation, consultationQuota, activeDays } = req.body;
        const product = await prisma.product.update({
            where: { id },
            data: { 
                nameproduct, 
                price: Number(price), 
                points: Number(points), 
                description, 
                image, 
                pdfUrl, 
                customRedirectUrl,
                isConsultation: Boolean(isConsultation),
                consultationQuota: Number(consultationQuota || 0),
                activeDays: Number(activeDays || 0)
            }
        });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error updating product', error });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product', error });
    }
};
