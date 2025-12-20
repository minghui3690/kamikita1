import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getVouchers = async (req: Request, res: Response) => {
    try {
        const vouchers = await prisma.voucher.findMany({ where: { isActive: true } });
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vouchers', error });
    }
};

export const createVoucher = async (req: Request, res: Response) => {
    try {
        const { code, discountPercent, startDate, endDate } = req.body;
        const voucher = await prisma.voucher.create({
            data: {
                code,
                discountPercent: Number(discountPercent),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isActive: true
            }
        });
        res.status(201).json(voucher);
    } catch (error) {
        res.status(500).json({ message: 'Error creating voucher', error });
    }
};

export const deleteVoucher = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.voucher.update({ where: { id }, data: { isActive: false } }); // Soft delete
        res.json({ message: 'Voucher deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting voucher', error });
    }
};
