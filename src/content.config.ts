import { defineCollection, z } from "astro:content";

const notes = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string(),
    tags: z.array(z.string()).default([]),
    series: z.object({
      name: z.string(),
      order: z.number().int().nonnegative()
    }).optional()
  })
});

export const collections = { notes };
