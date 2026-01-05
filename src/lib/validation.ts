import { z } from "zod";

// Team Validation
export const teamSchema = z.object({
    name: z.string().min(2, "Team name must be at least 2 characters").max(50, "Team name too long"),
    captain_name: z.string().min(2, "Captain name must be at least 2 characters").max(50, "Captain name too long"),
    captain_phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format"),
    logo_url: z.string().url().nullable().optional(),
});

// Match Validation
export const matchSchema = z.object({
    match_name: z.string().min(2, "Match name must be at least 2 characters").max(100),
    match_number: z.string().regex(/^\d*$/, "Must be a number").nullable().optional(),
    team_a_id: z.string().uuid("Invalid Team A selection"),
    team_b_id: z.string().uuid("Invalid Team B selection"),
    match_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    match_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").nullable().optional(),
    venue: z.string().max(200, "Venue name too long").nullable().optional(),
    round_name: z.string().max(50, "Round name too long").nullable().optional(),
    group_name: z.string().max(50, "Group name too long").nullable().optional(),
}).refine((data) => data.team_a_id !== data.team_b_id, {
    message: "Teams must be different",
    path: ["team_b_id"],
});

// Tournament Validation
export const tournamentSchema = z.object({
    name: z.string().min(3, "Tournament name must be at least 3 characters").max(100),
    city: z.string().min(2, "City name must be at least 2 characters").max(50),
    ground: z.string().min(2, "Ground name must be at least 2 characters").max(100),
    organizer_name: z.string().min(2, "Organizer name must be at least 2 characters").max(50),
    organizer_phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format"),
    organizer_email: z.string().email("Invalid email").nullable().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    category: z.string().min(1, "Category is required"),
}).refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "End date must be after start date",
    path: ["end_date"],
});

// Profile Validation
export const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50),
    email: z.string().email("Invalid email").nullable().optional(),
    phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format").nullable().optional(),
    team_name: z.string().max(50, "Team name too long").nullable().optional(),
    bio: z.string().max(250, "Bio too long").nullable().optional(),
});

// Auth Validation
export const authSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

// Helper for strict validation
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
    return schema.parse(data);
};
