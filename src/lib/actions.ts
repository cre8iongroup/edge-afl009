'use server';

import { z } from 'zod';

const workshopSchema = z.object({
  userId: z.string(),
  pillar: z.string(),
  format: z.string(),
  audience: z.string(),
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  cpe: z.boolean(),
});

export async function submitWorkshop(data: z.infer<typeof workshopSchema>) {
  const validatedData = workshopSchema.safeParse(data);

  if (!validatedData.success) {
    console.error('Invalid submission data:', validatedData.error.flatten());
    throw new Error('Invalid submission data.');
  }

  // In a real application, you would save this data to a database.
  console.log('New workshop submission:', validatedData.data);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { success: true, data: validatedData.data };
}
