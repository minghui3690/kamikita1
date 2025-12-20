
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

export const askWithContext = async (req: Request, res: Response) => {
    try {
        if (!API_KEY) {
            return res.status(500).json({ message: 'GEMINI_API_KEY is not configured on the server.' });
        }

        // 1. Get Input
        const { memberId, messages, topic } = req.body; // messages = [{ role: 'user', content: '...' }]
        // 'topic' can be 'HD', 'BUSINESS', 'RELATIONSHIP', etc. to guide the lens.

        if (!memberId || !messages || !Array.isArray(messages)) {
            return res.status(400).json({ message: 'Invalid request body. memberId and messages array required.' });
        }

        // 2. Fetch Member Context (HD Data)
        const member = await prisma.user.findUnique({
            where: { id: memberId },
            include: {
                humanDesign: true
            }
        });

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // 3. Construct System Prompt
        // We act as an Expert Consultant.
        const hd = member.humanDesign;
        const hdContext = hd ? `
HUMAN DESIGN PROFILE FOR ${member.name}:
- Type: ${hd.type}
- Strategy: ${hd.strategy}
- Authority: ${hd.authority}
- Profile: ${hd.profile}
- Signature: ${hd.signature}
- Not-Self Theme: ${hd.notSelfTheme}
- Incarnation Cross: ${hd.incarnationCross}
- Centers (Open/Defined): ${JSON.stringify(hd.centers)}
- Channels: ${JSON.stringify(hd.channels)}
- Variables: Digestion(${hd.digestion}), Environment(${hd.environment}), Motivation(${hd.motivation})
        ` : 'No Human Design data available yet.';

        const systemInstruction = `
You are an expert Human Design Analyst and Life Consultant.
Your client is ${member.name}.
You have their Human Design chart data.

YOUR GOAL:
Answer the user's question accurately, BUT ALWAYS filter your advice through the lens of their Human Design Chart.
- DOES NOT give generic "Google advice".
- DOES connect the answer to their Type, Authority, and Centers.
- IF they ask about Business/Stocks: Analyze based on their handling of pressure (Root), risk (Spleen), and ego (Heart).
- IF they ask about Relationships: Analyze based on their Solar Plexus and Split definition if known.

CONTEXT:
${hdContext}

TONE:
Professional, empathetic, empowering, but direct. Use Human Design terminology naturally but explain it simply if complex.
`;

        // 4. Call Gemini
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ 
            // Verified working model via diagnostic script
            model: "gemini-flash-lite-latest",
            systemInstruction: systemInstruction 
        });

        // Convert simplistic messages to Gemini format if needed, but SDK handles simple strings or content objects
        // We only send the last message for now as the prompt + query, OR we can send history.
        // For simple usage, let's construct a chat session.
        
        const chat = model.startChat({
            history: messages.slice(0, -1).map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            })),
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const lastMessage = messages[messages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const responseText = result.response.text();

        // 5. Return Response
        return res.json({ 
            response: responseText,
            usedModel: "gemini-1.5-flash"
        });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        // Expose the actual error message to the client for debugging
        return res.status(500).json({ 
            message: `AI Error: ${error.message || 'Unknown error'}`, 
            details: error 
        });
    }
};
