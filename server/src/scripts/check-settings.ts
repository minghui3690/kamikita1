
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking System Settings...');
    const settings = await prisma.systemSettings.findFirst();
    
    if (!settings) {
        console.log('No settings found!');
        return;
    }
    
    // Check landingPage JSON
    const lp = settings.landingPage as any;
    if (!lp) {
        console.log('Landing Page config is null');
        return;
    }
    
    console.log('Landing Page Title:', lp.title);
    
    const testimonials = lp.testimonials;
    if (!testimonials) {
        console.log('Testimonials field is MISSING in JSON');
    } else if (Array.isArray(testimonials)) {
        console.log(`Testimonials count: ${testimonials.length}`);
        console.log('Testimonial Items:', JSON.stringify(testimonials, null, 2));
    } else {
        console.log('Testimonials is not an array:', testimonials);
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
