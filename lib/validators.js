import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  constituencyId: z.coerce.number().int().positive('Constituency is required'),
  phone: z
    .string()
    .regex(/^[0-9]{10,15}$/, 'Phone must be 10 to 15 digits')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const electionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.enum(['UPCOMING', 'ONGOING', 'CLOSED']),
});

export const partySchema = z.object({
  name: z.string().min(1, 'Party name is required').max(100),
  symbol: z.string().min(1, 'Party symbol is required').max(60),
});

export const candidateSchema = z.object({
  name: z.string().min(1, 'Candidate name is required').max(100),
  partyId: z.coerce.number().int().positive('Party is required'),
  constituencyId: z.coerce.number().int().positive('Constituency is required'),
  electionId: z.coerce.number().int().positive('Election is required'),
});

export const boothSchema = z.object({
  constituencyId: z.coerce.number().int().positive('Constituency is required'),
  location: z.string().min(1, 'Location is required').max(200),
  capacity: z.coerce.number().int().positive('Capacity must be greater than 0'),
});

export const voteSchema = z.object({
  electionId: z.coerce.number().int().positive('Election ID is required'),
  candidateId: z.coerce.number().int().positive('Candidate ID is required'),
  boothId: z.coerce.number().int().positive('Booth ID is required'),
});

export const grievanceSchema = z.object({
  category: z.enum(['polling_booth', 'voter_list', 'candidate_conduct', 'technical', 'other']),
  text: z.string().min(10, 'Grievance text must be at least 10 characters').max(2000, 'Grievance text must be at most 2000 characters'),
});

export const grievanceStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']),
});

