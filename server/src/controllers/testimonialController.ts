import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createTestimonial = async (req: Request, res: Response) => {
    try {
        const { productId, rating, content, image } = req.body;
        const userId = (req as any).user.id;

        // Optional: Verify purchase
        // For now, we trust the frontend UI which only shows the button for purchased items.
        // Doing a strict JSON query on Transaction items might be heavy or complex without specific index.

        const testimonial = await prisma.testimonial.create({
            data: {
                userId,
                productId,
                rating,
                content,
                image
            }
        });

        res.status(201).json(testimonial);
    } catch (error: any) {
        console.error('Create Testimonial Error:', error);
        res.status(500).json({ 
            message: 'Failed to create testimonial', 
            error: error.message,
            stack: error.stack 
        });
    }
};

export const getProductReviews = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const reviews = await prisma.testimonial.findMany({
            where: { productId, isPublic: true },
            include: {
                user: {
                    select: { name: true, avatar: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
};

export const getAllReviews = async (req: Request, res: Response) => {
    try {
        const reviews = await prisma.testimonial.findMany({
            include: {
                user: { select: { name: true, email: true } },
                product: { select: { nameproduct: true, image: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all reviews' });
    }
};

export const updateReviewStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isPublic } = req.body;

        const updated = await prisma.testimonial.update({
            where: { id },
            data: { isPublic }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update status' });
    }
};

export const deleteReview = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.testimonial.delete({ where: { id } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete' });
    }
};
