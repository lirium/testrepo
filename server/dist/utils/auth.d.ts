import { z } from 'zod';
export declare function hashPassword(plain: string): Promise<string>;
export declare function verifyPassword(plain: string, hash: string): Promise<boolean>;
export declare const JwtPayloadSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
}, z.core.$strip>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export declare function signJwt(payload: JwtPayload): string;
export declare function verifyJwt(token: string): JwtPayload | null;
//# sourceMappingURL=auth.d.ts.map