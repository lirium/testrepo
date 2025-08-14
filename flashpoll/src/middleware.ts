import { NextResponse, NextRequest } from "next/server";

export function middleware(req: NextRequest) {
	const res = NextResponse.next();
	const cookie = req.cookies.get("fp")?.value;
	if (!cookie) {
		const fp = crypto.randomUUID();
		res.cookies.set("fp", fp, { httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
	}
	return res;
}

export const config = {
	matcher: ["/((?!_next|static|.*\\.\w+$).*)"],
};