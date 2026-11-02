import { resourceBulk } from "@/lib/server/resourceApi";

export async function POST(req: Request, ctx: { params: Promise<{ res: string }> }) {
  return resourceBulk(req, (await ctx.params).res);
}
