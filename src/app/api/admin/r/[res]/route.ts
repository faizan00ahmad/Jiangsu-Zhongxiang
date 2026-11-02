import { resourceCreate } from "@/lib/server/resourceApi";

export async function POST(req: Request, ctx: { params: Promise<{ res: string }> }) {
  return resourceCreate(req, (await ctx.params).res);
}
