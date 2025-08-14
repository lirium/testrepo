import type { Request, Response, NextFunction } from 'express';
export interface AuthedRequest extends Request {
    user?: {
        userId: string;
        email: string;
    };
}
export declare function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map