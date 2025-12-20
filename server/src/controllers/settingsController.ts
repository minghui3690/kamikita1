import { Request, Response } from 'express';  
import prisma from '../lib/prisma';

export const getSettings = async (req: Request, res: Response) => {
    try {
        let settings = await prisma.systemSettings.findFirst();
        
        if (!settings) {
            // Create default settings if not exists
            settings = await prisma.systemSettings.create({
                data: {
                    commissionLevels: 3,
                    levelPercentages: [20, 5, 2],
                    pointRate: 1,
                    taxPercentage: 11,
                    branding: {
                        logo: '',
                        appTitle: 'Rich Dragon',
                        appSubtitle: 'Empowering Network Marketing',
                        theme: { cardBackground: '#ffffff', cardText: '#000000' }
                    },
                    landingPage: {
                        title: 'Welcome to Rich Dragon',
                        description: 'The best platform for your business.',
                        heroAlignment: 'left',
                        features: { title: 'Why Choose Us', description: 'We offer the best features.' },
                        featureBoxes: [
                          {id: '1', title: 'Feature 1', description: 'Desc 1'},
                          {id: '2', title: 'Feature 2', description: 'Desc 2'},
                          {id: '3', title: 'Feature 3', description: 'Desc 3'}
                        ],
                        testimonials: [],
                        footer: {
                            aboutText: 'About us...',
                            contactEmail: 'support@example.com',
                            contactPhone: '+62...',
                            socialMedia: { others: [] }
                        }
                    },

                    productPage: {
                         title: 'Our Products',
                         subtitle: 'Browse our catalog'
                    } as any,
                    memberProfileConfig: {
                        showBirthDetails: true
                    } as any
                }
            });
        }


        const announcements = await prisma.announcement.findMany({
            orderBy: { date: 'desc' }
        });

        res.json({ ...settings, announcements });
    } catch (error) {
        console.error('getSettings error:', error);
        res.status(500).json({ message: 'Error fetching settings', error });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { id, announcements, ...data } = req.body;
        // Upsert logic, but since we usually have one row, finding first is safer or use ID if provided.
        
        const settings = await prisma.systemSettings.findFirst();
        
        if (settings) {
            await prisma.systemSettings.update({
                where: { id: settings.id },
                data: data
            });
        } else {
            await prisma.systemSettings.create({
                data: data
            });
        }
        
        res.json({ message: 'Settings updated' });
    } catch (error) {
        console.error('SETTINGS UPDATE ERROR:', error);
        res.status(500).json({ message: 'Error updating settings', error });
    }
};
