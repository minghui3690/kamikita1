import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// --- ADMIN: CRUD Operations ---

export const importBulkKnowledge = async (req: Request, res: Response) => {
    try {
        const items = req.body; // Expecting array of { key, category, title, contentLevel1... }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Invalid data format. Expected non-empty array.' });
        }

        console.log(`[HD Import] Starting bulk import of ${items.length} items...`);

        // Run in transaction for consistency
        await prisma.$transaction(
            items.map((item: any) => 
                prisma.hDKnowledge.upsert({
                    where: { key: item.key },
                    update: {
                        category: item.category,
                        title: item.title,
                        contentLevel1: item.contentLevel1,
                        contentLevel2: item.contentLevel2,
                        contentLevel3: item.contentLevel3,
                        contentLevel4: item.contentLevel4
                    },
                    create: {
                        key: item.key,
                        category: item.category,
                        title: item.title,
                        contentLevel1: item.contentLevel1,
                        contentLevel2: item.contentLevel2,
                        contentLevel3: item.contentLevel3,
                        contentLevel4: item.contentLevel4
                    }
                })
            )
        );

        console.log('[HD Import] Successfully imported all items.');
        res.json({ message: `Successfully imported ${items.length} items.` });

    } catch (error) {
        console.error('Bulk Import Error:', error);
        res.status(500).json({ message: 'Error importing data.' });
    }
};

export const getAllKnowledge = async (req: Request, res: Response) => {
    try {
        const items = await prisma.hDKnowledge.findMany({
            orderBy: { key: 'asc' }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching knowledge base' });
    }
};

export const getKnowledgeByKey = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        const item = await prisma.hDKnowledge.findUnique({
            where: { key }
        });
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching item' });
    }
};

export const saveKnowledge = async (req: Request, res: Response) => {
    try {
        const { key, category, title, contentLevel1, contentLevel2, contentLevel3, contentLevel4 } = req.body;

        const updated = await prisma.hDKnowledge.upsert({
            where: { key },
            update: {
                category,
                title,
                contentLevel1,
                contentLevel2,
                contentLevel3,
                contentLevel4
            },
            create: {
                key,
                category,
                title,
                contentLevel1,
                contentLevel2,
                contentLevel3,
                contentLevel4
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Save Knowledge Error:', error);
        res.status(500).json({ message: 'Error saving knowledge item' });
    }
};


export const deleteKnowledge = async (req: Request, res: Response) => {
    try {
        const { key } = req.params;
        await prisma.hDKnowledge.delete({ where: { key } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item' });
    }
};


// --- MEMBER: Fetch Knowledge with Access Control ---

export const getMyKnowledge = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { keys } = req.body; 

        console.log(`[HD Debug] Fetching for User: ${userId}`);
        console.log(`[HD Debug] Requested Keys Type: ${typeof keys}, IsArray: ${Array.isArray(keys)}`);
        console.log(`[HD Debug] Requested Keys Len: ${keys?.length}`);

        if (!Array.isArray(keys) || keys.length === 0) {
            console.log('[HD Debug] Returned empty because keys invalid');
            return res.json([]);
        }

        // 1. Get User Access Levels
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                hdAccessLevel1: true,
                hdAccessLevel2: true,
                hdAccessLevel3: true,
                hdAccessLevel4: true
            }
        });

        if (!user) {
            console.log('[HD Debug] User not found during fetch');
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Fetch Knowledge Items
        const knowledgeItems = await prisma.hDKnowledge.findMany({
            where: {
                key: { in: keys }
            }
        });

        // SANITY CHECK: Explicitly try to find TYPE_GENERATOR to see if DB is reachable and key matches exactly
        const sanityCheck = await prisma.hDKnowledge.findUnique({
            where: { key: 'TYPE_GENERATOR' }
        });
        
        console.log(`[HD Debug] Found Items Count: ${knowledgeItems.length}`);
        // Log first found item key to verify
        if (knowledgeItems.length > 0) console.log(`[HD Debug] First Found: ${knowledgeItems[0].key}`);


        // 3. Filter Content based on Access Levels
        const sanitizedItems = knowledgeItems.map(item => {
            return {
                key: item.key,
                title: item.title,
                category: item.category,
                // Only return content if user has access level
                contentLevel1: user.hdAccessLevel1 ? item.contentLevel1 : null,
                contentLevel2: user.hdAccessLevel2 ? item.contentLevel2 : null,
                contentLevel3: user.hdAccessLevel3 ? item.contentLevel3 : null,
                contentLevel4: user.hdAccessLevel4 ? item.contentLevel4 : null,
            };
        });

        // WRAP RESPONSE for Debugging (Frontend must handle this temporarily)
        // We return { items: [...], debug: ... }
        // Note: This breaks strict array expectations if frontend expects pure array.
        // I will update frontend to handle this.
        res.json({
            items: sanitizedItems,
            debug: {
                receivedKeysCount: keys.length,
                receivedKeysSample: keys.slice(0, 3), // Show first 3
                foundCount: knowledgeItems.length,
                sanityCheckFound: !!sanityCheck,
                sanityCheckKey: sanityCheck ? sanityCheck.key : 'N/A',
                userId: userId
            }
        });

    } catch (error) {
        console.error('Fetch My Knowledge Error:', error);
        res.status(500).json({ message: 'Error fetching knowledge' });
    }
};
